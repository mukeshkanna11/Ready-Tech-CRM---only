const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middleware/auth.middleware');
const { uploadMultiple, MAX_FILE_SIZE, MAX_FILES } = require('../middleware/upload.middleware');
const ApiError = require('../utils/ApiError');
const controller = require('../controllers/note.controller');
const router = express.Router();

router.use(authenticate);

// Turn multer errors into 400 responses.
const uploadFiles = (req, res, next) =>
  uploadMultiple('files')(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      const messages = {
        LIMIT_FILE_SIZE: `File too large (max ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB)`,
        LIMIT_FILE_COUNT: `Too many files (max ${MAX_FILES} per upload)`,
        LIMIT_UNEXPECTED_FILE: 'File type not allowed. Allowed: JPG, PNG, PDF, CSV, XLSX',
      };
      return next(new ApiError(400, messages[err.code] || err.message, err.code));
    }

    return next(err);
  });

router.route('/').get(controller.list).post(controller.create);
router.route('/:id').get(controller.getById).put(controller.update).delete(controller.remove);

router.post('/:id/attachments', controller.loadForUpload, uploadFiles, controller.addAttachments);
router
  .route('/:id/attachments/:attachmentId')
  .get(controller.downloadAttachment)
  .delete(controller.removeAttachment);

module.exports = router;
