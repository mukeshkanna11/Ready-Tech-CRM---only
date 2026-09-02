'use strict';

const express = require('express');

const router = express.Router();

const {
  createSalesOrder,
  getSalesOrders,
  getSalesOrderById,
  updateSalesOrder,
  deleteSalesOrder,
  getSalesOrderStats,
  updateSalesOrderStatus,
  confirmSalesOrder,
  processSalesOrder,
  completeSalesOrder,
  cancelSalesOrder,
  updateSalesOrderPayment,
} = require('../controllers/salesOrder.controller');

const {
  authenticate,
} = require('../middleware/auth.middleware');

// ======================================================
// SALES ORDER ROUTES
// ======================================================

// ------------------------------------------------------
// Dashboard / Statistics
// ------------------------------------------------------

router.get(
  '/stats',
  authenticate,
  getSalesOrderStats
);

// ------------------------------------------------------
// Create / List
// ------------------------------------------------------

router.post(
  '/',
  authenticate,
  createSalesOrder
);

router.get(
  '/',
  authenticate,
  getSalesOrders
);

// ------------------------------------------------------
// Status / Workflow
// IMPORTANT:
// These must be before /:id
// ------------------------------------------------------

router.patch(
  '/:id/status',
  authenticate,
  updateSalesOrderStatus
);

router.post(
  '/:id/confirm',
  authenticate,
  confirmSalesOrder
);

router.post(
  '/:id/process',
  authenticate,
  processSalesOrder
);

router.post(
  '/:id/complete',
  authenticate,
  completeSalesOrder
);

router.post(
  '/:id/cancel',
  authenticate,
  cancelSalesOrder
);

// ------------------------------------------------------
// Payment
// ------------------------------------------------------

router.patch(
  '/:id/payment',
  authenticate,
  updateSalesOrderPayment
);

// ------------------------------------------------------
// Single Sales Order
// ------------------------------------------------------

router.get(
  '/:id',
  authenticate,
  getSalesOrderById
);

router.put(
  '/:id',
  authenticate,
  updateSalesOrder
);

router.delete(
  '/:id',
  authenticate,
  deleteSalesOrder
);

module.exports = router;