// backend/src/routes/authRoutes.js
const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// ─── Validaciones reutilizables ──────────────────────────
const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre es obligatorio')
    .isLength({ min: 2 }).withMessage('Mínimo 2 caracteres'),
  body('email')
    .trim()
    .notEmpty().withMessage('El email es obligatorio')
    .isEmail().withMessage('Email inválido')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria')
    .isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('El email es obligatorio')
    .isEmail().withMessage('Email inválido'),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria'),
];

// ─── Rutas públicas ──────────────────────────────────────
router.post('/register', registerValidation, register);
router.post('/login',    loginValidation,    login);

// ─── Rutas privadas (requieren JWT) ─────────────────────
router.get('/me',                 protect, getMe);
router.put('/update-profile',     protect, updateProfile);
router.put('/change-password',    protect, changePassword);

module.exports = router;