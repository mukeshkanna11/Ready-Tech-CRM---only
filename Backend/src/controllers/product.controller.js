'use strict';

const mongoose = require('mongoose');
const Product = require('../models/Product');
// ======================================================
// HELPERS
// ======================================================

const escapeRegex = (value = '') => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const parseBoolean = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return undefined;
};

const getPagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(query.limit, 10) || 20, 1),
    100
  );

  const skip = (page - 1) * limit;

  return {
    page,
    limit,
    skip,
  };
};

const normalizeProductPayload = (body = {}) => {
  const payload = { ...body };

  if (payload.sku) {
    payload.sku = String(payload.sku).trim().toUpperCase();
  }

  if (payload.barcode) {
    payload.barcode = String(payload.barcode).trim();
  }

  if (payload.name) {
    payload.name = String(payload.name).trim();
  }

  if (payload.category) {
    payload.category = String(payload.category).trim();
  }

  if (payload.subcategory) {
    payload.subcategory = String(payload.subcategory).trim();
  }

  if (payload.brand) {
    payload.brand = String(payload.brand).trim();
  }

  if (payload.hsnSacCode) {
    payload.hsnSacCode = String(payload.hsnSacCode).trim();
  }

  return payload;
};

const handleMongoError = (error, res, next) => {
  // Duplicate key
  if (error?.code === 11000) {
    const duplicateField = Object.keys(error.keyPattern || {})[0];

    let message = 'Duplicate product data';

    if (duplicateField === 'sku') {
      message = 'A product with this SKU already exists.';
    }

    if (duplicateField === 'barcode') {
      message = 'A product with this barcode already exists.';
    }

    return res.status(409).json({
      success: false,
      message,
      field: duplicateField || null,
    });
  }

  return next(error);
};


// ======================================================
// CREATE PRODUCT
// POST /api/products
// ======================================================

const createProduct = async (req, res, next) => {
  try {
    const payload = normalizeProductPayload(req.body);

    if (!payload.name) {
      return res.status(400).json({
        success: false,
        message: 'Product name is required.',
      });
    }

    if (!payload.sku) {
      return res.status(400).json({
        success: false,
        message: 'SKU is required.',
      });
    }

    if (
      payload.sellingPrice === undefined ||
      payload.sellingPrice === null
    ) {
      return res.status(400).json({
        success: false,
        message: 'Selling price is required.',
      });
    }

    const existingSku = await Product.findOne({
      sku: payload.sku,
    }).lean();

    if (existingSku) {
      return res.status(409).json({
        success: false,
        message: 'A product with this SKU already exists.',
        field: 'sku',
      });
    }

    if (payload.barcode) {
      const existingBarcode = await Product.findOne({
        barcode: payload.barcode,
      }).lean();

      if (existingBarcode) {
        return res.status(409).json({
          success: false,
          message: 'A product with this barcode already exists.',
          field: 'barcode',
        });
      }
    }

    const product = await Product.create(payload);

    return res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: product,
    });
  } catch (error) {
    return handleMongoError(error, res, next);
  }
};


// ======================================================
// GET ALL PRODUCTS
// GET /api/v1/products
// ======================================================

