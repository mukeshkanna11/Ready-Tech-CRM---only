'use strict';

const express = require('express');

const router = express.Router();

const {
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  restoreCompany,
  getCompanyStats,
} = require('../controllers/company.controller');

const {
  authenticate,
} = require('../middleware/auth.middleware');


// ======================================================
// COMPANY ROUTES
// ======================================================

// Dashboard statistics
router.get(
  '/stats',
  authenticate,
  getCompanyStats
);

// Get companies
router.get(
  '/',
  authenticate,
  getCompanies
);

// Create company
router.post(
  '/',
  authenticate,
  createCompany
);

// Get single company
router.get(
  '/:id',
  authenticate,
  getCompanyById
);

// Update company
router.put(
  '/:id',
  authenticate,
  updateCompany
);

// Soft delete
router.delete(
  '/:id',
  authenticate,
  deleteCompany
);

// Restore
router.patch(
  '/:id/restore',
  authenticate,
  restoreCompany
);


module.exports = router;