// backend/src/controllers/cartController.js
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// ────────────────────────────────────────────────────────
// @route   GET /api/cart
// @desc    Obtener carrito del usuario
// @access  Private
// ────────────────────────────────────────────────────────
const getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    res.json({ success: true, cart });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────
// @route   POST /api/cart/add
// @desc    Agregar producto al carrito
// @access  Private
// ────────────────────────────────────────────────────────
const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1, variant } = req.body;

    // Verificar que el producto existe y tiene stock
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado.',
      });
    }

    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Solo hay ${product.stock} unidades disponibles.`,
      });
    }

    // Buscar o crear carrito
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    // Verificar si el producto ya está en el carrito
    const itemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.variant === variant
    );

    if (itemIndex > -1) {
      // Ya existe — actualizar cantidad
      const newQuantity = cart.items[itemIndex].quantity + quantity;

      if (newQuantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: `No puedes agregar más. Stock disponible: ${product.stock}`,
        });
      }

      cart.items[itemIndex].quantity = newQuantity;
    } else {
      // No existe — agregar nuevo item
      cart.items.push({
        product:  productId,
        name:     product.name,
        image:    product.images[0]?.url || '',
        price:    product.price,
        quantity,
        variant:  variant || '',
        stock:    product.stock,
      });
    }

    await cart.save();
    res.json({ success: true, message: 'Producto agregado al carrito', cart });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────
// @route   PUT /api/cart/update
// @desc    Actualizar cantidad de un item
// @access  Private
// ────────────────────────────────────────────────────────
const updateCartItem = async (req, res, next) => {
  try {
    const { productId, quantity, variant } = req.body;

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad debe ser mayor a 0.',
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado.',
      });
    }

    if (quantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Stock insuficiente. Solo hay ${product.stock} unidades.`,
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Carrito no encontrado.',
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.variant === (variant || '')
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado en el carrito.',
      });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    res.json({ success: true, message: 'Carrito actualizado', cart });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────
// @route   DELETE /api/cart/remove/:productId
// @desc    Eliminar producto del carrito
// @access  Private
// ────────────────────────────────────────────────────────
const removeFromCart = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { variant } = req.query;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Carrito no encontrado.',
      });
    }

    cart.items = cart.items.filter(
      (item) =>
        !(item.product.toString() === productId &&
          item.variant === (variant || ''))
    );

    await cart.save();
    res.json({ success: true, message: 'Producto eliminado del carrito', cart });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────
// @route   DELETE /api/cart/clear
// @desc    Vaciar carrito completo
// @access  Private
// ────────────────────────────────────────────────────────
const clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    res.json({ success: true, message: 'Carrito vaciado', cart });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, clearCart };