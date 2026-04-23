const createPaymentIntent = async (amount, currency = 'cop', metadata = {}) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'demo') {
      return {
        clientSecret: `demo_secret_${Date.now()}`,
        paymentIntentId: `demo_intent_${Date.now()}`,
      };
    }
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata,
      automatic_payment_methods: { enabled: true },
    });
    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    throw new Error(`Error creando pago: ${error.message}`);
  }
};

const verifyPayment = async (paymentIntentId) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'demo') {
      return { status: 'succeeded', paid: true, amount: 0 };
    }
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      status: paymentIntent.status,
      paid: paymentIntent.status === 'succeeded',
      amount: paymentIntent.amount / 100,
    };
  } catch (error) {
    throw new Error(`Error verificando pago: ${error.message}`);
  }
};

module.exports = { createPaymentIntent, verifyPayment };