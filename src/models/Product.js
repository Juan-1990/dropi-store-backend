// backend/src/models/Product.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name:    { type: String, required: true },
    rating:  { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    // ── Datos de Dropi (sincronizados desde su API) ──────
    dropiId: {
      type: String,
      unique: true,
      sparse: true, // Permite múltiples null (productos locales)
    },
    name: {
      type: String,
      required: [true, 'El nombre del producto es obligatorio'],
      trim: true,
      maxlength: [200, 'El nombre no puede superar 200 caracteres'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: [true, 'La descripción es obligatoria'],
    },
    shortDescription: {
      type: String,
      maxlength: [300, 'La descripción corta no puede superar 300 caracteres'],
    },

    // ── Precios ──────────────────────────────────────────
    price: {
      type: Number,
      required: [true, 'El precio es obligatorio'],
      min: [0, 'El precio no puede ser negativo'],
    },
    comparePrice: {
      type: Number, // Precio "tachado" (precio original antes de descuento)
      default: 0,
    },
    cost: {
      type: Number, // Costo de Dropi (privado, no se muestra al cliente)
      default: 0,
      select: false,
    },

    // ── Imágenes ─────────────────────────────────────────
    images: [
      {
        url:     { type: String, required: true },
        alt:     { type: String, default: '' },
        isPrimary: { type: Boolean, default: false },
      },
    ],

    // ── Categorización ───────────────────────────────────
    category: {
      type: String,
      required: [true, 'La categoría es obligatoria'],
      trim: true,
    },
    subcategory: { type: String, trim: true },
    tags:        [{ type: String, lowercase: true, trim: true }],
    brand:       { type: String, trim: true },

    // ── Inventario ───────────────────────────────────────
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'El stock no puede ser negativo'],
    },
    sku:    { type: String, trim: true },
    weight: { type: Number, default: 0 }, // en gramos

    // ── Variantes (tallas, colores, etc.) ────────────────
    variants: [
      {
        name:     String, // ej: "Color", "Talla"
        value:    String, // ej: "Rojo", "XL"
        stock:    { type: Number, default: 0 },
        price:    Number,
        sku:      String,
        dropiVariantId: String,
      },
    ],

    // ── Reseñas ──────────────────────────────────────────
    reviews:     [reviewSchema],
    numReviews:  { type: Number, default: 0 },
    rating:      { type: Number, default: 0, min: 0, max: 5 },

    // ── Estado y control ─────────────────────────────────
    isActive:   { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    source: {
      type: String,
      enum: ['dropi', 'manual'],
      default: 'dropi',
    },
    lastSyncedAt: Date, // Última vez que se sincronizó con Dropi
  },
  {
    timestamps: true,
  }
);

// ─── ÍNDICES para búsqueda rápida ───────────────────────
/* productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ dropiId: 1 });
productSchema.index({ slug: 1 });
 */

// ✅ DESPUÉS — solo los que no están declarados arriba
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, price: 1 });
// dropiId y slug ya tienen su índice por unique:true, no se repiten

// ─── HOOK: Generar slug automáticamente ─────────────────
/* productSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')   // quita caracteres especiales
      .replace(/\s+/g, '-')           // espacios → guiones
      .replace(/-+/g, '-')            // múltiples guiones → uno
      .trim();
  }
  next();
});
 */

// ✅ DESPUÉS
productSchema.pre('save', async function () {
  if (this.isModified('name') || !this.slug) {
    // Normaliza caracteres especiales (tildes, ñ, etc.)
    let baseSlug = this.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // elimina tildes
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    // Si el slug ya existe en otro documento, agrega el dropiId al final
    const existing = await mongoose.model('Product').findOne({
      slug: baseSlug,
      _id: { $ne: this._id },
    });

    this.slug = existing ? `${baseSlug}-${this.dropiId || Date.now()}` : baseSlug;
  }
});

// ─── MÉTODO: Calcular rating promedio ───────────────────
productSchema.methods.calculateRating = function () {
  if (this.reviews.length === 0) {
    this.rating = 0;
    this.numReviews = 0;
  } else {
    const total = this.reviews.reduce((acc, r) => acc + r.rating, 0);
    this.rating = Math.round((total / this.reviews.length) * 10) / 10;
    this.numReviews = this.reviews.length;
  }
};

module.exports = mongoose.model('Product', productSchema);