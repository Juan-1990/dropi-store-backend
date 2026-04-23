// backend/src/routes/orderRoutes.js
const express = require('express');
const {
  createOrderPaymentIntent,
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
} = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// ─── Privadas ────────────────────────────────────────────
router.post('/create-payment-intent', protect, createOrderPaymentIntent);
router.post('/',                      protect, createOrder);
router.get('/my-orders',              protect, getMyOrders);
router.get('/:id',                    protect, getOrderById);

// ─── Solo admin ──────────────────────────────────────────
router.get('/admin/all',              protect, adminOnly, getAllOrders);
router.put('/:id/status',             protect, adminOnly, updateOrderStatus);

module.exports = router;