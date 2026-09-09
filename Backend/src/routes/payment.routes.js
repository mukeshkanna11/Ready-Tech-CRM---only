const express = require('express');

const {
  authenticate,
} = require('../middleware/auth.middleware');

const controller = require('../controllers/payment.controller');

const router = express.Router();

// ======================================================
// ALL PAYMENT ROUTES REQUIRE AUTHENTICATION
// ======================================================

router.use(authenticate);

// ======================================================
// PAYMENT LIST / CREATE
// ======================================================

// GET  /api/v1/payments
// POST /api/v1/payments

router
  .route('/')
  .get(controller.list)
  .post(controller.create);

// ======================================================
// INVOICE PAYMENT HISTORY
// ======================================================

// GET /api/v1/payments/invoice/:invoiceId

router
  .route('/invoice/:invoiceId')
  .get(controller.invoiceHistory);

// ======================================================
// CANCEL PAYMENT
// ======================================================

// PATCH /api/v1/payments/:id/cancel

router
  .route('/:id/cancel')
  .patch(controller.cancel);

// ======================================================
// SINGLE PAYMENT
// ======================================================

// GET /api/v1/payments/:id

router
  .route('/:id')
  .get(controller.getById);

module.exports = router;