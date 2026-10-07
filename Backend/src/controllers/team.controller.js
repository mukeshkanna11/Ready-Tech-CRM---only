'use strict';

const mongoose = require('mongoose');

const { Team, Territory } = require('../models/Team');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');

// ======================================================
// TEAMS & TERRITORIES (workspace scoped)
// ======================================================

const workspaceOf = (req) => req.user?.workspace || null;
const USER_FIELDS = 'name email avatar';

const toIds = (value, label) => {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  const ids = [...new Set(list.map(String))];
  if (ids.some((id) => !mongoose.isValidObjectId(id))) {
    throw new ApiError(400, `Invalid ${label}`, 'INVALID_ID');
  }
  return ids;
};

// Members/manager must be users of the same workspace.
const assertUsers = async (ids, workspace) => {
  if (!ids.length) return;
  const count = await User.countDocuments({ _id: { $in: ids }, workspace });
  if (count !== ids.length) {
    throw new ApiError(400, 'One or more users are not in your workspace', 'INVALID_USERS');
  }
};

const buildBody = async (req, isTerritory, partial) => {
  const workspace = workspaceOf(req);
  const body = {};
  const src = req.body || {};

  if (!partial || src.name !== undefined) {
    const name = String(src.name || '').trim();
    if (!name) throw new ApiError(400, 'Name is required', 'NAME_REQUIRED');
    const Model = isTerritory ? Territory : Team;
    const clash = await Model.exists({
      workspace,
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      ...(req.params.id ? { _id: { $ne: req.params.id } } : {}),
    });
    if (clash) throw new ApiError(409, `"${name}" already exists`, 'DUPLICATE_NAME');
    body.name = name;
  }
  if (src.description !== undefined) body.description = String(src.description || '');

  if (src.members !== undefined) {
    body.members = toIds(src.members, 'members');
    await assertUsers(body.members, workspace);
  }

  if (!isTerritory && src.manager !== undefined) {
    body.manager = src.manager ? toIds(src.manager, 'manager')[0] : null;
    if (body.manager) await assertUsers([body.manager], workspace);
  }

  if (isTerritory) {
    if (src.region !== undefined) body.region = String(src.region || '');
    if (src.teams !== undefined) {
      body.teams = toIds(src.teams, 'teams');
      const count = await Team.countDocuments({ _id: { $in: body.teams }, workspace });
      if (count !== body.teams.length) {
        throw new ApiError(400, 'One or more teams are not in your workspace', 'INVALID_TEAMS');
      }
    }
  }

  return body;
};

const crud = (Model, isTerritory) => {
  const label = isTerritory ? 'Territory' : 'Team';
  const populate = (query) => {
    query.populate('members', USER_FIELDS);
    if (isTerritory) query.populate('teams', 'name members');
    else query.populate('manager', USER_FIELDS);
    return query;
  };

  const findOwn = async (req) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      throw new ApiError(400, `Invalid ${label.toLowerCase()} id`, 'INVALID_ID');
    }
    const doc = await populate(
      Model.findOne({ _id: req.params.id, workspace: workspaceOf(req) }),
    );
    if (!doc) throw new ApiError(404, `${label} not found`, 'NOT_FOUND');
    return doc;
  };

  return {
    list: asyncHandler(async (req, res) => {
      const filter = { workspace: workspaceOf(req) };
      const search = String(req.query.search || '').trim();
      if (search) {
        filter.name = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      }
      const items = await populate(Model.find(filter).sort({ name: 1 }).limit(500));
      sendSuccess(res, items, `${label}s fetched`);
    }),

    getById: asyncHandler(async (req, res) => {
      sendSuccess(res, await findOwn(req), `${label} fetched`);
    }),

    create: asyncHandler(async (req, res) => {
      const body = await buildBody(req, isTerritory, false);
      const doc = await Model.create({
        ...body,
        workspace: workspaceOf(req),
        createdBy: req.user?._id || null,
      });
      sendSuccess(res, await populate(Model.findById(doc._id)), `${label} created`, 201);
    }),

    update: asyncHandler(async (req, res) => {
      const doc = await findOwn(req);
      Object.assign(doc, await buildBody(req, isTerritory, true));
      await doc.save();
      sendSuccess(res, await populate(Model.findById(doc._id)), `${label} updated`);
    }),

    remove: asyncHandler(async (req, res) => {
      const doc = await findOwn(req);
      await doc.deleteOne();
      if (!isTerritory) {
        await Territory.updateMany({ teams: doc._id }, { $pull: { teams: doc._id } });
      }
      sendSuccess(res, null, `${label} deleted`);
    }),
  };
};

exports.team = crud(Team, false);
exports.territory = crud(Territory, true);

// ======================================================
// ANALYTICS SCOPE HELPER
// ======================================================
//
// Resolves ?owner, ?team, ?territory query params to a
// list of user ObjectIds (null = no user restriction).
// Used by reports and the forecast.

exports.resolveOwnerIds = async (req) => {
  const { owner, team, territory } = req.query;
  let ids = null;

  const intersect = (next) => {
    const set = next.map(String);
    ids = ids === null ? set : ids.filter((id) => set.includes(id));
  };

  if (owner) intersect(toIds(owner, 'owner'));

  if (team) {
    const [teamId] = toIds(team, 'team');
    const doc = await Team.findOne({ _id: teamId, workspace: workspaceOf(req) }).lean();
    if (!doc) throw new ApiError(404, 'Team not found', 'NOT_FOUND');
    intersect([...(doc.members || []), ...(doc.manager ? [doc.manager] : [])]);
  }

  if (territory) {
    const [territoryId] = toIds(territory, 'territory');
    const doc = await Territory.findOne({
      _id: territoryId,
      workspace: workspaceOf(req),
    }).lean();
    if (!doc) throw new ApiError(404, 'Territory not found', 'NOT_FOUND');
    const teams = await Team.find({ _id: { $in: doc.teams || [] } }).lean();
    intersect([
      ...(doc.members || []),
      ...teams.flatMap((t) => [...(t.members || []), ...(t.manager ? [t.manager] : [])]),
    ]);
  }

  return ids === null ? null : ids.map((id) => new mongoose.Types.ObjectId(id));
};