const getProducts = async (req, res, next) => {
  try {
    const {
      search,
      category,
      subcategory,
      brand,
      productType,
      unit,
      barcodeType,
      taxType,
      inventoryTracking,
      vendor,
      warehouse,
      isActive,
      isArchived,
      lowStock,
      outOfStock,
      trackInventory,
      hasVariants,
      minPrice,
      maxPrice,
      minStock,
      maxStock,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // ==================================================
    // PAGINATION
    // ==================================================

    const { page, limit, skip } =
      getPagination(req.query);

    // ==================================================
    // BASE FILTER
    // ==================================================

    const filter = {};

    // ==================================================
    // SEARCH
    // ==================================================

    if (
      search &&
      typeof search === 'string' &&
      search.trim()
    ) {
      const searchValue = search.trim();

      const searchRegex = new RegExp(
        escapeRegex(searchValue),
        'i'
      );

      filter.$or = [
        {
          name: searchRegex,
        },
        {
          sku: searchRegex,
        },
        {
          barcode: searchRegex,
        },
        {
          description: searchRegex,
        },
        {
          shortDescription: searchRegex,
        },
        {
          brand: searchRegex,
        },
        {
          category: searchRegex,
        },
        {
          subcategory: searchRegex,
        },
        {
          hsnSacCode: searchRegex,
        },
      ];
    }

    // ==================================================
    // CATEGORY
    // ==================================================

    if (
      category &&
      typeof category === 'string'
    ) {
      filter.category = category.trim();
    }

    // ==================================================
    // SUBCATEGORY
    // ==================================================

    if (
      subcategory &&
      typeof subcategory === 'string'
    ) {
      filter.subcategory =
        subcategory.trim();
    }

    // ==================================================
    // BRAND
    // ==================================================

    if (
      brand &&
      typeof brand === 'string'
    ) {
      filter.brand = brand.trim();
    }

    // ==================================================
    // PRODUCT TYPE
    // ==================================================

    if (
      productType &&
      typeof productType === 'string'
    ) {
      filter.productType =
        productType.trim();
    }

    // ==================================================
    // UNIT
    // ==================================================

    if (
      unit &&
      typeof unit === 'string'
    ) {
      filter.unit = unit.trim();
    }

    // ==================================================
    // BARCODE TYPE
    // ==================================================

    if (
      barcodeType &&
      typeof barcodeType === 'string'
    ) {
      filter.barcodeType =
        barcodeType.trim();
    }

    // ==================================================
    // TAX TYPE
    // ==================================================

    if (
      taxType &&
      typeof taxType === 'string'
    ) {
      filter.taxType =
        taxType.trim();
    }

    // ==================================================
    // INVENTORY TRACKING
    // ==================================================

    if (
      inventoryTracking &&
      typeof inventoryTracking === 'string'
    ) {
      filter.inventoryTracking =
        inventoryTracking.trim();
    }

    // ==================================================
    // VENDOR
    // ==================================================

    if (
      vendor &&
      typeof vendor === 'string'
    ) {
      filter.vendor = vendor.trim();
    }

    // ==================================================
    // WAREHOUSE
    // ==================================================

    if (
      warehouse &&
      typeof warehouse === 'string'
    ) {
      filter.warehouse =
        warehouse.trim();
    }

    // ==================================================
    // ACTIVE STATUS
    // ==================================================

    const activeValue =
      parseBoolean(isActive);

    if (
      activeValue !== undefined
    ) {
      filter.isActive =
        activeValue;
    }

    // ==================================================
    // ARCHIVED STATUS
    // ==================================================

    const archivedValue =
      parseBoolean(isArchived);

    if (
      archivedValue !== undefined
    ) {
      filter.isArchived =
        archivedValue;
    }

    // ==================================================
    // TRACK INVENTORY
    // ==================================================

    const trackInventoryValue =
      parseBoolean(trackInventory);

    if (
      trackInventoryValue !== undefined
    ) {
      filter.trackInventory =
        trackInventoryValue;
    }

    // ==================================================
    // HAS VARIANTS
    // ==================================================

    const variantsValue =
      parseBoolean(hasVariants);

    if (
      variantsValue !== undefined
    ) {
      filter.hasVariants =
        variantsValue;
    }

    // ==================================================
    // PRICE RANGE
    // ==================================================

    if (
      minPrice !== undefined ||
      maxPrice !== undefined
    ) {
      filter.sellingPrice = {};

      if (
        minPrice !== undefined &&
        minPrice !== ''
      ) {
        const min =
          Number(minPrice);

        if (
          Number.isNaN(min) ||
          min < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              'minPrice must be a valid positive number.',
          });
        }

        filter.sellingPrice.$gte =
          min;
      }

      if (
        maxPrice !== undefined &&
        maxPrice !== ''
      ) {
        const max =
          Number(maxPrice);

        if (
          Number.isNaN(max) ||
          max < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              'maxPrice must be a valid positive number.',
          });
        }

        filter.sellingPrice.$lte =
          max;
      }
    }

    // ==================================================
    // STOCK RANGE
    // ==================================================

    if (
      minStock !== undefined ||
      maxStock !== undefined
    ) {
      filter.currentStock = {};

      if (
        minStock !== undefined &&
        minStock !== ''
      ) {
        const min =
          Number(minStock);

        if (
          Number.isNaN(min) ||
          min < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              'minStock must be a valid positive number.',
          });
        }

        filter.currentStock.$gte =
          min;
      }

      if (
        maxStock !== undefined &&
        maxStock !== ''
      ) {
        const max =
          Number(maxStock);

        if (
          Number.isNaN(max) ||
          max < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              'maxStock must be a valid positive number.',
          });
        }

        filter.currentStock.$lte =
          max;
      }
    }

    // ==================================================
    // OUT OF STOCK
    // ==================================================

    if (
      outOfStock === 'true'
    ) {
      filter.currentStock = {
        ...(filter.currentStock || {}),
        $lte: 0,
      };
    }

    // ==================================================
    // LOW STOCK
    // ==================================================

    if (
      lowStock === 'true'
    ) {
      filter.$expr = {
        $lte: [
          '$currentStock',
          '$reorderLevel',
        ],
      };
    }

    // ==================================================
    // SORT
    // ==================================================

    const allowedSortFields = [
      'name',
      'sku',
      'sellingPrice',
      'purchasePrice',
      'mrp',
      'currentStock',
      'reservedStock',
      'reorderLevel',
      'createdAt',
      'updatedAt',
    ];

    const safeSortBy =
      allowedSortFields.includes(
        sortBy
      )
        ? sortBy
        : 'createdAt';

    const safeSortOrder =
      String(sortOrder).toLowerCase() ===
      'asc'
        ? 1
        : -1;

    const sort = {
      [safeSortBy]:
        safeSortOrder,
    };

    // ==================================================
    // DATABASE QUERY
    // ==================================================

    const productsQuery = Product.find(
      filter
    )
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const countQuery =
      Product.countDocuments(filter);

    const [
      products,
      total,
    ] = await Promise.all([
      productsQuery,
      countQuery,
    ]);

    // ==================================================
    // PAGINATION DETAILS
    // ==================================================

    const totalPages =
      total === 0
        ? 0
        : Math.ceil(
            total / limit
          );

    // ==================================================
    // PRODUCT RESPONSE ENRICHMENT
    // ==================================================

    const formattedProducts =
      products.map((product) => {
        const currentStock =
          Number(
            product.currentStock || 0
          );

        const reservedStock =
          Number(
            product.reservedStock || 0
          );

        const reorderLevel =
          Number(
            product.reorderLevel || 0
          );

        const availableStock =
          Math.max(
            0,
            currentStock -
              reservedStock
          );

        let stockStatus =
          'in-stock';

        if (
          currentStock <= 0
        ) {
          stockStatus =
            'out-of-stock';
        } else if (
          currentStock <=
          reorderLevel
        ) {
          stockStatus =
            'low-stock';
        }

        return {
          ...product,

          // ------------------------------------------
          // STOCK SUMMARY
          // ------------------------------------------

          stockSummary: {
            currentStock,
            reservedStock,
            availableStock,
            reorderLevel,
            stockStatus,
          },

          // ------------------------------------------
          // PRODUCT STATUS
          // ------------------------------------------

          status:
            product.isArchived
              ? 'archived'
              : product.isActive
              ? 'active'
              : 'inactive',
        };
      });

    // ==================================================
    // RESPONSE
    // ==================================================

    return res.status(200).json({
      success: true,

      data: formattedProducts,

      pagination: {
        page,
        limit,
        total,
        totalPages,

        hasNextPage:
          page < totalPages,

        hasPreviousPage:
          page > 1,

        nextPage:
          page < totalPages
            ? page + 1
            : null,

        previousPage:
          page > 1
            ? page - 1
            : null,
      },

      filters: {
        search:
          search?.trim() || null,

        category:
          category || null,

        subcategory:
          subcategory || null,

        brand:
          brand || null,

        productType:
          productType || null,

        unit:
          unit || null,

        barcodeType:
          barcodeType || null,

        taxType:
          taxType || null,

        inventoryTracking:
          inventoryTracking || null,

        vendor:
          vendor || null,

        warehouse:
          warehouse || null,

        isActive:
          activeValue !== undefined
            ? activeValue
            : null,

        isArchived:
          archivedValue !== undefined
            ? archivedValue
            : null,

        lowStock:
          lowStock === 'true',

        outOfStock:
          outOfStock === 'true',

        trackInventory:
          trackInventoryValue !==
          undefined
            ? trackInventoryValue
            : null,

        hasVariants:
          variantsValue !==
          undefined
            ? variantsValue
            : null,

        minPrice:
          minPrice !== undefined
            ? Number(minPrice)
            : null,

        maxPrice:
          maxPrice !== undefined
            ? Number(maxPrice)
            : null,

        minStock:
          minStock !== undefined
            ? Number(minStock)
            : null,

        maxStock:
          maxStock !== undefined
            ? Number(maxStock)
            : null,
      },

      sorting: {
        sortBy: safeSortBy,
        sortOrder:
          safeSortOrder === 1
            ? 'asc'
            : 'desc',
      },
    });
  } catch (error) {
    console.error(
      'Get Products Error:',
      error
    );

    return next(error);
  }
};

