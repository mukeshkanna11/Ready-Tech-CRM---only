'use strict';

const express = require('express');

const router = express.Router();

const {
  createAutomation,
  getAutomations,
  getAutomationById,
  updateAutomation,
  deleteAutomation,
  activateAutomation,
  pauseAutomation,
  duplicateAutomation,
  testAutomation,
  getAutomationExecutions,
} = require('../controllers/automation.controller');

const {
  authenticate,
} = require("../middleware/auth.middleware");

// Protect all automation routes
router.use(authenticate);

// CRUD
router.post('/', createAutomation);

router.get('/', getAutomations);

router.get('/:id', getAutomationById);

router.put('/:id', updateAutomation);

router.delete('/:id', deleteAutomation);

// Status
router.post('/:id/activate', activateAutomation);

router.post('/:id/pause', pauseAutomation);

// Duplicate
router.post('/:id/duplicate', duplicateAutomation);

// Manual test
router.post('/:id/test', testAutomation);

// Execution logs
router.get('/:id/executions', getAutomationExecutions);

module.exports = router;