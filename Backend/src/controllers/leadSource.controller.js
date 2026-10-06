'use strict';

const mongoose = require('mongoose');

const LeadSource = require('../models/LeadSource');
const Lead = require('../models/Lead');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { LEAD_SOURCES } = require('../utils/constants');

const toKey = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);

const workspaceOf = (req) => req.user?.workspace || null;

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Duplicate = same key (built-in or custom) or same name, case-insensitive.
const assertUnique = async (workspace, { key, name }, excludeId = null) => {
  if (key && LEAD_SOURCES.includes(key)) {
    throw new ApiError(409, 'A built-in source with this name exists', 'SOURCE_EXISTS');
  }

  const or = [{ name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } }];
  if (key) or.push({ key });

  const exists = await LeadSource.exists({
    workspace,
    $or: or,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });

  if (exists) {
    throw new ApiError(409, 'A source with this name already exists', 'SOURCE_EXISTS');
  }
};

const findSource = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, 'Invalid source ID', 'INVALID_ID');
  }

  const source = await LeadSource.findOne({
    _id: req.params.id,
    workspace: workspaceOf(req),
  });

  if (!source) throw new ApiError(404, 'Source not found', 'SOURCE_NOT_FOUND');

  return source;
};

// Used by lead create/update: built-in or a source of the user's workspace.
const isValidLeadSource = async (key, workspace) =>
  LEAD_SOURCES.includes(key) ||
  Boolean(await LeadSource.exists({ workspace, key }));

// GET /leads/sources?active=true
const list = asyncHandler(async (req, res) => {
  const workspace = workspaceOf(req);
  const filter = { workspace };
  if (req.query.active === 'true') filter.isActive = true;

  const sources = await LeadSource.find(filter).sort({ name: 1 }).lean();

  const usage = await Lead.aggregate([
    { $match: { workspace: { $in: [workspace, null] }, source: { $in: sources.map((s) => s.key) } } },
    { $group: { _id: '$source', count: { $sum: 1 } } },
  ]);
  const counts = Object.fromEntries(usage.map((u) => [u._id, u.count]));

  sendSuccess(
    res,
    sources.map((source) => ({ ...source, leadCount: counts[source.key] || 0 })),
    'Lead sources fetched',
  );
});

// POST /leads/sources  { name, isActive? }
const create = asyncHandler(async (req, res) => {
  const workspace = workspaceOf(req);
  const name = String(req.body.name || '').trim();
  const key = toKey(name);

  if (!name || !/^[A-Z][A-Z0-9_]{1,49}$/.test(key)) {
    throw new ApiError(
      400,
      'Source name must start with a letter and be at least 2 characters',
      'INVALID_SOURCE',
    );
  }

  await assertUnique(workspace, { key, name });

  const source = await LeadSource.create({
    workspace,
    key,
    name,
    isActive: req.body.isActive !== false,
    createdBy: req.user?._id || null,
  });

  sendSuccess(res, source, 'Lead source created', 201);
});

// PUT /leads/sources/:id  { name?, isActive? }  (key is immutable)
const update = asyncHandler(async (req, res) => {
  const source = await findSource(req);
  const { name, isActive } = req.body;

  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed) throw new ApiError(400, 'Source name is required', 'INVALID_SOURCE');

    await assertUnique(source.workspace, { name: trimmed }, source._id);
    source.name = trimmed;
  }

  if (isActive !== undefined) source.isActive = Boolean(isActive);

  await source.save();
  sendSuccess(res, source, 'Lead source updated');
});

// DELETE /leads/sources/:id  (only if no lead uses it)
const remove = asyncHandler(async (req, res) => {
  const source = await findSource(req);

  // Leads created before workspace tagging have no workspace; count them too.
  if (await Lead.exists({ workspace: { $in: [source.workspace, null] }, source: source.key })) {
    throw new ApiError(
      409,
      'Source is used by leads. Deactivate it instead.',
      'SOURCE_IN_USE',
    );
  }

  await source.deleteOne();
  sendSuccess(res, null, 'Lead source deleted');
});

module.exports = {
  list,
  create,
  update,
  remove,
  isValidLeadSource,
};