// ======================================================
// GET PRODUCT BY ID
// GET /api/v1/products/:id
// ======================================================

const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // --------------------------------------------------
    // Validate Product ID
    // --------------------------------------------------

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID.',
      });
    }

    // --------------------------------------------------
    // Find Product
    // IMPORTANT:
    // Do NOT populate vendor / warehouse here
    // because those models are not registered currently.
    // --------------------------------------------------

    const product = await Product.findById(id).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    // --------------------------------------------------
    // STOCK CALCULATION
    // --------------------------------------------------

    const currentStock = Number(product.currentStock || 0);
    const reservedStock = Number(product.reservedStock || 0);
    const reorderLevel = Number(product.reorderLevel || 0);

    const availableStock = Math.max(
      currentStock - reservedStock,
      0
    );

    // --------------------------------------------------
    // STOCK STATUS
    // --------------------------------------------------

    let stockStatus = 'in_stock';

    if (currentStock <= 0) {
      stockStatus = 'out_of_stock';
    } else if (currentStock <= reorderLevel) {
      stockStatus = 'low_stock';
    }

    // --------------------------------------------------
    // PRODUCT STATUS
    // --------------------------------------------------

    let status = 'active';

    if (product.isArchived === true) {
      status = 'archived';
    } else if (product.isActive === false) {
      status = 'inactive';
    }

    // --------------------------------------------------
    // RESPONSE DATA
    // --------------------------------------------------

    const productData = {
      ...product,

      id: product._id,

      stockSummary: {
        currentStock,
        reservedStock,
        availableStock,
        reorderLevel,
        stockStatus,
      },

      status,
    };

    // --------------------------------------------------
    // SUCCESS RESPONSE
    // --------------------------------------------------

    return res.status(200).json({
      success: true,
      message: 'Product retrieved successfully.',
      data: productData,
    });

  } catch (error) {
    console.error('Get Product By ID Error:', error);

    return next(error);
  }
};

