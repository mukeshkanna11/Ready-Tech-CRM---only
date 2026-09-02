const mongoose = require('mongoose');
const ApiError = require('./ApiError');
const { getPagination, buildPagination } = require('./pagination');

const sanitizeSort = (sort) => {
  if (!sort) return { createdAt: -1 };
  const field = String(sort).replace(/^-/, '');
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field)) return { createdAt: -1 };
  return { [field]: String(sort).startsWith('-') ? -1 : 1 };
};

const assertObjectId = (id, label = 'id') => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, `Invalid ${label}`, 'INVALID_ID');
  }
};

const listDocuments = async ({ Model, filter = {}, query = {}, populate = '' }) => {
  const { page, limit, skip } = getPagination(query);
  const sort = sanitizeSort(query.sort);

  const [items, total] = await Promise.all([
    Model.find(filter).sort(sort).skip(skip).limit(limit).populate(populate).lean(),
    Model.countDocuments(filter),
  ]);

  return {
    items,
    pagination: buildPagination(page, limit, total),
  };
};

module.exports = { sanitizeSort, assertObjectId, listDocuments };
