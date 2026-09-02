'use strict';

const express = require('express');

const router = express.Router();

const {
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
} = require('../controllers/product.controller');

const {
  authenticate,
} = require('../middleware/auth.middleware');


// ======================================================
// PRODUCT ROUTES
// ======================================================

// ------------------------------------------------------
// DASHBOARD / REPORTS
// IMPORTANT: Keep these BEFORE /:id routes
// ------------------------------------------------------

router.get(
  '/stats',
  authenticate,
  getProductStats
);

router.get(
  '/low-stock',
  authenticate,
  getLowStockProducts
);


// ------------------------------------------------------
// BARCODE / SKU LOOKUP
// IMPORTANT: Keep these BEFORE /:id
// ------------------------------------------------------

router.get(
  '/barcode/:barcode',
  authenticate,
  getProductByBarcode
);

router.get(
  '/sku/:sku',
  authenticate,
  getProductBySku
);


// ------------------------------------------------------
// BULK OPERATIONS
// ------------------------------------------------------

router.patch(
  '/bulk/status',
  authenticate,
  bulkUpdateStatus
);


// ------------------------------------------------------
// CREATE / LIST
// ------------------------------------------------------

router.post(
  '/',
  authenticate,
  createProduct
);

router.get(
  '/',
  authenticate,
  getProducts
);


// ------------------------------------------------------
// SINGLE PRODUCT
// ------------------------------------------------------

router.get(
  '/:id',
  authenticate,
  getProductById
);

router.put(
  '/:id',
  authenticate,
  updateProduct
);


// ------------------------------------------------------
// STATUS
// ------------------------------------------------------

router.patch(
  '/:id/status',
  authenticate,
  updateProductStatus
);


// ------------------------------------------------------
// RESTORE
// ------------------------------------------------------

router.patch(
  '/:id/restore',
  authenticate,
  restoreProduct
);


// ------------------------------------------------------
// SOFT DELETE / ARCHIVE
// ------------------------------------------------------

router.delete(
  '/:id',
  authenticate,
  deleteProduct
);


// ------------------------------------------------------
// PERMANENT DELETE
// ------------------------------------------------------

router.delete(
  '/:id/permanent',
  authenticate,
  permanentlyDeleteProduct
);


module.exports = router;