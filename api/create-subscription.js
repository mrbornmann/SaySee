// SaySee© Create Subscription API
// Vercel Serverless Function
// © 2026 SaySee LLC — Patent Pending U.S. App. No. 64/086,776

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { paymentMethodId, priceId, email, userId, plan } = req.body;

  if (!paymentMethodId || !priceId || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Find or create Stripe customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customer;

    if (customers.data.length > 0) {
      customer = customers.data[0];
      // Attach new payment method
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
    } else {
      // Create new customer with payment method
      customer = await stripe.customers.create({
        email,
        payment_method: paymentMethodId,
        metadata: { userId, plan },
      });
    }

    // 2. Set as default payment method
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // 3. Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId, plan },
    });

    const invoice = subscription.latest_invoice;
    const paymentIntent = invoice?.payment_intent;

    // 4. Handle payment status
    if (subscription.status === 'active') {
      // Payment succeeded immediately
      return res.status(200).json({
        success: true,
        subscriptionId: subscription.id,
        customerId: customer.id,
      });
    }

    if (paymentIntent?.status === 'requires_action') {
      // 3D Secure required
      return res.status(200).json({
        requiresAction: true,
        clientSecret: paymentIntent.client_secret,
        subscriptionId: subscription.id,
        customerId: customer.id,
      });
    }

    if (paymentIntent?.status === 'succeeded') {
      return res.status(200).json({
        success: true,
        subscriptionId: subscription.id,
        customerId: customer.id,
      });
    }

    // Payment failed
    return res.status(400).json({
      error: paymentIntent?.last_payment_error?.message || 'Payment failed. Please try again.',
    });

  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({
      error: err.message || 'Payment failed. Please try again.',
    });
  }
}
