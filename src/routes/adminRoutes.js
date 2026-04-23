// backend/src/routes/adminRoutes.js
const express = require('express');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const User    = require('../models/User');
const Order   = require('../models/Order');
const Product = require('../models/Product');

const router = express.Router();

// Todas las rutas admin requieren autenticación + rol admin
router.use(protect, adminOnly);

// ─── Dashboard — estadísticas generales ─────────────────
router.get('/dashboard', async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalOrders,
      totalProducts,
      recentOrders,
      ordersByStatus,
      revenue,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Product.countDocuments({ isActive: true }),
      Order.find()
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('orderNumber total status createdAt user'),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalOrders,
        totalProducts,
        totalRevenue: revenue[0]?.total || 0,
      },
      recentOrders,
      ordersByStatus,
    });
  } catch (error) {
    next(error);
  }
});

// ─── Gestión de usuarios ─────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const [users, total] = await Promise.all([
      User.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      User.countDocuments(),
    ]);
    res.json({ success: true, total, users });
  } catch (error) {
    next(error);
  }
});

router.put('/users/:id', async (req, res, next) => {
  try {
    const { role, isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role, isActive },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

router.delete('/users/:id', async (req, res, next) => {
  try {
    // No borramos, solo desactivamos
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Usuario desactivado.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;