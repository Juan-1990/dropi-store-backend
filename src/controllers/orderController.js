// backend/src/controllers/orderController.js
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { createDropiOrder } = require('../services/dropiService');
const { createPaymentIntent, verifyPayment } = require('../services/paymentService');

// ────────────────────────────────────────────────────────
// @route   POST /api/orders/create-payment-intent
// @desc    Crear intención de pago con Stripe
// @access  Private
// ────────────────────────────────────────────────────────
const createOrderPaymentIntent = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El carrito está vacío.',
      });
    }

    const subtotal = cart.total;
    const shippingCost = subtotal > 200000 ? 0 : 12000; // Envío gratis > $200k
    const total = subtotal + shippingCost;

    const { clientSecret, paymentIntentId } = await createPaymentIntent(
      total,
      'cop',
      { userId: req.user._id.toString() }
    );

    res.json({
      success: true,
      clientSecret,
      paymentIntentId,
      summary: { subtotal, shippingCost, total },
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────
// @route   POST /api/orders
// @desc    Crear pedido después del pago
// @access  Private
// ────────────────────────────────────────────────────────
const createOrder = async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod, paymentIntentId } = req.body;

    // 1. Obtener carrito
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El carrito está vacío.',
      });
    }

    // 2. Verificar pago con Stripe (si aplica)
    let paymentResult = {};
    if (paymentMethod === 'stripe' && paymentIntentId) {
      const payment = await verifyPayment(paymentIntentId);
      if (!payment.paid) {
        return res.status(400).json({
          success: false,
          message: 'El pago no fue confirmado.',
        });
      }
      paymentResult = {
        id:         paymentIntentId,
        status:     'succeeded',
        updateTime: new Date().toISOString(),
      };
    }

    // 3. Calcular totales
    const subtotal    = cart.total;
    const shippingCost = subtotal > 200000 ? 0 : 12000;
    const total       = subtotal + shippingCost;

    // 4. Preparar items del pedido
    const orderItems = cart.items.map((item) => ({
      product:       item.product._id,
      dropiProductId: item.product.dropiId,
      name:          item.name,
      image:         item.image,
      price:         item.price,
      quantity:      item.quantity,
      variant:       item.variant,
    }));

    // 5. Crear el pedido en nuestra DB
    const order = await Order.create({
      user:            req.user._id,
      items:           orderItems,
      shippingAddress,
      subtotal,
      shippingCost,
      total,
      paymentMethod,
      paymentStatus:   paymentMethod === 'stripe' ? 'paid' : 'pending',
      paymentResult,
      paidAt:          paymentMethod === 'stripe' ? new Date() : null,
      status:          'processing',
      statusHistory: [{
        status:    'processing',
        message:   'Pedido creado y pago confirmado',
        updatedBy: 'system',
      }],
    });

    // 6. Enviar pedido a Dropi automáticamente
    try {
      const dropiResponse = await createDropiOrder({
        orderNumber:     order.orderNumber,
        items:           orderItems,
        shippingAddress,
        total,
      });

      // Actualizar pedido con datos de Dropi
      order.dropiOrderId  = dropiResponse.dropiOrderId;
      order.dropiStatus   = dropiResponse.status;
      order.dropiSentAt   = new Date();
      order.status        = 'sent_to_dropi';
      order.statusHistory.push({
        status:    'sent_to_dropi',
        message:   `Pedido enviado a Dropi. ID: ${dropiResponse.dropiOrderId}`,
        updatedBy: 'system',
      });

      await order.save();
    } catch (dropiError) {
      // Si Dropi falla, guardamos el error pero el pedido sigue en pie
      order.dropiError = dropiError.message;
      order.statusHistory.push({
        status:    'processing',
        message:   `Error al enviar a Dropi: ${dropiError.message}`,
        updatedBy: 'system',
      });
      await order.save();
    }

    // 7. Vaciar carrito
    cart.items = [];
    await cart.save();

    // 8. Actualizar stock de productos
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Pedido creado exitosamente',
      order,
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────
// @route   GET /api/orders/my-orders
// @desc    Historial de pedidos del usuario
// @access  Private
// ────────────────────────────────────────────────────────
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('-statusHistory');

    res.json({ success: true, total: orders.length, orders });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────
// @route   GET /api/orders/:id
// @desc    Detalle de un pedido
// @access  Private
// ────────────────────────────────────────────────────────
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado.',
      });
    }

    // Solo el dueño o un admin puede ver el pedido
    if (
      order.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para ver este pedido.',
      });
    }

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────
// @route   GET /api/orders/admin/all (Admin)
// @desc    Todos los pedidos
// @access  Admin
// ────────────────────────────────────────────────────────
const getAllOrders = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = status ? { status } : {};

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      Order.countDocuments(filter),
    ]);

    res.json({ success: true, total, orders });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────
// @route   PUT /api/orders/:id/status (Admin)
// @desc    Cambiar estado de un pedido
// @access  Admin
// ────────────────────────────────────────────────────────
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, message } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado.',
      });
    }

    order.status = status;
    order.statusHistory.push({
      status,
      message: message || `Estado actualizado a ${status}`,
      updatedBy: 'admin',
    });

    if (status === 'delivered') order.deliveredAt = new Date();
    if (status === 'cancelled') order.cancelledAt = new Date();

    await order.save();

    res.json({ success: true, message: 'Estado actualizado', order });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrderPaymentIntent,
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
};