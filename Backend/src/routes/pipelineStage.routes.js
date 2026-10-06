const express = require('express');
const controller = require('../controllers/pipelineStage.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authenticate);

router.route('/').get(controller.list).post(controller.create);
router.put('/reorder', controller.reorder);
router.route('/:id').put(controller.update).delete(controller.remove);

module.exports = router;
