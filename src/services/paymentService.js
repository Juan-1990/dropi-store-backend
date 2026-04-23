// backend/src/services/paymentService.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Crear PaymentIntent — inicia el proceso de pago
const createPaymentIntent = async (amount, currency = 'cop', metadata = {}) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount:   Math.round(amount * 100), // Stripe usa centavos
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

// Verificar estado de un pago
const verifyPayment = async (paymentIntentId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      status: paymentIntent.status,
      paid:   paymentIntent.status === 'succeeded',
      amount: paymentIntent.amount / 100,
    };
  } catch (error) {
    throw new Error(`Error verificando pago: ${error.message}`);
  }
};

module.exports = { createPaymentIntent, verifyPayment };