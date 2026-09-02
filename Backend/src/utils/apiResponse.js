'use strict';


// ======================================================
// SUCCESS RESPONSE
// ======================================================

const sendSuccess = (
  res,
  data = null,
  message = 'Success',
  statusCode = 200,
  extra = {}
) => {
  return res
    .status(statusCode)
    .json({
      success: true,
      message,
      data,
      ...extra,
    });
};


// ======================================================
// ERROR RESPONSE
// ======================================================

const sendError = (
  res,
  message = 'Something went wrong',
  statusCode = 500,
  code = 'API_ERROR',
  details = null
) => {
  return res
    .status(statusCode)
    .json({
      success: false,
      message,
      error: {
        code,
        details,
      },
    });
};


// ======================================================
// PAGINATED RESPONSE
// ======================================================
//
// Standard CRM pagination response.
//
// ======================================================

const sendPaginated = (
  res,
  data = [],
  pagination = {},
  message = 'Records fetched successfully',
  statusCode = 200,
  extra = {}
) => {
  const page =
    Number(
      pagination.page || 1
    );

  const limit =
    Number(
      pagination.limit || 20
    );

  const total =
    Number(
      pagination.total || 0
    );

  const totalPages =
    pagination.totalPages !==
    undefined
      ? Number(
          pagination.totalPages
        )
      : total > 0
        ? Math.ceil(
            total / limit
          )
        : 0;

  return res
    .status(statusCode)
    .json({
      success: true,
      message,
      data,

      pagination: {
        page,
        limit,
        total,
        totalPages,

        hasNextPage:
          page < totalPages,

        hasPrevPage:
          page > 1,

        ...pagination,
      },

      ...extra,
    });
};


// ======================================================
// CREATED RESPONSE
// ======================================================

const sendCreated = (
  res,
  data = null,
  message = 'Created successfully',
  extra = {}
) => {
  return sendSuccess(
    res,
    data,
    message,
    201,
    extra
  );
};


// ======================================================
// NO CONTENT RESPONSE
// ======================================================
//
// Useful when an operation succeeds but
// no response body is required.
//
// ======================================================

const sendNoContent = (
  res
) => {
  return res
    .status(204)
    .send();
};


// ======================================================
// EXPORT
// ======================================================

module.exports = {
  sendSuccess,
  sendError,
  sendPaginated,
  sendCreated,
  sendNoContent,
};