const express = require('express');
const controller = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { createUserSchema, updateUserSchema } = require('../validators/user.validator');

const router = express.Router();

router.use(authenticate);

router.route('/')
  .get(controller.list)
  .post(validate(createUserSchema), controller.create);

router.route('/:id')
  .get(controller.getById)
  .put(validate(updateUserSchema), controller.update)
  .delete(controller.remove);

module.exports = router;
