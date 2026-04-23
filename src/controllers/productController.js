// backend/src/controllers/productController.js
const Product = require('../models/Product');
const { getDropiProducts, getDropiProductById } = require('../services/dropiService');

// ────────────────────────────────────────────────────────
// @route   GET /api/products
// @desc    Listar productos con filtros y paginación
// @access  Public
// ────────────────────────────────────────────────────────
const getProducts = async (req, res, next) => {
  try {
    const {
      keyword,    // búsqueda por texto
      category,   // filtro categoría
      minPrice,   // precio mínimo
      maxPrice,   // precio máximo
      sort,       // ordenamiento
      page = 1,
      limit = 12,
      featured,   // solo destacados
    } = req.query;

    // ── Construir filtro dinámico ────────────────────────
    const filter = { isActive: true };

    if (keyword) {
      filter.$text = { $search: keyword }; // usa el índice de texto
    }

    if (category) {
      filter.category = { $regex: category, $options: 'i' };
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (featured === 'true') {
      filter.isFeatured = true;
    }

    // ── Ordenamiento ─────────────────────────────────────
    let sortOption = { createdAt: -1 }; // por defecto: más nuevos
    if (sort === 'price_asc')   sortOption = { price: 1 };
    if (sort === 'price_desc')  sortOption = { price: -1 };
    if (sort === 'rating')      sortOption = { rating: -1 };
    if (sort === 'popular')     sortOption = { numReviews: -1 };

    // ── Paginación ───────────────────────────────────────
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, parseInt(limit)); // máximo 50
    const skip     = (pageNum - 1) * limitNum;

    // ── Ejecutar query ───────────────────────────────────
    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .select('-cost -__v'), // ocultamos costo al cliente
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      total,
      page:       pageNum,
      pages:      Math.ceil(total / limitNum),
      limit:      limitNum,
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      products,
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────
// @route   GET /api/products/:id
// @desc    Detalle de un producto
// @access  Public
// ────────────────────────────────────────────────────────
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).select('-cost');

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado.',
      });
    }

    // Productos relacionados (misma categoría)
    const related = await Product.find({
      category:  product.category,
      _id:       { $ne: product._id },
      isActive:  true,
    })
      .limit(4)
      .select('name price images rating numReviews slug');

    res.json({ success: true, product, related });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────
// @route   GET /api/products/slug/:slug
// @desc    Detalle de producto por slug (SEO friendly)
// @access  Public
// ────────────────────────────────────────────────────────
const getProductBySlug = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      slug:     req.params.slug,
      isActive: true,
    }).select('-cost');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado.',
      });
    }

    const related = await Product.find({
      category: product.category,
      _id:      { $ne: product._id },
      isActive: true,
    })
      .limit(4)
      .select('name price images rating numReviews slug');

    res.json({ success: true, product, related });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────