// ======================================================
// GET PRODUCT BY BARCODE
// GET /api/v1/products/barcode/:barcode
// ======================================================

const getProductByBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;

    // --------------------------------------------------
    // Validate Barcode
    // --------------------------------------------------

    if (!barcode || !barcode.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Barcode is required.',
      });
    }

    const normalizedBarcode = barcode.trim();

    // --------------------------------------------------
    // Find Product
    // IMPORTANT:
    // Do NOT populate vendor / warehouse
    // --------------------------------------------------

    const product = await Product.findOne({
      barcode: normalizedBarcode,
      isArchived: false,
    }).lean();

    // --------------------------------------------------
    // Product Not Found
    // --------------------------------------------------

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found for the provided barcode.',
      });
    }

    // --------------------------------------------------
    // Stock Calculation
    // --------------------------------------------------

    const currentStock = Number(product.currentStock || 0);
    const reservedStock = Number(product.reservedStock || 0);
    const reorderLevel = Number(product.reorderLevel || 0);

    const availableStock = Math.max(
      currentStock - reservedStock,
      0
    );

    let stockStatus = 'in_stock';

    if (currentStock <= 0) {
      stockStatus = 'out_of_stock';
    } else if (currentStock <= reorderLevel) {
      stockStatus = 'low_stock';
    }

    // --------------------------------------------------
    // Product Status
    // --------------------------------------------------

    let status = 'active';

    if (product.isArchived === true) {
      status = 'archived';
    } else if (product.isActive === false) {
      status = 'inactive';
    }

    // --------------------------------------------------
    // Response
    // --------------------------------------------------

    const productData = {
      ...product,

      id: product._id,

      stockSummary: {
        currentStock,
        reservedStock,
        availableStock,
        reorderLevel,
        stockStatus,
      },

      status,
    };

    return res.status(200).json({
      success: true,
      message: 'Product found successfully.',
      data: productData,
    });

  } catch (error) {
    console.error('Get Product By Barcode Error:', error);

    return next(error);
  }
};

// ======================================================
// GET PRODUCT BY SKU
// GET /api/v1/products/sku/:sku
// ======================================================

