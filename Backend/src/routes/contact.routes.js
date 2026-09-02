'use strict';

const express = require('express');

const {
  createContact,
  getContacts,
  getContactById,
  updateContact,
  deleteContact,
} = require('../controllers/contact.controller');

const router = express.Router();


// ======================================================
// CONTACT ROUTES
// ======================================================

router
  .route('/')
  .get(getContacts)
  .post(createContact);

router
  .route('/:id')
  .get(getContactById)
  .put(updateContact)
  .delete(deleteContact);


module.exports = router;