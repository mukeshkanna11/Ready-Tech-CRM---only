const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const controller = require('../controllers/note.controller');
const router = express.Router();

router.use(authenticate);


router.route('/').get(controller.list).post(controller.create);
router.route('/:id').get(controller.getById).put(controller.update).delete(controller.remove);


module.exports = router;