const getProductBySku = async (req, res, next) => {
  try {
    const { sku } = req.params;

    // --------------------------------------------------
    // Validate SKU
    // --------------------------------------------------

    if (!sku || !sku.trim()) {
      return res.status(400).json({
        success: false,
        message: 'SKU is required.',
      });
    }

    const normalizedSku = sku.trim().toUpperCase();

    // --------------------------------------------------
    // Find Product
    // IMPORTANT:
    // Do NOT populate vendor / warehouse
    // --------------------------------------------------

    const product = await Product.findOne({
      sku: normalizedSku,
      isArchived: false,
    }).lean();

    // --------------------------------------------------
    // Product Not Found
    // --------------------------------------------------

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found for the provided SKU.',
      });
    }

    // --------------------------------------------------
    // Stock Calculation
    // --------------------------------------------------

    const currentStock = Number(product.currentStock || 0);
    const reservedStock = Number(product.reservedStock || 0);
    const reorderLevel = Number(product.reorderLevel || 0);

    const availableStock = Math.max(
      currentStock - reservedStock,
      0
    );

    let stockStatus = 'in_stock';

    if (currentStock <= 0) {
      stockStatus = 'out_of_stock';
    } else if (currentStock <= reorderLevel) {
      stockStatus = 'low_stock';
    }

    // --------------------------------------------------
    // Product Status
    // --------------------------------------------------

    let status = 'active';

    if (product.isArchived === true) {
      status = 'archived';
    } else if (product.isActive === false) {
      status = 'inactive';
    }

    // --------------------------------------------------
    // Response
    // --------------------------------------------------

    const productData = {
      ...product,

      id: product._id,

      stockSummary: {
        currentStock,
        reservedStock,
        availableStock,
        reorderLevel,
        stockStatus,
      },

      status,
    };

    return res.status(200).json({
      success: true,
      message: 'Product found successfully.',
      data: productData,
    });

  } catch (error) {
    console.error('Get Product By SKU Error:', error);

    return next(error);
  }
};

// ======================================================
// UPDATE PRODUCT
// PUT /api/products/:id
// ======================================================

const updateProduct = async (req, res, next) => {
  try {
    const payload = normalizeProductPayload(req.body);

    const product = await Product.findById(
      req.params.id
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    // --------------------------------------------------
    // SKU DUPLICATE CHECK
    // --------------------------------------------------

    if (
      payload.sku &&
      payload.sku !== product.sku
    ) {
      const duplicateSku = await Product.findOne({
        sku: payload.sku,
        _id: {
          $ne: product._id,
        },
      }).lean();

      if (duplicateSku) {
        return res.status(409).json({
          success: false,
          message: 'A product with this SKU already exists.',
          field: 'sku',
        });
      }
    }

    // --------------------------------------------------
    // BARCODE DUPLICATE CHECK
    // --------------------------------------------------

    if (
      payload.barcode &&
      payload.barcode !== product.barcode
    ) {
      const duplicateBarcode =
        await Product.findOne({
          barcode: payload.barcode,
          _id: {
            $ne: product._id,
          },
        }).lean();

      if (duplicateBarcode) {
        return res.status(409).json({
          success: false,
          message:
            'A product with this barcode already exists.',
          field: 'barcode',
        });
      }
    }

    // --------------------------------------------------
    // UPDATE
    // --------------------------------------------------

    Object.keys(payload).forEach((key) => {
      if (payload[key] !== undefined) {
        product[key] = payload[key];
      }
    });

    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      data: product,
    });
  } catch (error) {
    return handleMongoError(error, res, next);
  }
};


// ======================================================
// DELETE PRODUCT
// DELETE /api/products/:id
// ======================================================

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(
      req.params.id
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    // Soft delete
    product.isArchived = true;
    product.isActive = false;

    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Product archived successfully.',
      data: product,
    });
  } catch (error) {
    return next(error);
  }
};


// ======================================================
// RESTORE PRODUCT
// PATCH /api/products/:id/restore
// ======================================================

const restoreProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(
      req.params.id
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    product.isArchived = false;
    product.isActive = true;

    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Product restored successfully.',
      data: product,
    });
  } catch (error) {
    return next(error);
  }
};


// ======================================================
// UPDATE PRODUCT STATUS
// PATCH /api/products/:id/status
// ======================================================

