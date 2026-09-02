'use strict';


// ======================================================
// STANDARD APPLICATION ERROR
// ======================================================

class ApiError extends Error {
  constructor(
    statusCode = 500,
    message = 'Something went wrong',
    code = 'API_ERROR',
    details = null,
    options = {}
  ) {
    super(message);

    // ----------------------------------------------
    // Error name
    // ----------------------------------------------

    this.name =
      options.name ||
      'ApiError';


    // ----------------------------------------------
    // HTTP status
    // ----------------------------------------------

    this.statusCode =
      Number(statusCode) || 500;


    // ----------------------------------------------
    // Application error code
    // ----------------------------------------------

    this.code =
      code ||
      'API_ERROR';


    // ----------------------------------------------
    // Additional error details
    // ----------------------------------------------

    this.details =
      details ?? null;


    // ----------------------------------------------
    // Operational error
    // ----------------------------------------------

    this.isOperational =
      options.isOperational !==
      undefined
        ? Boolean(
            options.isOperational
          )
        : true;


    // ----------------------------------------------
    // Optional metadata
    // ----------------------------------------------

    if (
      options.meta !==
      undefined
    ) {
      this.meta =
        options.meta;
    }


    // ----------------------------------------------
    // Capture stack trace
    // ----------------------------------------------

    Error.captureStackTrace(
      this,
      this.constructor
    );
  }


  // ==================================================
  // FACTORY METHODS
  // ==================================================

  static badRequest(
    message = 'Bad request',
    code = 'BAD_REQUEST',
    details = null
  ) {
    return new ApiError(
      400,
      message,
      code,
      details
    );
  }


  static unauthorized(
    message = 'Authentication required',
    code = 'UNAUTHORIZED',
    details = null
  ) {
    return new ApiError(
      401,
      message,
      code,
      details
    );
  }


  static forbidden(
    message = 'You do not have permission for this action',
    code = 'FORBIDDEN',
    details = null
  ) {
    return new ApiError(
      403,
      message,
      code,
      details
    );
  }


  static notFound(
    message = 'Resource not found',
    code = 'NOT_FOUND',
    details = null
  ) {
    return new ApiError(
      404,
      message,
      code,
      details
    );
  }


  static conflict(
    message = 'Resource already exists',
    code = 'CONFLICT',
    details = null
  ) {
    return new ApiError(
      409,
      message,
      code,
      details
    );
  }


  static tooManyRequests(
    message = 'Too many requests',
    code = 'RATE_LIMITED',
    details = null
  ) {
    return new ApiError(
      429,
      message,
      code,
      details
    );
  }


  static internal(
    message = 'Internal server error',
    code = 'INTERNAL_ERROR',
    details = null
  ) {
    return new ApiError(
      500,
      message,
      code,
      details,
      {
        isOperational: false,
      }
    );
  }
}


// ======================================================
// EXPORT
// ======================================================

module.exports =
  ApiError;