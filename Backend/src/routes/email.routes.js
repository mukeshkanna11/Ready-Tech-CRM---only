"use strict";

const express = require("express");

const {
  authenticate,
} = require("../middleware/auth.middleware");

const controller =
  require("../controllers/email.controller");

const router =
  express.Router();

router.use(authenticate);

// Send email from Lead page
router.post(
  "/leads/:id/send",
  controller.sendLeadEmail
);

module.exports = router;