const updateProductStatus = async (
  req,
  res,
  next
) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean.',
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        isActive,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Product ${
        isActive ? 'activated' : 'deactivated'
      } successfully.`,
      data: product,
    });
  } catch (error) {
    return next(error);
  }
};


// ======================================================
// BULK UPDATE STATUS
// PATCH /api/products/bulk/status
// ======================================================

const bulkUpdateStatus = async (
  req,
  res,
  next
) => {
  try {
    const {
      productIds,
      isActive,
    } = req.body;

    if (
      !Array.isArray(productIds) ||
      productIds.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'productIds must be a non-empty array.',
      });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean.',
      });
    }

    const result =
      await Product.updateMany(
        {
          _id: {
            $in: productIds,
          },
        },
        {
          $set: {
            isActive,
          },
        }
      );

    return res.status(200).json({
      success: true,
      message: 'Product statuses updated successfully.',
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    return next(error);
  }
};


// ======================================================
// PRODUCT STATISTICS
// GET /api/products/stats
// ======================================================

const getProductStats = async (
  req,
  res,
  next
) => {
  try {
    const [
      totalProducts,
      activeProducts,
      inactiveProducts,
      archivedProducts,
      lowStockProducts,
      outOfStockProducts,
    ] = await Promise.all([
      Product.countDocuments({
        isArchived: false,
      }),

      Product.countDocuments({
        isActive: true,
        isArchived: false,
      }),

      Product.countDocuments({
        isActive: false,
        isArchived: false,
      }),

      Product.countDocuments({
        isArchived: true,
      }),

      Product.countDocuments({
        isArchived: false,
        trackInventory: true,
        $expr: {
          $lte: [
            '$currentStock',
            '$reorderLevel',
          ],
        },
      }),

      Product.countDocuments({
        isArchived: false,
        trackInventory: true,
        currentStock: {
          $lte: 0,
        },
      }),
    ]);

    const stockAggregation =
      await Product.aggregate([
        {
          $match: {
            isArchived: false,
            trackInventory: true,
          },
        },
        {
          $group: {
            _id: null,
            totalStock: {
              $sum: '$currentStock',
            },
            totalReservedStock: {
              $sum: '$reservedStock',
            },
            totalPurchaseValue: {
              $sum: {
                $multiply: [
                  '$currentStock',
                  '$purchasePrice',
                ],
              },
            },
            totalSellingValue: {
              $sum: {
                $multiply: [
                  '$currentStock',
                  '$sellingPrice',
                ],
              },
            },
          },
        },
      ]);

    const stockSummary =
      stockAggregation[0] || {
        totalStock: 0,
        totalReservedStock: 0,
        totalPurchaseValue: 0,
        totalSellingValue: 0,
      };

    return res.status(200).json({
      success: true,
      data: {
        totalProducts,
        activeProducts,
        inactiveProducts,
        archivedProducts,
        lowStockProducts,
        outOfStockProducts,

        stock: {
          totalStock: stockSummary.totalStock,
          totalReservedStock:
            stockSummary.totalReservedStock,
          availableStock:
            stockSummary.totalStock -
            stockSummary.totalReservedStock,

          totalPurchaseValue:
            stockSummary.totalPurchaseValue,

          totalSellingValue:
            stockSummary.totalSellingValue,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};


// ======================================================
// LOW STOCK PRODUCTS
// GET /api/products/low-stock
// ======================================================

const getLowStockProducts = async (
  req,
  res,
  next
) => {
  try {
    const { page, limit, skip } =
      getPagination(req.query);

    const filter = {
      isArchived: false,
      isActive: true,
      trackInventory: true,
      $expr: {
        $lte: [
          '$currentStock',
          '$reorderLevel',
        ],
      },
    };

    const [products, total] =
      await Promise.all([
        Product.find(filter)
          .sort({
            currentStock: 1,
          })
          .skip(skip)
          .limit(limit)
          .populate(
            'vendor',
            'name email phone'
          )
          .populate(
            'warehouse',
            'name code'
          )
          .lean(),

        Product.countDocuments(filter),
      ]);

    const totalPages =
      Math.ceil(total / limit);

    return res.status(200).json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    return next(error);
  }
};


// ======================================================
// DELETE PRODUCT PERMANENTLY
// DELETE /api/products/:id/permanent
// ======================================================

const permanentlyDeleteProduct = async (
  req,
  res,
  next
) => {
  try {
    const product = await Product.findByIdAndDelete(
      req.params.id
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Product permanently deleted.',
    });
  } catch (error) {
    return next(error);
  }
};


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  getProductByBarcode,
  getProductBySku,
  updateProduct,
  deleteProduct,
  restoreProduct,
  updateProductStatus,
  bulkUpdateStatus,
  getProductStats,
  getLowStockProducts,
  permanentlyDeleteProduct,
};