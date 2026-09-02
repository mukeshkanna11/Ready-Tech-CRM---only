const { listDocuments, assertObjectId } = require('../utils/crud');
const ApiError = require('../utils/ApiError');

const create = async (Model, payload) => Model.create(payload);

const list = async (Model, { filter = {}, query = {}, populate = '' }) =>
  listDocuments({ Model, filter, query, populate });

const getById = async (Model, id, populate = '') => {
  assertObjectId(id);
  const doc = await Model.findById(id).populate(populate);
  if (!doc) throw new ApiError(404, `${Model.modelName} not found`, `${Model.modelName.toUpperCase()}_NOT_FOUND`);
  return doc;
};

const update = async (Model, id, payload) => {
  assertObjectId(id);
  const doc = await Model.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  if (!doc) throw new ApiError(404, `${Model.modelName} not found`, `${Model.modelName.toUpperCase()}_NOT_FOUND`);
  return doc;
};

const remove = async (Model, id) => {
  assertObjectId(id);
  const doc = await Model.findByIdAndDelete(id);
  if (!doc) throw new ApiError(404, `${Model.modelName} not found`, `${Model.modelName.toUpperCase()}_NOT_FOUND`);
  return doc;
};

module.exports = { create, list, getById, update, remove };
