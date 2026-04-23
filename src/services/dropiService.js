// backend/src/services/dropiService.js
const axios = require('axios');

// ─── Cliente HTTP configurado para Dropi ────────────────
const dropiClient = axios.create({
  baseURL: process.env.DROPI_API_URL || 'https://api.dropi.co/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.DROPI_API_KEY}`,
  },
});

// ─── Interceptor: loguea errores de Dropi ───────────────
dropiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('❌ Error Dropi API:', {
      status:  error.response?.status,
      message: error.response?.data?.message || error.message,
      url:     error.config?.url,
    });
    return Promise.reject(error);
  }
);

// ────────────────────────────────────────────────────────
// PRODUCTOS SIMULADOS (se usan si DROPI_API_KEY=demo)
// ────────────────────────────────────────────────────────
const MOCK_PRODUCTS = [
  {
    id: 'dropi-001',
    name: 'Audífonos Bluetooth Pro X200',
    description: 'Audífonos inalámbricos con cancelación de ruido activa, 30 horas de batería y sonido de alta fidelidad. Perfectos para trabajo y entretenimiento.',
    shortDescription: 'Cancelación de ruido activa, 30h batería',
    price: 89900,
    comparePrice: 129900,
    cost: 45000,
    category: 'Electrónica',
    subcategory: 'Audio',
    images: [
      { url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500', alt: 'Audífonos Pro X200', isPrimary: true },
      { url: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500', alt: 'Audífonos lateral' },
    ],
    stock: 50,
    tags: ['audifonos', 'bluetooth', 'inalambrico', 'electronica'],
    brand: 'SoundMax',
    weight: 280,
    variants: [
      { name: 'Color', value: 'Negro', stock: 30, dropiVariantId: 'v001-negro' },
      { name: 'Color', value: 'Blanco', stock: 20, dropiVariantId: 'v001-blanco' },
    ],
  },
  {
    id: 'dropi-002',
    name: 'Smartwatch Fitness Pro',
    description: 'Reloj inteligente con monitor cardíaco, GPS integrado, resistente al agua IP68. Compatible con Android e iOS. Monitorea tu salud 24/7.',
    shortDescription: 'GPS, frecuencia cardíaca, IP68',
    price: 149900,
    comparePrice: 199900,
    cost: 75000,
    category: 'Electrónica',
    subcategory: 'Wearables',
    images: [
      { url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500', alt: 'Smartwatch', isPrimary: true },
    ],
    stock: 35,
    tags: ['smartwatch', 'reloj', 'fitness', 'gps'],
    brand: 'FitTech',
    weight: 45,
    variants: [
      { name: 'Color', value: 'Negro', stock: 20, dropiVariantId: 'v002-negro' },
      { name: 'Color', value: 'Plateado', stock: 15, dropiVariantId: 'v002-plata' },
    ],
  },
  {
    id: 'dropi-003',
    name: 'Mochila Urbana Impermeable 30L',
    description: 'Mochila resistente al agua con compartimento para laptop de 15.6", puerto USB de carga externa, múltiples bolsillos organizadores.',
    shortDescription: 'Impermeable, puerto USB, 30 litros',
    price: 75900,
    comparePrice: 99900,
    cost: 38000,
    category: 'Accesorios',
    subcategory: 'Bolsos',
    images: [
      { url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500', alt: 'Mochila urbana', isPrimary: true },
    ],
    stock: 80,
    tags: ['mochila', 'impermeable', 'laptop', 'urbana'],
    brand: 'UrbanPack',
    weight: 650,
    variants: [
      { name: 'Color', value: 'Negro', stock: 40, dropiVariantId: 'v003-negro' },
      { name: 'Color', value: 'Gris', stock: 25, dropiVariantId: 'v003-gris' },
      { name: 'Color', value: 'Azul', stock: 15, dropiVariantId: 'v003-azul' },
    ],
  },
  {
    id: 'dropi-004',
    name: 'Lámpara LED Escritorio con Cargador Inalámbrico',
    description: 'Lámpara de escritorio LED con 3 modos de iluminación, intensidad ajustable y base con cargador inalámbrico Qi integrado.',
    shortDescription: '3 modos luz, cargador inalámbrico Qi',
    price: 55900,
    comparePrice: 79900,
    cost: 28000,
    category: 'Hogar',
    subcategory: 'Iluminación',
    images: [
      { url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500', alt: 'Lámpara LED', isPrimary: true },
    ],
    stock: 60,
    tags: ['lampara', 'led', 'escritorio', 'cargador'],
    brand: 'LightHome',
    weight: 420,
    variants: [],
  },
  {
    id: 'dropi-005',
    name: 'Set Skincare Vitamina C Completo',
    description: 'Kit completo de cuidado facial con sérum de vitamina C, hidratante SPF50, contorno de ojos y limpiador facial. Para todo tipo de piel.',
    shortDescription: 'Sérum, hidratante SPF50 y más',
    price: 119900,
    comparePrice: 159900,
    cost: 55000,
    category: 'Belleza',
    subcategory: 'Skincare',
    images: [
      { url: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500', alt: 'Set skincare', isPrimary: true },
    ],
    stock: 45,
    tags: ['skincare', 'vitamina c', 'cuidado facial', 'belleza'],
    brand: 'GlowCare',
    weight: 350,
    variants: [],
  },
  {
    id: 'dropi-006',
    name: 'Silla Ergonómica Home Office',
    description: 'Silla de oficina ergonómica con soporte lumbar ajustable, reposabrazos 3D, altura regulable y base de aluminio. Ideal para trabajo remoto.',
    shortDescription: 'Lumbar ajustable, reposabrazos 3D',
    price: 459900,
    comparePrice: 599900,
    cost: 220000,
    category: 'Hogar',
    subcategory: 'Muebles',
    images: [
      { url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500', alt: 'Silla ergonómica', isPrimary: true },
    ],
    stock: 20,
    tags: ['silla', 'ergonomica', 'oficina', 'home office'],
    brand: 'ErgoWork',
    weight: 15000,
    variants: [
      { name: 'Color', value: 'Negro', stock: 12, dropiVariantId: 'v006-negro' },
      { name: 'Color', value: 'Gris', stock: 8, dropiVariantId: 'v006-gris' },
    ],
  },
];

// ────────────────────────────────────────────────────────
// MÉTODOS DEL SERVICIO
// ────────────────────────────────────────────────────────

// Obtener todos los productos de Dropi
const getDropiProducts = async () => {
  // Si es modo demo, retorna productos simulados
  if (!process.env.DROPI_API_KEY || process.env.DROPI_API_KEY === 'demo') {
    console.log('📦 Usando productos simulados de Dropi (modo demo)');
    return MOCK_PRODUCTS;
  }

  try {
    const { data } = await dropiClient.get('/products');
    return data.products || data;
  } catch (error) {
    console.error('Error obteniendo productos de Dropi, usando mock:', error.message);
    return MOCK_PRODUCTS; // Fallback a mock si falla la API real
  }
};

// Obtener un producto por ID de Dropi
const getDropiProductById = async (dropiId) => {
  if (!process.env.DROPI_API_KEY || process.env.DROPI_API_KEY === 'demo') {
    return MOCK_PRODUCTS.find(p => p.id === dropiId) || null;
  }

  try {
    const { data } = await dropiClient.get(`/products/${dropiId}`);
    return data;
  } catch (error) {
    return MOCK_PRODUCTS.find(p => p.id === dropiId) || null;
  }
};

// Enviar pedido a Dropi
const createDropiOrder = async (orderData) => {
  if (!process.env.DROPI_API_KEY || process.env.DROPI_API_KEY === 'demo') {
    // Simular respuesta de Dropi
    console.log('📦 Simulando envío de pedido a Dropi:', orderData.orderNumber);
    return {
      success: true,
      dropiOrderId: `DROPI-${Date.now()}`,
      status: 'processing',
      estimatedDelivery: '3-5 días hábiles',
    };
  }

  try {
    const { data } = await dropiClient.post('/orders', orderData);
    return data;
  } catch (error) {
    throw new Error(`Error al crear pedido en Dropi: ${error.message}`);
  }
};

module.exports = { getDropiProducts, getDropiProductById, createDropiOrder };