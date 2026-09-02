'use strict';

const mongoose = require('mongoose');

const ApiError = require('./ApiError');
const {
  getPagination,
  buildPagination,
} = require('./pagination');


// ======================================================
// ALLOWED DEFAULT SORT
// ======================================================

const DEFAULT_SORT = {
  createdAt: -1,
};


// ======================================================
// SAFE SORT
// ======================================================
//
// Supported:
//
// ?sort=name
// ?sort=-name
// ?sort=createdAt
// ?sort=-createdAt
//
// Multiple fields:
//
// ?sort=-createdAt,name
//
// Invalid Mongo operators are rejected.
//
// ======================================================

const sanitizeSort = (
  sort,
  allowedFields = null
) => {
  if (!sort) {
    return {
      ...DEFAULT_SORT,
    };
  }

  const value = String(sort)
    .trim();

  if (!value) {
    return {
      ...DEFAULT_SORT,
    };
  }

  const fields = value
    .split(',')
    .map(
      (field) =>
        field.trim()
    )
    .filter(Boolean);

  const sortObject = {};

  for (const rawField of fields) {
    const descending =
      rawField.startsWith('-');

    const field = rawField
      .replace(/^-/, '')
      .trim();

    // ----------------------------------------------
    // Prevent MongoDB operator injection
    // ----------------------------------------------

    if (
      !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(
        field
      )
    ) {
      continue;
    }

    // ----------------------------------------------
    // Allowed fields
    // ----------------------------------------------

    if (
      Array.isArray(
        allowedFields
      ) &&
      allowedFields.length > 0 &&
      !allowedFields.includes(
        field
      )
    ) {
      continue;
    }

    sortObject[field] =
      descending ? -1 : 1;
  }

  if (
    Object.keys(sortObject)
      .length === 0
  ) {
    return {
      ...DEFAULT_SORT,
    };
  }

  return sortObject;
};


// ======================================================
// OBJECT ID VALIDATION
// ======================================================

const assertObjectId = (
  id,
  label = 'id'
) => {
  if (
    id === undefined ||
    id === null ||
    id === ''
  ) {
    throw new ApiError(
      400,
      `${label} is required`,
      'ID_REQUIRED'
    );
  }

  if (
    !mongoose.isValidObjectId(
      id
    )
  ) {
    throw new ApiError(
      400,
      `Invalid ${label}`,
      'INVALID_ID'
    );
  }

  return id;
};


// ======================================================
// OPTIONAL OBJECT ID
// ======================================================

const isValidObjectId =
  (id) =>
    Boolean(
      id &&
      mongoose.isValidObjectId(
        id
      )
    );


// ======================================================
// OBJECT ID FILTER
// ======================================================
//
// Useful for:
//
// ?company=...
// ?owner=...
// ?assignedTo=...
//
// ======================================================

const buildObjectIdFilter = (
  query = {},
  fields = []
) => {
  const filter = {};

  for (const field of fields) {
    const value =
      query[field];

    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      continue;
    }

    if (
      !mongoose.isValidObjectId(
        value
      )
    ) {
      throw new ApiError(
        400,
        `Invalid ${field}`,
        'INVALID_ID'
      );
    }

    filter[field] =
      value;
  }

  return filter;
};


// ======================================================
// DATE RANGE
// ======================================================
//
// Supports:
//
// ?fromDate=2026-01-01
// ?toDate=2026-01-31
//
// ======================================================

const buildDateRange = (
  query = {},
  field = 'createdAt'
) => {
  const {
    fromDate,
    toDate,
  } = query;

  if (
    !fromDate &&
    !toDate
  ) {
    return {};
  }

  const range = {};

  if (fromDate) {
    const start =
      new Date(fromDate);

    if (
      Number.isNaN(
        start.getTime()
      )
    ) {
      throw new ApiError(
        400,
        'Invalid fromDate',
        'INVALID_DATE'
      );
    }

    // Start of day
    start.setHours(
      0,
      0,
      0,
      0
    );

    range.$gte = start;
  }

  if (toDate) {
    const end =
      new Date(toDate);

    if (
      Number.isNaN(
        end.getTime()
      )
    ) {
      throw new ApiError(
        400,
        'Invalid toDate',
        'INVALID_DATE'
      );
    }

    // End of day
    end.setHours(
      23,
      59,
      59,
      999
    );

    range.$lte = end;
  }

  return {
    [field]: range,
  };
};


// ======================================================
// POPULATE NORMALIZER
// ======================================================

const applyPopulate = (
  query,
  populate
) => {
  if (
    !populate
  ) {
    return query;
  }

  if (
    Array.isArray(
      populate
    )
  ) {
    return query.populate(
      populate
    );
  }

  return query.populate(
    populate
  );
};


// ======================================================
// LIST DOCUMENTS
// ======================================================
//
// Generic reusable listing utility.
//
// Supports:
//
// - Pagination
// - Sorting
// - Populate
// - Lean
// - Count
//
// ======================================================

const listDocuments = async ({
  Model,
  filter = {},
  query = {},
  populate = '',
  allowedSortFields = null,
}) => {
  if (!Model) {
    throw new ApiError(
      500,
      'Model is required',
      'MODEL_REQUIRED'
    );
  }

  const {
    page,
    limit,
    skip,
  } =
    getPagination(
      query
    );

  const sort =
    sanitizeSort(
      query.sort,
      allowedSortFields
    );

  let mongooseQuery =
    Model.find(
      filter
    )
      .sort(sort)
      .skip(skip)
      .limit(limit);

  mongooseQuery =
    applyPopulate(
      mongooseQuery,
      populate
    );

  const [
    items,
    total,
  ] = await Promise.all([
    mongooseQuery.lean(),

    Model.countDocuments(
      filter
    ),
  ]);

  return {
    items,

    pagination:
      buildPagination(
        page,
        limit,
        total
      ),
  };
};


// ======================================================
// FIND ONE DOCUMENT
// ======================================================

const findDocumentById =
  async ({
    Model,
    id,
    label = 'record',
    populate = '',
  }) => {
    assertObjectId(
      id,
      `${label} id`
    );

    let query =
      Model.findById(id);

    query =
      applyPopulate(
        query,
        populate
      );

    const document =
      await query.lean();

    if (!document) {
      throw new ApiError(
        404,
        `${label} not found`,
        `${String(
          Model.modelName
        ).toUpperCase()}_NOT_FOUND`
      );
    }

    return document;
  };


// ======================================================
// EXPORT
// ======================================================

module.exports = {
  sanitizeSort,

  assertObjectId,

  isValidObjectId,

  buildObjectIdFilter,

  buildDateRange,

  applyPopulate,

  listDocuments,

  findDocumentById,
};