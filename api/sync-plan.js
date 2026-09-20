// SaySee© Sync Plan API
// Vercel Serverless Function
// © 2026 SaySee LLC — Patent Pending U.S. App. No. 64/086,776
//
// Verifies against STRIPE whether this email has a live subscription, and writes
// the result to `accounts`. Nothing is trusted from the browser except the email:
// the plan itself is read from Stripe, so a user cannot grant themselves a plan
// by calling this endpoint.
//
// Called by the client:
//   - right after a Pay Now signup (the account row didn't exist during payment)
//   - after any successful in-app payment (covers 3-D Secure, which completes
//     after create-subscription has already responded)
// Also safe to call manually to repair any account that paid before this shipped.
//
// Required Vercel environment variables:
//   STRIPE_SECRET_KEY
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const admin =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

// Map a Stripe price id to the plan name the app uses.
function planFromSubscription(sub) {
  const priceId = sub?.items?.data?.[0]?.price?.id || '';
  if (priceId && priceId === process.env.STRIPE_MONTHLY_PRICE) return 'monthly';
  if (priceId && priceId === process.env.STRIPE_ANNUAL_PRICE) return 'annual';
  // Fall back to the interval Stripe reports, then to the metadata we set.
  const interval = sub?.items?.data?.[0]?.price?.recurring?.interval;
  if (interval === 'year') return 'annual';
  if (interval === 'month') return 'monthly';
  const meta = sub?.metadata?.plan;
  return meta === 'annual' || meta === 'monthly' || meta === 'school' ? meta : 'monthly';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!admin) {
    console.error('sync-plan: Supabase service role not configured');
    return res.status(500).json({ error: 'Not configured' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const email = String((body && body.email) || '').trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }

  try {
    // 1. Ask Stripe — never the browser — whether this email is paying.
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      console.log('sync-plan: no Stripe customer for', email);
      return res.status(200).json({ synced: false, reason: 'no-customer' });
    }
    const customer = customers.data[0];

    const subs = await stripe.subscriptions.list({ customer: customer.id, status: 'all', limit: 10 });
    const live = subs.data.find(s => s.status === 'active' || s.status === 'trialing');
    if (!live) {
      console.log('sync-plan: no active subscription for', email);
      return res.status(200).json({ synced: false, reason: 'no-active-subscription' });
    }

    const plan = planFromSubscription(live);

    // 2. Write it. Email is unique in auth, so this targets exactly one row.
    const { data, error } = await admin
      .from('accounts')
      .update({
        plan,
        stripe_customer_id: customer.id,
        stripe_subscription_id: live.id,
        trial_ends_at: null,
      })
      .eq('email', email)
      .select('id');

    if (error) {
      console.error('sync-plan: update failed', error.message);
      return res.status(500).json({ error: 'Could not update the account.' });
    }
    if (!data || data.length === 0) {
      console.log('sync-plan: no account row for', email);
      return res.status(200).json({ synced: false, reason: 'no-account-row' });
    }

    console.log('sync-plan: set', email, 'to', plan);
    return res.status(200).json({ synced: true, plan });
  } catch (err) {
    console.error('sync-plan: failed', err && err.message);
    return res.status(500).json({ error: 'Sync failed.' });
  }
}
