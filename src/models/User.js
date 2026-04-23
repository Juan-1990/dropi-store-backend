// backend/src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
      maxlength: [50, 'El nombre no puede superar 50 caracteres'],
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true, // Índice único en MongoDB
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Por favor ingresa un email válido',
      ],
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
      select: false, // NUNCA se devuelve en queries por defecto
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      street:   { type: String, trim: true },
      city:     { type: String, trim: true },
      state:    { type: String, trim: true },
      zipCode:  { type: String, trim: true },
      country:  { type: String, trim: true, default: 'Colombia' },
    },
    avatar: {
      type: String,
      default: 'https://ui-avatars.com/api/?background=6366f1&color=fff',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    resetPasswordToken:   String,
    resetPasswordExpires: Date,
  },
  {
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
  }
);

// ─── HOOK: Hash de contraseña ANTES de guardar ──────────
// Solo se ejecuta si la contraseña fue modificada
/* userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(12); // 12 rondas = seguro y rápido
  this.password = await bcrypt.hash(this.password, salt);
  next();
}); */

// ✅ DESPUÉS
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// ─── MÉTODO: Comparar contraseña en login ───────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ─── MÉTODO: Ocultar datos sensibles al serializar ──────
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpires;
  delete user.__v;
  return user;
};

module.exports = mongoose.model('User', userSchema);