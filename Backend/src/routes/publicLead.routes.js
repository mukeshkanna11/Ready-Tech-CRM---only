"use strict";

const express = require("express");

const controller =
  require("../controllers/publicLead.controller");

const {
  publicFormLimiter,
} = require("../middleware/rateLimit.middleware");

const router =
  express.Router();

const PHONE_PATTERN =
  /^\+?[0-9][0-9\s()-]{5,24}$/;

// Basic spam / input guard in front of the existing controller:
// - "website" is a hidden honeypot field; bots fill it, humans don't.
// - phone is optional but must look like a phone number when given.
const guardPublicLead = (req, res, next) => {
  const body = req.body || {};

  if (String(body.website || "").trim()) {
    return res.status(201).json({
      success: true,
      message: "Your enquiry has been received successfully",
    });
  }

  const phone = String(body.phone || "").trim();

  if (phone && !PHONE_PATTERN.test(phone)) {
    return res.status(400).json({
      success: false,
      message: "Invalid phone number",
      code: "INVALID_PHONE",
    });
  }

  return next();
};

// POST /api/v1/public/contact
router.post(
  "/contact",
  publicFormLimiter,
  guardPublicLead,
  controller.createPublicLead
);

module.exports = router;