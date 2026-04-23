// backend/src/services/emailService.js
const nodemailer = require('nodemailer');

// ─── Configurar transporter ──────────────────────────────
const createTransporter = () => {
  // En desarrollo usamos Ethereal (email falso para pruebas)
  if (process.env.NODE_ENV === 'development') {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // En producción usamos Gmail o el servicio configurado
  return nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   process.env.EMAIL_PORT,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// ─── Email de confirmación de pedido ────────────────────
const sendOrderConfirmation = async (order, userEmail, userName) => {
  try {
    const transporter = createTransporter();

    const itemsHtml = order.items.map((item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${item.name}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">
          $${item.price.toLocaleString('es-CO')}
        </td>
      </tr>
    `).join('');

    const mailOptions = {
      from:    `"DropiStore" <${process.env.EMAIL_USER}>`,
      to:      userEmail,
      subject: `✅ Pedido confirmado #${order.orderNumber}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#6366f1;padding:20px;text-align:center">
            <h1 style="color:white;margin:0">DropiStore</h1>
          </div>

          <div style="padding:30px">
            <h2>¡Hola ${userName}! Tu pedido fue confirmado 🎉</h2>
            <p>Tu número de pedido es: <strong>#${order.orderNumber}</strong></p>

            <table style="width:100%;border-collapse:collapse;margin:20px 0">
              <thead>
                <tr style="background:#f3f4f6">
                  <th style="padding:10px;text-align:left">Producto</th>
                  <th style="padding:10px;text-align:center">Cantidad</th>
                  <th style="padding:10px;text-align:right">Precio</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>

            <div style="text-align:right;margin-top:10px">
              <p>Subtotal: <strong>$${order.subtotal.toLocaleString('es-CO')}</strong></p>
              <p>Envío: <strong>$${order.shippingCost.toLocaleString('es-CO')}</strong></p>
              <h3>Total: $${order.total.toLocaleString('es-CO')}</h3>
            </div>

            <div style="background:#f3f4f6;padding:15px;border-radius:8px;margin-top:20px">
              <h4 style="margin:0 0 10px">Dirección de envío</h4>
              <p style="margin:0">${order.shippingAddress.fullName}</p>
              <p style="margin:0">${order.shippingAddress.street}</p>
              <p style="margin:0">${order.shippingAddress.city}, ${order.shippingAddress.state}</p>
            </div>

            <p style="margin-top:20px;color:#6b7280">
              Te notificaremos cuando tu pedido sea enviado.
            </p>
          </div>

          <div style="background:#f3f4f6;padding:15px;text-align:center;color:#6b7280">
            <p style="margin:0">© 2024 DropiStore — Todos los derechos reservados</p>
          </div>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email enviado a ${userEmail}:`, info.messageId);
    return info;
  } catch (error) {
    // No lanzamos error — si el email falla el pedido sigue en pie
    console.error('❌ Error enviando email:', error.message);
  }
};

// ─── Email de bienvenida ─────────────────────────────────
const sendWelcomeEmail = async (userEmail, userName) => {
  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from:    `"DropiStore" <${process.env.EMAIL_USER}>`,
      to:      userEmail,
      subject: '👋 Bienvenido a DropiStore',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#6366f1;padding:20px;text-align:center">
            <h1 style="color:white;margin:0">DropiStore</h1>
          </div>
          <div style="padding:30px">
            <h2>¡Hola ${userName}! 🎉</h2>
            <p>Tu cuenta fue creada exitosamente.</p>
            <p>Ya puedes explorar nuestro catálogo y hacer tu primera compra.</p>
            <a href="${process.env.FRONTEND_URL}/products"
              style="background:#6366f1;color:white;padding:12px 24px;
              border-radius:8px;text-decoration:none;display:inline-block;margin-top:10px">
              Ver productos
            </a>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error('❌ Error enviando email de bienvenida:', error.message);
  }
};

module.exports = { sendOrderConfirmation, sendWelcomeEmail };