// SaySee© Stripe Webhook Handler
// Vercel Serverless Function
// © 2026 SaySee LLC — Patent Pending U.S. App. No. 64/086,776

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // service role key - bypasses RLS
);

export const config = {
  api: {
    bodyParser: false, // Required for Stripe webhook signature verification
  },
};

// Read raw body for signature verification
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object;
      const customerEmail = session.customer_details?.email;
      const plan = session.metadata?.plan || 'monthly';

      if (customerEmail) {
        // Update user plan in Supabase accounts table
        const { error } = await supabase
          .from('accounts')
          .update({
            plan: plan,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            last_login: new Date().toISOString(),
          })
          .eq('email', customerEmail.toLowerCase());

        if (error) {
          console.error('Supabase update error:', error);
        } else {
          console.log(`Plan updated to ${plan} for ${customerEmail}`);
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      // Subscription cancelled — revert to trial
      const subscription = event.data.object;
      const customerId = subscription.customer;

      const { error } = await supabase
        .from('accounts')
        .update({ plan: 'trial', stripe_subscription_id: null })
        .eq('stripe_customer_id', customerId);

      if (error) console.error('Subscription cancel error:', error);
      else console.log(`Subscription cancelled for customer ${customerId}`);
      break;
    }

    case 'invoice.payment_failed': {
      // Payment failed — notify but keep access for grace period
      const invoice = event.data.object;
      console.log(`Payment failed for customer ${invoice.customer}`);
      // Could send email notification here in future
      break;
    }

    case 'customer.subscription.updated': {
      // Subscription updated (plan change, renewal, etc.)
      const subscription = event.data.object;
      const customerId = subscription.customer;
      const status = subscription.status;

      if (status === 'active') {
        const { error } = await supabase
          .from('accounts')
          .update({ plan: subscription.metadata?.plan || 'monthly' })
          .eq('stripe_customer_id', customerId);

        if (error) console.error('Subscription update error:', error);
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
}
