'use strict';

const express = require('express');

const {
  createEmailEnquiry,
} = require('../controllers/emailEnquiry.controller');

const router = express.Router();

// POST /api/v1/email/enquiry
router.post(
  '/enquiry',
  createEmailEnquiry
);

module.exports = router;