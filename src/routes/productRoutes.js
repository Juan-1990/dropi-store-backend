// backend/src/routes/productRoutes.js
const express = require('express');
const {
  getProducts,
  getProductById,
  getProductBySlug,
  getCategories,
  syncDropiProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addReview,
} = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

// ─── Públicas ────────────────────────────────────────────
router.get('/',                  getProducts);
router.get('/categories',        getCategories);
router.get('/slug/:slug',        getProductBySlug);
router.get('/:id',               getProductById);

// ─── Privadas ────────────────────────────────────────────
router.post('/:id/reviews',      protect, addReview);

// ─── Solo admin ──────────────────────────────────────────
router.post('/sync-dropi',       protect, adminOnly, syncDropiProducts);
router.post('/',                 protect, adminOnly, createProduct);
router.put('/:id',               protect, adminOnly, updateProduct);
router.delete('/:id',            protect, adminOnly, deleteProduct);

module.exports = router;