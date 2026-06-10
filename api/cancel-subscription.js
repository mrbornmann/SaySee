// SaySee© Cancel Subscription API
// Vercel Serverless Function — Admin only
// © 2026 SaySee LLC — Patent Pending U.S. App. No. 64/086,776

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { email, subscriptionId } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    // 1. Cancel in Stripe if subscription ID provided
    if (subscriptionId) {
      console.log('Cancelling Stripe subscription:', subscriptionId);
      await stripe.subscriptions.cancel(subscriptionId);
      console.log('Stripe subscription cancelled');
    } else {
      // Find subscription via customer email
      const customers = await stripe.customers.list({ email: email.toLowerCase(), limit: 1 });
      if (customers.data.length > 0) {
        const subs = await stripe.subscriptions.list({
          customer: customers.data[0].id,
          status: 'active',
          limit: 1,
        });
        if (subs.data.length > 0) {
          await stripe.subscriptions.cancel(subs.data[0].id);
          console.log('Stripe subscription cancelled via customer lookup');
        }
      }
    }

    // 2. Update plan in Supabase to trial
    const { error } = await supabase
      .from('accounts')
      .update({
        plan: 'trial',
        stripe_subscription_id: null,
      })
      .eq('email', email.toLowerCase());

    if (error) {
      console.error('Supabase update error:', error);
      return res.status(500).json({ error: 'Cancelled in Stripe but failed to update database' });
    }

    console.log('Subscription cancelled and plan reset for:', email);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Cancel subscription error:', err);
    return res.status(500).json({ error: err.message || 'Failed to cancel subscription' });
  }
}
