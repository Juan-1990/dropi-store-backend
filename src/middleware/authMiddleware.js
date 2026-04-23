// backend/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── Protege rutas: verifica que el JWT sea válido ──────
const protect = async (req, res, next) => {
  try {
    // DEBUG TEMPORAL
    console.log('=== HEADERS RECIBIDOS ===');
    console.log(req.headers);
    console.log('========================');

    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    console.log('TOKEN EXTRAÍDO:', token); // DEBUG

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Por favor inicia sesión.',
      });
    }
    // ... resto del código igual
    // Verifica y decodifica el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Busca el usuario (verifica que aún exista y esté activo)
    const user = await User.findById(decoded.id).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado o desactivado.',
      });
    }

    req.user = user; // disponible en todos los controllers
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Token inválido.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expirado. Inicia sesión nuevamente.' });
    }
    next(error);
  }
};

// ─── Solo permite acceso a admins ───────────────────────
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Acceso denegado. Se requiere rol de administrador.',
  });
};

module.exports = { protect, adminOnly };