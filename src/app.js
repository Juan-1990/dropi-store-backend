// backend/src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// ─── MIDDLEWARE DE SEGURIDAD ────────────────────────────
app.use(helmet()); // Cabeceras de seguridad HTTP

/* app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // Permite enviar cookies/headers de auth
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
})); */

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://dropi-store-frontend.vercel.app',
    'https://dropi-store-frontend-git-main-juan-1990s-projects.vercel.app',
    'https://dropi-store-frontend-guq0dva52-juan-1990s-projects.vercel.app',
  ],
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── MIDDLEWARE DE PARSEO ───────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── LOGGER (solo en desarrollo) ───────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── RUTAS PRINCIPALES ──────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes')); // ← agrega esta

// ─── RUTA DE SALUD ─────────────────────────────────────
// Sirve para verificar que el servidor está vivo
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Dropi Store API funcionando',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ─── RUTAS PRINCIPALES ─────────────────────────────────
// Las iremos agregando en los próximos pasos:
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
// app.use('/api/admin', require('./routes/adminRoutes'));

// ─── MANEJO DE RUTAS NO ENCONTRADAS ────────────────────
app.use('{*path}', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.originalUrl} no encontrada`,
  });
});

// ─── MIDDLEWARE DE ERRORES GLOBALES ────────────────────
// Debe ir ÚLTIMO, después de todas las rutas
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;