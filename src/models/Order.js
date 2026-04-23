// backend/src/models/Order.js
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  dropiProductId: String, // ID en Dropi para enviar el pedido
  name:           { type: String, required: true },
  image:          { type: String, required: true },
  price:          { type: Number, required: true },
  quantity:       { type: Number, required: true, min: 1 },
  variant:        String, // ej: "Rojo - XL"
});

const orderSchema = new mongoose.Schema(
  {
    // ── Relación con usuario ─────────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Número de orden legible ──────────────────────────
    orderNumber: {
      type: String,
      unique: true,
    },

    // ── Productos comprados ──────────────────────────────
    items: [orderItemSchema],

    // ── Dirección de envío ───────────────────────────────
    shippingAddress: {
      fullName:  { type: String, required: true },
      phone:     { type: String, required: true },
      street:    { type: String, required: true },
      city:      { type: String, required: true },
      state:     { type: String, required: true },
      zipCode:   { type: String },
      country:   { type: String, required: true, default: 'Colombia' },
      notes:     String,
    },

    // ── Totales ──────────────────────────────────────────
    subtotal:      { type: Number, required: true },
    shippingCost:  { type: Number, default: 0 },
    discount:      { type: Number, default: 0 },
    total:         { type: Number, required: true },

    // ── Pago ─────────────────────────────────────────────
    paymentMethod: {
      type: String,
      enum: ['stripe', 'mercadopago', 'cash_on_delivery'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentResult: {
      id:           String, // ID de transacción en Stripe/MP
      status:       String,
      updateTime:   String,
      emailAddress: String,
    },
    paidAt: Date,

    // ── Estado del pedido ────────────────────────────────
    status: {
      type: String,
      enum: [
        'pending',    // Recién creado
        'processing', // Pago confirmado, enviando a Dropi
        'sent_to_dropi', // Enviado a Dropi exitosamente
        'shipped',    // Dropi lo envió al cliente
        'delivered',  // Entregado al cliente
        'cancelled',  // Cancelado
        'refunded',   // Reembolsado
      ],
      default: 'pending',
    },

    // ── Integración con Dropi ────────────────────────────
    dropiOrderId:     String, // ID del pedido en Dropi
    dropiStatus:      String, // Estado reportado por Dropi
    dropiSentAt:      Date,
    dropiTrackingCode: String,
    dropiError:       String, // Si falló el envío a Dropi

    // ── Historial de estados ─────────────────────────────
    statusHistory: [
      {
        status:    String,
        message:   String,
        timestamp: { type: Date, default: Date.now },
        updatedBy: String, // 'system', 'admin', 'dropi'
      },
    ],

    deliveredAt: Date,
    cancelledAt: Date,
    notes:       String,
  },
  {
    timestamps: true,
  }
);

// ─── HOOK: Generar número de orden ──────────────────────
// ✅ DESPUÉS
orderSchema.pre('save', async function () {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderNumber = `ORD-${timestamp}-${random}`;
  }
});

// ─── ÍNDICES ────────────────────────────────────────────
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ dropiOrderId: 1 });

module.exports = mongoose.model('Order', orderSchema);