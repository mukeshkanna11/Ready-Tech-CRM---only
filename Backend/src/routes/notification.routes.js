const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const controller = require('../controllers/notification.controller');
const router = express.Router();

router.use(authenticate);


router.route('/').get(controller.list);
router.patch('/:id/read', controller.update);
router.route('/:id').delete(controller.remove);


module.exports = router;
