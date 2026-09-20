// SaySee© Create Subscription API
// Vercel Serverless Function
// © 2026 SaySee LLC — Patent Pending U.S. App. No. 64/086,776
//
// CHANGE: on a confirmed payment this now writes the plan back to Supabase.
// Previously Stripe was charged but `accounts` never learned about it, so every
// payer stayed plan=null — which the app read as "monthly" before the trial gate,
// and would read as "trial" after it (gating paying customers).
//
// Required Vercel environment variables:
//   STRIPE_SECRET_KEY
//   SUPABASE_URL                 (https://peuuimpaylmprjrnnkqi.supabase.co)
//   SUPABASE_SERVICE_ROLE_KEY    (server-only — never in SaySee.jsx)

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Service-role client: bypasses RLS so the server can update any account row.
// Only ever instantiated here, server-side.
const admin =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

// Write the paid plan to `accounts`. Matched by id when we have a real one,
// otherwise by email. Never throws: a database hiccup must not fail a payment
// that Stripe already accepted — /api/sync-plan can repair it afterwards.
async function persistPlan({ userId, email, plan, customerId, subscriptionId }) {
  if (!admin) {
    console.error('persistPlan: Supabase service role not configured');
    return { ok: false, reason: 'not-configured' };
  }
  const patch = {
    plan: plan || 'monthly',
    stripe_customer_id: customerId || null,
    stripe_subscription_id: subscriptionId || null,
    trial_ends_at: null,              // paid — the trial no longer applies
  };
  try {
    // A signup-time "Pay Now" uses a placeholder id (temp_...), so only trust
    // a real UUID; otherwise fall back to the email, which is unique in auth.
    const realId = userId && !String(userId).startsWith('temp_') ? String(userId) : null;
    const q = admin.from('accounts').update(patch);
    const { data, error } = realId
      ? await q.eq('id', realId).select('id')
      : await q.eq('email', String(email).toLowerCase()).select('id');

    if (error) {
      console.error('persistPlan: update failed', error.message);
      return { ok: false, reason: 'error' };
    }
    if (!data || data.length === 0) {
      // No account row yet — normal for Pay Now before registration finishes.
      // The client calls /api/sync-plan right after the account is created.
      console.log('persistPlan: no matching account row yet for', email);
      return { ok: false, reason: 'no-row' };
    }
    console.log('persistPlan: wrote plan', patch.plan, 'to account', data[0].id);
    return { ok: true };
  } catch (e) {
    console.error('persistPlan: threw', e && e.message);
    return { ok: false, reason: 'threw' };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { paymentMethodId, priceId, email, userId, plan } = req.body || {};

  console.log('create-subscription called:', { priceId, email, plan, paymentMethodId: paymentMethodId?.slice(0, 20) });

  if (!paymentMethodId || !priceId || !email) {
    return res.status(400).json({
      error: `Missing required fields: ${!paymentMethodId ? 'paymentMethodId ' : ''} ${!priceId ? 'priceId ' : ''} ${!email ? 'email' : ''}`,
    });
  }

  try {
    // 1. Find or create Stripe customer
    console.log('Looking up customer for:', email);
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customer;

    if (customers.data.length > 0) {
      customer = customers.data[0];
      console.log('Found existing customer:', customer.id);
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
    } else {
      console.log('Creating new customer');
      customer = await stripe.customers.create({
        email,
        payment_method: paymentMethodId,
        metadata: { userId, plan },
      });
      console.log('Created customer:', customer.id);
    }

    // 2. Set default payment method
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // 3. Create subscription
    console.log('Creating subscription with priceId:', priceId);
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId, plan },
    });

    console.log('Subscription created:', subscription.id, 'status:', subscription.status);

    const invoice = subscription.latest_invoice;
    const paymentIntent = invoice?.payment_intent;

    if (subscription.status === 'active' || paymentIntent?.status === 'succeeded') {
      // NEW: persist before responding, so a reload can never show the gate.
      const saved = await persistPlan({
        userId, email, plan,
        customerId: customer.id,
        subscriptionId: subscription.id,
      });
      return res.status(200).json({
        success: true,
        subscriptionId: subscription.id,
        customerId: customer.id,
        planSaved: saved.ok,          // client calls /api/sync-plan when false
      });
    }

    if (paymentIntent?.status === 'requires_action') {
      // Don't write yet — the card still has to clear 3-D Secure. The client
      // confirms, then calls /api/sync-plan, which verifies against Stripe.
      return res.status(200).json({
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        subscriptionId: subscription.id,
        customerId: customer.id,
      });
    }

    const failMsg = paymentIntent?.last_payment_error?.message || 'Payment failed';
    console.error('Payment failed:', failMsg);
    return res.status(400).json({ error: failMsg });

  } catch (err) {
    console.error('Stripe error type:', err.type);
    console.error('Stripe error code:', err.code);
    console.error('Stripe error message:', err.message);
    return res.status(400).json({
      error: err.message || 'Payment failed. Please try again.',
      code: err.code,
      type: err.type,
    });
  }
}