// @route   GET /api/products/categories
// @desc    Obtener categorías únicas con conteo
// @access  Public
// ────────────────────────────────────────────────────────
const getCategories = async (req, res, next) => {
  try {
    const categories = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id:   '$category',
          count: { $sum: 1 },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({ success: true, categories });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────
// @route   POST /api/products/sync-dropi
// @desc    Sincronizar productos desde Dropi
// @access  Admin
// ────────────────────────────────────────────────────────
/* const syncDropiProducts = async (req, res, next) => {
  try {
    const dropiProducts = await getDropiProducts();
    let created = 0, updated = 0, errors = 0;

    for (const dp of dropiProducts) {
      try {
        const productData = {
          dropiId:          dp.id,
          name:             dp.name,
          description:      dp.description,
          shortDescription: dp.shortDescription,
          price:            dp.price,
          comparePrice:     dp.comparePrice || 0,
          cost:             dp.cost || 0,
          images:           dp.images || [],
          category:         dp.category,
          subcategory:      dp.subcategory,
          tags:             dp.tags || [],
          brand:            dp.brand,
          stock:            dp.stock || 0,
          weight:           dp.weight || 0,
          variants:         dp.variants || [],
          source:           'dropi',
          lastSyncedAt:     new Date(),
          isActive:         true,
        };

        // upsert: actualiza si existe, crea si no
        const result = await Product.findOneAndUpdate(
          { dropiId: dp.id },
          productData,
          { upsert: true, new: true, runValidators: true }
        );

        result.isNew ? created++ : updated++;
/*       } catch (err) {
        console.error(`Error sincronizando producto ${dp.id}:`, err.message);
        errors++;
      } */
     // ✅ DESPUÉS
    /*     } catch (err) {
        console.error(`❌ Error sincronizando producto ${dp.id}:`);
        console.error('Mensaje:', err.message);
        console.error('Detalle:', JSON.stringify(err.errors, null, 2));
        errors++;
        }
    }

    res.json({
      success: true,
      message: `Sincronización completada`,
      summary: { created, updated, errors, total: dropiProducts.length },
    });
  } catch (error) {
    next(error);
  }
}; */

const syncDropiProducts = async (req, res, next) => {
  try {
    const dropiProducts = await getDropiProducts();
    let created = 0, updated = 0, errors = 0;

    for (const dp of dropiProducts) {
      try {
        console.log(`Sincronizando: ${dp.id} - ${dp.name}`);

        // Generar slug aquí directamente (no depender del hook)
        const baseSlug = dp.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/ñ/g, 'n')
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();

        // Asegura slug único agregando dropiId si ya existe
        const slugExists = await Product.findOne({
          slug: baseSlug,
          dropiId: { $ne: dp.id },
        });
        const slug = slugExists ? `${baseSlug}-${dp.id}` : baseSlug;

        const productData = {
          dropiId:          dp.id,
          name:             dp.name,
          slug,                          // ← slug generado aquí
          description:      dp.description,
          shortDescription: dp.shortDescription,
          price:            dp.price,
          comparePrice:     dp.comparePrice || 0,
          cost:             dp.cost || 0,
          images:           dp.images || [],
          category:         dp.category,
          subcategory:      dp.subcategory,
          tags:             dp.tags || [],
          brand:            dp.brand,
          stock:            dp.stock || 0,
          weight:           dp.weight || 0,
          variants:         dp.variants || [],
          source:           'dropi',
          lastSyncedAt:     new Date(),
          isActive:         true,
        };

        const existing = await Product.findOne({ dropiId: dp.id });

        if (existing) {
          await Product.findOneAndUpdate(
            { dropiId: dp.id },
            productData,
            { returnDocument: 'after', runValidators: false }
          );
          console.log(`✅ Actualizado: ${dp.name}`);
          updated++;
        } else {
          await Product.create(productData);
          console.log(`✅ Creado: ${dp.name}`);
          created++;
        }
      } catch (err) {
        console.log(`❌ FALLÓ: ${dp.id} - ${err.message}`);
        errors++;
      }
    }

    res.json({
      success: true,
      message: 'Sincronización completada',
      summary: { created, updated, errors, total: dropiProducts.length },
    });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────
// @route   POST /api/products (Admin)
// @desc    Crear producto manual
// @access  Admin
// ────────────────────────────────────────────────────────
const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create({ ...req.body, source: 'manual' });
    res.status(201).json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────
// @route   PUT /api/products/:id (Admin)
// @desc    Actualizar producto
// @access  Admin
// ────────────────────────────────────────────────────────
const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    }

    res.json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────
// @route   DELETE /api/products/:id (Admin)
// @desc    Desactivar producto (soft delete)
// @access  Admin
// ────────────────────────────────────────────────────────
const deleteProduct = async (req, res, next) => {
  try {
    // Soft delete: nunca borramos, solo desactivamos
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    }

    res.json({ success: true, message: 'Producto desactivado exitosamente.' });
  } catch (error) {
    next(error);
  }
};

// ────────────────────────────────────────────────────────
// @route   POST /api/products/:id/reviews
// @desc    Agregar reseña a un producto
// @access  Private
// ────────────────────────────────────────────────────────
const addReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    }

    // Verificar que no haya reseñado antes
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({
        success: false,
        message: 'Ya has reseñado este producto.',
      });
    }

    product.reviews.push({
      user:    req.user._id,
      name:    req.user.name,
      rating:  Number(rating),
      comment,
    });

    product.calculateRating();
    await product.save();

    res.status(201).json({ success: true, message: 'Reseña agregada exitosamente.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  getProductBySlug,
  getCategories,
  syncDropiProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addReview,
};