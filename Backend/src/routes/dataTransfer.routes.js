const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const controller = require('../controllers/dataTransfer.controller');

const router = express.Router();
router.use(authenticate);

// :entity = leads | contacts | companies
router.get('/:entity/export', controller.requireEntityPermission('READ'), controller.exportCsv);
router.get('/:entity/template', controller.requireEntityPermission('READ'), controller.templateCsv);
router.post('/:entity/import', controller.requireEntityPermission('CREATE'), controller.importCsv);

module.exports = router;
