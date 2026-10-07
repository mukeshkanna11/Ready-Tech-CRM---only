const express = require('express');
const controller = require('../controllers/customReport.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Mounted at /reports/custom (see app.js).
const router = express.Router();
router.use(authenticate);

router.get('/sources', controller.sources);
router.post('/preview', controller.preview);
router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id/run', controller.run);
router.get('/:id/export', controller.exportCsv);
router.get('/:id', controller.getById);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
