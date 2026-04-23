// backend/src/controllers/authController.js
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');

// ─── Helper: genera JWT ──────────────────────────────────
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// ─── Helper: respuesta estándar con token ───────────────
const sendTokenResponse = (user, statusCode, res, message = 'OK') => {
  const token = generateToken(user._id);

  res.status(statusCode).json({
    success: true,
    message,
    token,
    user: {
      id:     user._id,
      name:   user.name,
      email:  user.email,
      role:   user.role,
      avatar: user.avatar,
      phone:  user.phone,
      address: user.address,
    },
  });
};

// ────────────────────────────────────────────────────────
// @route   POST /api/auth/register
// @desc    Registrar nuevo usuario
// @access  Public
// ────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    // 1. Validar datos de entrada
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
      });
    }

    const { name, email, password } = req.body;

    // 2. Verificar si el email ya existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Este email ya está registrado.',
      });
    }

    // 3. Crear usuario (el hook pre('save') hashea la contraseña)
    const user = await User.create({ name, email, password });

    // 4. Responder con token
    sendTokenResponse(user, 201, res, 'Usuario registrado exitosamente');
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────
// @route   POST /api/auth/login
// @desc    Iniciar sesión
// @access  Public
// ────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
      });
    }

    const { email, password } = req.body;

    // 1. Buscar usuario — incluimos password explícitamente (select:false)
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas.',
      });
    }

    // 2. Verificar contraseña
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales incorrectas.',
      });
    }

    // 3. Verificar que la cuenta esté activa
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Tu cuenta ha sido desactivada. Contacta soporte.',
      });
    }

    sendTokenResponse(user, 200, res, 'Sesión iniciada exitosamente');
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────
// @route   GET /api/auth/me
// @desc    Obtener usuario autenticado
// @access  Private
// ────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    // req.user viene del middleware protect
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────
// @route   PUT /api/auth/update-profile
// @desc    Actualizar perfil del usuario
// @access  Private
// ────────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, address } = req.body;

    // Solo actualizamos campos permitidos (nunca password ni role aquí)
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, address },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────
// @route   PUT /api/auth/change-password
// @desc    Cambiar contraseña
// @access  Private
// ────────────────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');

    // Verificar contraseña actual
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'La contraseña actual es incorrecta.',
      });
    }

    // Asignar nueva contraseña (el hook pre('save') la hashea)
    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res, 'Contraseña actualizada exitosamente');
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getMe, updateProfile, changePassword };