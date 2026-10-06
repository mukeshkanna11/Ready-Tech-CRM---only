'use strict';

const mongoose = require('mongoose');

const PipelineStage = require('../models/PipelineStage');
const Opportunity = require('../models/Opportunity');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const {
  SYSTEM_STAGES,
  ensureDefaultStages,
  getStages,
} = require('../services/pipelineStage.service');

const toKey = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);

const findStage = async (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'Invalid stage ID', 'INVALID_ID');
  }

  const stage = await PipelineStage.findById(id);
  if (!stage) throw new ApiError(404, 'Stage not found', 'STAGE_NOT_FOUND');

  return stage;
};

// GET /pipeline-stages?active=true
exports.list = asyncHandler(async (req, res) => {
  const stages = await getStages({ activeOnly: req.query.active === 'true' });

  const usage = await Opportunity.aggregate([
    { $group: { _id: '$stage', count: { $sum: 1 } } },
  ]);
  const counts = Object.fromEntries(usage.map((u) => [u._id, u.count]));

  sendSuccess(
    res,
    stages.map((stage) => ({ ...stage, opportunityCount: counts[stage.key] || 0 })),
    'Pipeline stages fetched',
  );
});

// POST /pipeline-stages  { name, order?, isActive? }
exports.create = asyncHandler(async (req, res) => {
  await ensureDefaultStages();

  const name = String(req.body.name || '').trim();
  const key = toKey(req.body.key || name);

  if (!name || !/^[A-Z][A-Z0-9_]{1,49}$/.test(key)) {
    throw new ApiError(400, 'A valid stage name is required', 'INVALID_STAGE');
  }

  if (await PipelineStage.exists({ key })) {
    throw new ApiError(409, 'A stage with this name already exists', 'STAGE_EXISTS');
  }

  let order = Number(req.body.order);
  if (!Number.isFinite(order)) {
    const last = await PipelineStage.findOne().sort({ order: -1 }).select('order');
    order = (last?.order || 0) + 1;
  }

  const stage = await PipelineStage.create({
    key,
    name,
    order,
    isActive: req.body.isActive !== false,
  });

  sendSuccess(res, stage, 'Pipeline stage created', 201);
});

// PUT /pipeline-stages/:id  { name?, order?, isActive? }  (key is immutable)
exports.update = asyncHandler(async (req, res) => {
  const stage = await findStage(req.params.id);
  const { name, order, isActive } = req.body;

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed) throw new ApiError(400, 'Stage name is required', 'INVALID_STAGE');
    stage.name = trimmed;
  }

  if (order !== undefined) {
    if (!Number.isFinite(Number(order))) {
      throw new ApiError(400, 'Invalid order', 'INVALID_ORDER');
    }
    stage.order = Number(order);
  }

  if (isActive !== undefined) {
    if (isActive === false && SYSTEM_STAGES.includes(stage.key)) {
      throw new ApiError(400, 'Closed stages cannot be deactivated', 'SYSTEM_STAGE');
    }
    stage.isActive = Boolean(isActive);
  }

  await stage.save();
  sendSuccess(res, stage, 'Pipeline stage updated');
});

// PUT /pipeline-stages/reorder  { ids: [stageId, ...] }
exports.reorder = asyncHandler(async (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];

  if (!ids.length || !ids.every((id) => mongoose.isValidObjectId(id))) {
    throw new ApiError(400, 'ids must be a list of stage IDs', 'INVALID_IDS');
  }

  await PipelineStage.bulkWrite(
    ids.map((id, index) => ({
      updateOne: { filter: { _id: id }, update: { $set: { order: index + 1 } } },
    })),
  );

  sendSuccess(res, await getStages(), 'Pipeline stages reordered');
});

// DELETE /pipeline-stages/:id  (only unused, non-system stages)
exports.remove = asyncHandler(async (req, res) => {
  const stage = await findStage(req.params.id);

  if (stage.isSystem || SYSTEM_STAGES.includes(stage.key)) {
    throw new ApiError(400, 'System stages cannot be deleted', 'SYSTEM_STAGE');
  }

  if (await Opportunity.exists({ stage: stage.key })) {
    throw new ApiError(
      409,
      'Stage is used by opportunities. Deactivate it instead.',
      'STAGE_IN_USE',
    );
  }

  await stage.deleteOne();
  sendSuccess(res, null, 'Pipeline stage deleted');
});
