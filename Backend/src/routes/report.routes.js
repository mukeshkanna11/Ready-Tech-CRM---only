const express = require('express');
const controller = require('../controllers/report.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authenticate);

router.get('/leads', controller.leads);
router.get('/sales', controller.sales);
router.get('/pipeline', controller.pipeline);
router.get('/activities', controller.activities);
router.get('/revenue', controller.revenue);

module.exports = router;
