const express = require('express');

const {
  authenticate,
} = require('../middleware/auth.middleware');

const controller = require('../controllers/invoice.controller');

const router = express.Router();

// ======================================================
// ALL INVOICE ROUTES REQUIRE AUTHENTICATION
// ======================================================

router.use(authenticate);

// ======================================================
// BASIC CRUD
// ======================================================

// GET  /api/invoices
// POST /api/invoices

router
  .route('/')
  .get(controller.list)
  .post(controller.create);

// ======================================================
// CUSTOM ACTIONS
// ======================================================

// Update invoice status
// PATCH /api/invoices/:id/status

router
  .route('/:id/status')
  .patch(controller.status);

// Update invoice payment
// PATCH /api/invoices/:id/payment

router
  .route('/:id/payment')
  .patch(controller.payment);

// Generate invoice PDF
// GET /api/invoices/:id/pdf

router
  .route('/:id/pdf')
  .get(controller.pdf);

// ======================================================
// SINGLE INVOICE CRUD
// ======================================================

// GET    /api/invoices/:id
// PUT    /api/invoices/:id
// DELETE /api/invoices/:id

router
  .route('/:id')
  .get(controller.getById)
  .put(controller.update)
  .delete(controller.remove);

module.exports = router;