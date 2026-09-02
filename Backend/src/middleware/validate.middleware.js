'use strict';

const ApiError =
  require('../utils/ApiError');


// ======================================================
// ALLOWED REQUEST SOURCES
// ======================================================

const ALLOWED_SOURCES = [
  'body',
  'query',
  'params',
  'headers',
];


// ======================================================
// VALIDATION MIDDLEWARE
// ======================================================
//
// Usage:
//
// validate(createLeadSchema)
//
// validate(
//   updateLeadSchema,
//   'body'
// )
//
// validate(
//   leadIdSchema,
//   'params'
// )
//
// validate(
//   leadQuerySchema,
//   'query'
// )
//
// ======================================================

const validate =
  (
    schema,
    source = 'body'
  ) =>
  (
    req,
    _res,
    next
  ) => {
    // ----------------------------------------------
    // Schema validation
    // ----------------------------------------------

    if (
      !schema ||
      typeof schema.safeParse !==
        'function'
    ) {
      return next(
        new ApiError(
          500,
          'Invalid validation schema configuration',
          'VALIDATION_CONFIG_ERROR'
        )
      );
    }

    // ----------------------------------------------
    // Request source validation
    // ----------------------------------------------

    if (
      !ALLOWED_SOURCES.includes(
        source
      )
    ) {
      return next(
        new ApiError(
          500,
          `Unsupported validation source: ${source}`,
          'VALIDATION_CONFIG_ERROR'
        )
      );
    }

    // ----------------------------------------------
    // Request data
    // ----------------------------------------------

    const data =
      req[source] ?? {};

    // ----------------------------------------------
    // Zod validation
    // ----------------------------------------------

    const result =
      schema.safeParse(
        data
      );

    // ----------------------------------------------
    // Validation failed
    // ----------------------------------------------

    if (!result.success) {
      const details =
        result.error.issues.map(
          (issue) => ({
            path:
              issue.path,

            field:
              issue.path.length > 0
                ? issue.path.join('.')
                : source,

            message:
              issue.message,

            code:
              issue.code,
          })
        );

      return next(
        new ApiError(
          400,
          'Request validation failed',
          'VALIDATION_ERROR',
          details
        )
      );
    }

    // ----------------------------------------------
    // Replace request data with
    // parsed / transformed data.
    // ----------------------------------------------

    req[source] =
      result.data;

    return next();
  };


// ======================================================
// VALIDATE MULTIPLE SOURCES
// ======================================================
//
// Usage:
//
// validateRequest({
//   body: createLeadSchema,
//   params: leadIdSchema,
//   query: leadQuerySchema,
// })
//
// ======================================================

const validateRequest =
  (schemas = {}) =>
  (
    req,
    _res,
    next
  ) => {
    if (
      !schemas ||
      typeof schemas !==
        'object'
    ) {
      return next(
        new ApiError(
          500,
          'Invalid validation configuration',
          'VALIDATION_CONFIG_ERROR'
        )
      );
    }

    const validationErrors = [];

    for (
      const [
        source,
        schema,
      ] of Object.entries(
        schemas
      )
    ) {
      // --------------------------------------------
      // Validate source
      // --------------------------------------------

      if (
        !ALLOWED_SOURCES.includes(
          source
        )
      ) {
        return next(
          new ApiError(
            500,
            `Unsupported validation source: ${source}`,
            'VALIDATION_CONFIG_ERROR'
          )
        );
      }

      // --------------------------------------------
      // Validate schema
      // --------------------------------------------

      if (
        !schema ||
        typeof schema.safeParse !==
          'function'
      ) {
        return next(
          new ApiError(
            500,
            `Invalid validation schema for ${source}`,
            'VALIDATION_CONFIG_ERROR'
          )
        );
      }

      // --------------------------------------------
      // Run validation
      // --------------------------------------------

      const result =
        schema.safeParse(
          req[source] ?? {}
        );

      if (
        !result.success
      ) {
        result.error.issues.forEach(
          (issue) => {
            validationErrors.push({
              source,

              path:
                issue.path,

              field:
                issue.path.length > 0
                  ? `${source}.${issue.path.join('.')}`
                  : source,

              message:
                issue.message,

              code:
                issue.code,
            });
          }
        );
      } else {
        // ------------------------------------------
        // Apply transformed result
        // ------------------------------------------

        req[source] =
          result.data;
      }
    }

    // ----------------------------------------------
    // Return all validation errors together
    // ----------------------------------------------

    if (
      validationErrors.length > 0
    ) {
      return next(
        new ApiError(
          400,
          'Request validation failed',
          'VALIDATION_ERROR',
          validationErrors
        )
      );
    }

    return next();
  };


// ======================================================
// EXPORT
// ======================================================

module.exports = validate;

module.exports.validate =
  validate;

module.exports.validateRequest =
  validateRequest;