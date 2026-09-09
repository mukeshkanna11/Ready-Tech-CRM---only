const express = require('express');

const {
  authenticate,
} = require('../middleware/auth.middleware');

const validate = require('../middleware/validate.middleware');

const {
  invoiceSchema,
  invoiceUpdateSchema,
  invoiceStatusSchema,
  invoicePaymentSchema,
  invoiceCancelSchema,
  invoiceFromSalesOrderSchema,
} = require('../validators/invoice.validator');

const controller = require('../controllers/invoice.controller');

const router = express.Router();

// ======================================================
// ALL INVOICE ROUTES REQUIRE AUTHENTICATION
// ======================================================

router.use(authenticate);

// ======================================================
// BASIC CRUD
// ======================================================

// GET  /api/v1/invoices
// POST /api/v1/invoices

router
  .route('/')
  .get(controller.list)
  .post(
    validate(invoiceSchema),
    controller.create
  );

// ======================================================
// SALES ORDER -> INVOICE
// POST /api/v1/invoices/from-sales-order/:salesOrderId
// ======================================================
//
// Declared before '/:id' so it is not shadowed.
//
// ======================================================

router
  .route('/from-sales-order/:salesOrderId')
  .post(
    validate(invoiceFromSalesOrderSchema),
    controller.createFromSalesOrder
  );

// ======================================================
// CUSTOM ACTIONS
// ======================================================

// Update invoice status
// PATCH /api/v1/invoices/:id/status

router
  .route('/:id/status')
  .patch(
    validate(invoiceStatusSchema),
    controller.status
  );

// Update invoice payment
// PATCH /api/v1/invoices/:id/payment

router
  .route('/:id/payment')
  .patch(
    validate(invoicePaymentSchema),
    controller.payment
  );

// Cancel invoice
// PATCH /api/v1/invoices/:id/cancel

router
  .route('/:id/cancel')
  .patch(
    validate(invoiceCancelSchema),
    controller.cancel
  );

// Generate invoice PDF
// GET /api/v1/invoices/:id/pdf

router
  .route('/:id/pdf')
  .get(controller.pdf);

// ======================================================
// SINGLE INVOICE CRUD
// ======================================================

// GET    /api/v1/invoices/:id
// PUT    /api/v1/invoices/:id
// DELETE /api/v1/invoices/:id

router
  .route('/:id')
  .get(controller.getById)
  .put(
    validate(invoiceUpdateSchema),
    controller.update
  )
  .delete(controller.remove);

module.exports = router;
