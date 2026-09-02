'use strict';

const express = require('express');

const router = express.Router();

const {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  deleteQuotation,
  getQuotationStats,
  updateQuotationStatus,
  sendQuotation,
  acceptQuotation,
  rejectQuotation,
} = require('../controllers/quotation.controller');

const {
  authenticate,
} = require('../middleware/auth.middleware');

// ============================================================
// QUOTATION STATS
// ============================================================

router.get(
  '/stats',
  authenticate,
  getQuotationStats
);

// ============================================================
// CREATE / LIST
// ============================================================

router.post(
  '/',
  authenticate,
  createQuotation
);

router.get(
  '/',
  authenticate,
  getQuotations
);

// ============================================================
// STATUS ACTIONS
// ============================================================

router.patch(
  '/:id/status',
  authenticate,
  updateQuotationStatus
);

router.post(
  '/:id/send',
  authenticate,
  sendQuotation
);

router.post(
  '/:id/accept',
  authenticate,
  acceptQuotation
);

router.post(
  '/:id/reject',
  authenticate,
  rejectQuotation
);

// ============================================================
// SINGLE QUOTATION
// ============================================================

router.get(
  '/:id',
  authenticate,
  getQuotationById
);

router.put(
  '/:id',
  authenticate,
  updateQuotation
);

router.delete(
  '/:id',
  authenticate,
  deleteQuotation
);

module.exports = router;