'use strict';

const {
  sendError,
} = require('../utils/apiResponse');

const ApiError =
  require('../utils/ApiError');

const logger =
  require('../config/logger');


// ======================================================
// ENVIRONMENT
// ======================================================

const isProduction =
  process.env.NODE_ENV === 'production';


// ======================================================
// NOT FOUND
// ======================================================

const notFound = (
  req,
  _res,
  next
) => {
  const error =
    new ApiError(
      404,
      `Route not found: ${req.method} ${req.originalUrl}`,
      'ROUTE_NOT_FOUND'
    );

  next(error);
};


// ======================================================
// ERROR LOGGER
// ======================================================

const logError = (
  err,
  req
) => {
  try {
    const metadata = {
      method:
        req.method,

      url:
        req.originalUrl,

      ip:
        req.ip,

      userId:
        req.user?._id
          ? String(req.user._id)
          : undefined,

      userAgent:
        req.get('user-agent'),

      statusCode:
        err.statusCode ||
        err.status ||
        500,

      code:
        err.code,
    };

    logger.error(
      err.message || 'Unhandled error',
      {
        ...metadata,

        stack:
          err.stack,
      }
    );
  } catch (loggingError) {
    // Never allow logging failure to
    // break the error response.
    console.error(
      'Error logger failure:',
      loggingError
    );

    console.error(err);
  }
};


// ======================================================
// ZOD ERROR
// ======================================================

const handleZodError = (
  err,
  res
) => {
  const details =
    Array.isArray(err.issues)
      ? err.issues.map(
          (issue) => ({
            field:
              Array.isArray(
                issue.path
              )
                ? issue.path.join('.')
                : undefined,

            message:
              issue.message,

            code:
              issue.code,
          })
        )
      : [];

  return sendError(
    res,
    'Validation failed',
    400,
    'VALIDATION_ERROR',
    details
  );
};


// ======================================================
// MONGOOSE VALIDATION ERROR
// ======================================================

const handleMongooseValidationError = (
  err,
  res
) => {
  const details =
    Object.values(
      err.errors || {}
    ).map(
      (error) => ({
        field:
          error.path,

        message:
          error.message,

        kind:
          error.kind,
      })
    );

  return sendError(
    res,
    'Validation failed',
    400,
    'VALIDATION_ERROR',
    details
  );
};


// ======================================================
// MONGOOSE CAST ERROR
// ======================================================

const handleCastError = (
  err,
  res
) => {
  return sendError(
    res,
    'Invalid resource identifier',
    400,
    'INVALID_ID',
    isProduction
      ? null
      : {
          field:
            err.path,

          value:
            err.value,

          kind:
            err.kind,
        }
  );
};


// ======================================================
// DUPLICATE KEY ERROR
// ======================================================

const handleDuplicateKeyError = (
  err,
  res
) => {
  const duplicateFields =
    err.keyPattern ||
    {};

  const duplicateValues =
    err.keyValue ||
    {};

  const details =
    isProduction
      ? Object.keys(
          duplicateFields
        ).map(
          (field) => ({
            field,
            message:
              `${field} already exists`,
          })
        )
      : {
          fields:
            duplicateFields,

          values:
            duplicateValues,
        };

  return sendError(
    res,
    'Duplicate value already exists',
    409,
    'DUPLICATE_RESOURCE',
    details
  );
};


// ======================================================
// JWT ERRORS
// ======================================================

const handleJwtError = (
  err,
  res
) => {
  if (
    err.name ===
    'TokenExpiredError'
  ) {
    return sendError(
      res,
      'Access token has expired',
      401,
      'TOKEN_EXPIRED'
    );
  }

  if (
    err.name ===
    'JsonWebTokenError'
  ) {
    return sendError(
      res,
      'Invalid authentication token',
      401,
      'INVALID_TOKEN'
    );
  }

  if (
    err.name ===
    'NotBeforeError'
  ) {
    return sendError(
      res,
      'Authentication token is not active yet',
      401,
      'TOKEN_NOT_ACTIVE'
    );
  }

  return null;
};


// ======================================================
// MONGO SERVER ERROR
// ======================================================

