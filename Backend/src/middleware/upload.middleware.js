'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');


// ======================================================
// UPLOAD DIRECTORY
// ======================================================

const uploadDir = path.join(
  process.cwd(),
  'uploads'
);

fs.mkdirSync(
  uploadDir,
  {
    recursive: true,
  }
);


// ======================================================
// ALLOWED FILE TYPES
// ======================================================

const ALLOWED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/pdf': ['.pdf'],
  'text/csv': ['.csv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    ['.xlsx'],
};


// ======================================================
// FILE SIZE
// ======================================================

const MAX_FILE_SIZE =
  Number(
    process.env.MAX_UPLOAD_SIZE_MB || 5
  ) *
  1024 *
  1024;


// ======================================================
// MAX FILES
// ======================================================

const MAX_FILES =
  Number(
    process.env.MAX_UPLOAD_FILES || 5
  );


// ======================================================
// SAFE FILENAME
// ======================================================

const sanitizeFilename = (
  filename
) => {
  const parsed =
    path.parse(
      filename || 'file'
    );

  const safeBaseName =
    parsed.name
      .replace(
        /[^a-zA-Z0-9_-]/g,
        '_'
      )
      .replace(
        /_+/g,
        '_'
      )
      .slice(0, 80);

  const safeExtension =
    parsed.ext
      .toLowerCase()
      .replace(
        /[^a-z0-9.]/g,
        ''
      );

  return {
    baseName:
      safeBaseName ||
      'file',

    extension:
      safeExtension,
  };
};


// ======================================================
// STORAGE
// ======================================================

const storage =
  multer.diskStorage({
    destination:
      (_req, _file, cb) => {
        cb(
          null,
          uploadDir
        );
      },

    filename:
      (_req, file, cb) => {
        const {
          baseName,
          extension,
        } =
          sanitizeFilename(
            file.originalname
          );

        // Cryptographically random filename
        // prevents collisions and predictable paths.
        const uniqueId =
          crypto
            .randomBytes(16)
            .toString('hex');

        const filename =
          `${Date.now()}-${uniqueId}-${baseName}${extension}`;

        cb(
          null,
          filename
        );
      },
  });


// ======================================================
// FILE FILTER
// ======================================================

const fileFilter =
  (_req, file, cb) => {
    const mimetype =
      String(
        file.mimetype || ''
      )
        .trim()
        .toLowerCase();

    const {
      extension,
    } =
      sanitizeFilename(
        file.originalname
      );

    const allowedExtensions =
      ALLOWED_FILE_TYPES[
        mimetype
      ];

    // ----------------------------------------------
    // MIME type check
    // ----------------------------------------------

    if (
      !allowedExtensions
    ) {
      return cb(
        new multer.MulterError(
          'LIMIT_UNEXPECTED_FILE'
        )
      );
    }

    // ----------------------------------------------
    // Extension + MIME validation
    // ----------------------------------------------
    //
    // Prevent:
    //
    // malicious.exe renamed as image.jpg
    //
    // ----------------------------------------------

    if (
      !allowedExtensions.includes(
        extension
      )
    ) {
      return cb(
        new multer.MulterError(
          'LIMIT_UNEXPECTED_FILE'
        )
      );
    }

    return cb(
      null,
      true
    );
  };


// ======================================================
// MULTER INSTANCE
// ======================================================

const upload =
  multer({
    storage,

    fileFilter,

    limits: {
      fileSize:
        MAX_FILE_SIZE,

      files:
        MAX_FILES,

      fields:
        50,

      fieldNameSize:
        100,

      fieldSize:
        1024 * 1024,
    },
  });


// ======================================================
// SINGLE FILE
// ======================================================

const uploadSingle =
  (fieldName) =>
    upload.single(
      fieldName
    );


// ======================================================
// MULTIPLE FILES
// ======================================================

const uploadMultiple =
  (fieldName) =>
    upload.array(
      fieldName,
      MAX_FILES
    );


// ======================================================
// MULTIPLE NAMED FIELDS
// ======================================================

const uploadFields =
  (fields) =>
    upload.fields(
      fields
    );


// ======================================================
// EXPORT
// ======================================================

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  uploadFields,

  uploadDir,
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES,
};