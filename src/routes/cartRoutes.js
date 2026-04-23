// backend/src/routes/cartRoutes.js
const express = require('express');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Todas las rutas del carrito requieren autenticación
router.use(protect);

router.get('/',                    getCart);
router.post('/add',                addToCart);
router.put('/update',              updateCartItem);
router.delete('/remove/:productId', removeFromCart);
router.delete('/clear',            clearCart);

module.exports = router;