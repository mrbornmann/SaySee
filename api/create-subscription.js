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

  // Log incoming request for debugging
  console.log('create-subscription called:', { priceId, email, plan, paymentMethodId: paymentMethodId?.slice(0,20) });

  if (!paymentMethodId || !priceId || !email) {
    return res.status(400).json({ 
      error: `Missing required fields: ${!paymentMethodId?'paymentMethodId ':''} ${!priceId?'priceId ':''} ${!email?'email':''}` 
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
      return res.status(200).json({
        success: true,
        subscriptionId: subscription.id,
        customerId: customer.id,
      });
    }

    if (paymentIntent?.status === 'requires_action') {
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
