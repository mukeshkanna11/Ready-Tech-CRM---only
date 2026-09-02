const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const controller = require('../controllers/opportunity.controller');
const router = express.Router();

router.use(authenticate);


router.route('/').get(controller.list).post(controller.create);
router.get('/pipeline/summary', controller.pipeline);
router.route('/:id').get(controller.getById).put(controller.update).delete(controller.remove);
router.patch('/:id/stage', controller.stage);


module.exports = router;