const handleMongoError = (
  err,
  res
) => {
  // MongoDB transaction/write conflict
  if (
    err.hasErrorLabel &&
    err.hasErrorLabel(
      'TransientTransactionError'
    )
  ) {
    return sendError(
      res,
      'Database transaction failed. Please try again.',
      503,
      'TRANSACTION_RETRY'
    );
  }

  // Unknown MongoDB error
  return sendError(
    res,
    isProduction
      ? 'Database operation failed'
      : err.message,
    500,
    'DATABASE_ERROR',
    isProduction
      ? null
      : {
          name:
            err.name,
        }
  );
};


// ======================================================
// ERROR HANDLER
// ======================================================

const errorHandler = (
  err,
  req,
  res,
  _next
) => {
  // ----------------------------------------------
  // Always log server-side
  // ----------------------------------------------

  logError(
    err,
    req
  );

  // ----------------------------------------------
  // Response already sent
  // ----------------------------------------------

  if (
    res.headersSent
  ) {
    return;
  }

  // ----------------------------------------------
  // ApiError
  // ----------------------------------------------
  //
  // Your custom application error.
  //
  // ----------------------------------------------

  if (
    err instanceof ApiError
  ) {
    const status =
      err.statusCode || 500;

    return sendError(
      res,

      status >= 500
        ? 'Internal server error'
        : err.message,

      status,

      err.code ||
        'INTERNAL_ERROR',

      status >= 500
        ? null
        : err.details || null
    );
  }

  // ----------------------------------------------
  // Zod
  // ----------------------------------------------

  if (
    err.name ===
      'ZodError' ||
    Array.isArray(
      err.issues
    )
  ) {
    return handleZodError(
      err,
      res
    );
  }

  // ----------------------------------------------
  // Mongoose Validation
  // ----------------------------------------------

  if (
    err.name ===
    'ValidationError'
  ) {
    return handleMongooseValidationError(
      err,
      res
    );
  }

  // ----------------------------------------------
  // Mongoose Cast
  // ----------------------------------------------

  if (
    err.name ===
    'CastError'
  ) {
    return handleCastError(
      err,
      res
    );
  }

  // ----------------------------------------------
  // Mongo duplicate key
  // ----------------------------------------------

  if (
    err.code === 11000
  ) {
    return handleDuplicateKeyError(
      err,
      res
    );
  }

  // ----------------------------------------------
  // JWT
  // ----------------------------------------------

  const jwtResponse =
    handleJwtError(
      err,
      res
    );

  if (jwtResponse) {
    return jwtResponse;
  }

  // ----------------------------------------------
  // MongoDB server errors
  // ----------------------------------------------

  if (
    err.name ===
      'MongoServerError' ||
    err.name ===
      'MongoError'
  ) {
    return handleMongoError(
      err,
      res
    );
  }

  // ----------------------------------------------
  // Payload too large
  // ----------------------------------------------

  if (
    err.type ===
      'entity.too.large' ||
    err.status === 413
  ) {
    return sendError(
      res,
      'Request payload is too large',
      413,
      'PAYLOAD_TOO_LARGE'
    );
  }

  // ----------------------------------------------
  // Invalid JSON body
  // ----------------------------------------------

  if (
    err instanceof SyntaxError &&
    err.status === 400 &&
    'body' in err
  ) {
    return sendError(
      res,
      'Invalid JSON request body',
      400,
      'INVALID_JSON'
    );
  }

  // ----------------------------------------------
  // Generic application error
  // ----------------------------------------------

  const status =
    Number.isInteger(
      err.statusCode
    )
      ? err.statusCode
      : Number.isInteger(
          err.status
        )
        ? err.status
        : 500;

  // ----------------------------------------------
  // Never expose internal errors
  // in production
  // ----------------------------------------------

  const message =
    status >= 500
      ? 'Internal server error'
      : err.message ||
        'Request failed';

  const details =
    status >= 500
      ? null
      : (
          err.details ||
          null
        );

  // ----------------------------------------------
  // Development debugging
  // ----------------------------------------------

  if (
    !isProduction &&
    status >= 500
  ) {
    return sendError(
      res,
      message,
      status,
      err.code ||
        'INTERNAL_ERROR',
      {
        ...(details || {}),

        error:
          err.name,

        stack:
          err.stack,
      }
    );
  }

  // ----------------------------------------------
  // Final response
  // ----------------------------------------------

  return sendError(
    res,
    message,
    status,
    err.code ||
      'INTERNAL_ERROR',
    details
  );
};


// ======================================================
// EXPORT
// ======================================================

module.exports = {
  notFound,
  errorHandler,
};