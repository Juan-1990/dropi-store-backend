// backend/src/models/Cart.js
const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name:     { type: String, required: true },
  image:    { type: String, required: true },
  price:    { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1, default: 1 },
  variant:  String,
  stock:    Number, // Stock disponible al momento de agregar
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // Un carrito por usuario
    },
    items: [cartItemSchema],
    couponCode:    String,
    discountAmount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── VIRTUAL: Total del carrito ──────────────────────────
// No se guarda en DB, se calcula al vuelo
cartSchema.virtual('total').get(function () {
  return this.items.reduce(
    (acc, item) => acc + item.price * item.quantity, 0
  );
});

cartSchema.virtual('itemCount').get(function () {
  return this.items.reduce((acc, item) => acc + item.quantity, 0);
});

module.exports = mongoose.model('Cart', cartSchema);