'use strict';

/**
 * ======================================================
 * ASYNC HANDLER
 * ======================================================
 *
 * Wraps Express async route/controller handlers and
 * forwards rejected promises to the global error handler.
 *
 * Usage:
 *
 * router.get(
 *   '/',
 *   asyncHandler(controller.list)
 * );
 *
 * ======================================================
 */

const asyncHandler = (handler) => {
  // --------------------------------------------------
  // Validate handler configuration
  // --------------------------------------------------

  if (
    typeof handler !== 'function'
  ) {
    throw new TypeError(
      'asyncHandler requires a function'
    );
  }

  // --------------------------------------------------
  // Express middleware wrapper
  // --------------------------------------------------

  return function asyncMiddleware(
    req,
    res,
    next
  ) {
    try {
      return Promise
        .resolve(
          handler(
            req,
            res,
            next
          )
        )
        .catch(next);
    } catch (error) {
      return next(error);
    }
  };
};


// ======================================================
// EXPORT
// ======================================================

module.exports =
  asyncHandler;