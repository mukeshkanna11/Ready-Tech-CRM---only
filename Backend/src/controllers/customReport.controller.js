'use strict';

const mongoose = require('mongoose');

const SavedReport = require('../models/SavedReport');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { authorizePermission } = require('../middleware/authorize.middleware');
const { csvCell } = require('./dataTransfer.controller');

// ======================================================
// CUSTOM REPORTS
// ======================================================
//
// Lightweight saved queries over existing CRM models.
// Sources, fields and operators are whitelisted; the
// user also needs READ permission on the source module.

const SOURCES = {
  leads: { model: 'Lead', label: 'Leads', resource: 'LEADS' },
  opportunities: { model: 'Opportunity', label: 'Opportunities', resource: 'OPPORTUNITIES' },
  contacts: { model: 'Contact', label: 'Contacts', resource: 'CONTACTS' },
  companies: { model: 'Company', label: 'Companies', resource: 'COMPANIES' },
  activities: { model: 'Activity', label: 'Activities', resource: 'ACTIVITIES' },
  tasks: { model: 'Task', label: 'Tasks', resource: 'TASKS' },
  quotations: { model: 'Quotation', label: 'Quotations', resource: 'QUOTATIONS' },
  salesOrders: { model: 'SalesOrder', label: 'Sales Orders', resource: 'QUOTATIONS' },
  invoices: { model: 'Invoice', label: 'Invoices', resource: 'INVOICES' },
  payments: { model: 'Payment', label: 'Payments', resource: 'INVOICES' },
};

const HIDDEN = /password|token|hash|secret|otp|^workspace$|^isDeleted$|^deleted|^__v$|^_id$/i;
const TYPES = ['String', 'Number', 'Date', 'Boolean', 'ObjectId'];
const OPS = {
  String: ['eq', 'ne', 'contains'],
  Number: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte'],
  Date: ['eq', 'gt', 'gte', 'lt', 'lte'],
  Boolean: ['eq', 'ne'],
  ObjectId: ['eq', 'ne'],
};
const MAX_ROWS = 1000;

const fieldCache = {};

// Top-level scalar fields of a source: { key: { type, ref } }
const fieldsOf = (sourceKey) => {
  if (fieldCache[sourceKey]) return fieldCache[sourceKey];
  // Models register themselves on require.
  require(`../models/${SOURCES[sourceKey].model}`);
  const { schema } = mongoose.model(SOURCES[sourceKey].model);
  const fields = {};

  schema.eachPath((path, type) => {
    if (path.includes('.') || HIDDEN.test(path) || !TYPES.includes(type.instance)) return;
    fields[path] = { type: type.instance, ref: type.options?.ref || null };
  });

  fieldCache[sourceKey] = fields;
  return fields;
};

const workspaceOf = (req) => req.user?.workspace || null;
const roleOf = (req) => String(req.user?.role?.name || '').toUpperCase();
const isAdmin = (req) => ['ADMIN', 'SUPER_ADMIN'].includes(roleOf(req));

const checkPermission = (req, permission) =>
  new Promise((resolve, reject) => {
    authorizePermission(permission)(req, null, (error) => (error ? reject(error) : resolve()));
  });

// ------------------------------------------------------
// Validation
// ------------------------------------------------------

const coerce = (type, value) => {
  const text = String(value ?? '').trim();
  if (type === 'Number') {
    const num = Number(text);
    if (text === '' || !Number.isFinite(num)) throw new Error('number');
    return num;
  }
  if (type === 'Date') {
    const date = new Date(text);
    if (!text || Number.isNaN(date.getTime())) throw new Error('date');
    return date;
  }
  if (type === 'Boolean') {
    if (!['true', 'false'].includes(text)) throw new Error('boolean');
    return text === 'true';
  }
  if (type === 'ObjectId') {
    if (!mongoose.isValidObjectId(text)) throw new Error('id');
    return new mongoose.Types.ObjectId(text);
  }
  return text.slice(0, 200);
};

const validateDefinition = (body = {}) => {
  const source = String(body.source || '');
  if (!SOURCES[source]) throw new ApiError(400, 'Invalid data source', 'INVALID_SOURCE');
  const fields = fieldsOf(source);

  const columns = [...new Set(Array.isArray(body.columns) ? body.columns.map(String) : [])];
  if (!columns.length) throw new ApiError(400, 'Select at least one column', 'COLUMNS_REQUIRED');
  if (columns.length > 25) throw new ApiError(400, 'Too many columns (max 25)', 'TOO_MANY_COLUMNS');
  const badColumn = columns.find((c) => !fields[c]);
  if (badColumn) throw new ApiError(400, `Invalid column: ${badColumn}`, 'INVALID_COLUMN');

  const filters = Array.isArray(body.filters) ? body.filters : [];
  if (filters.length > 10) throw new ApiError(400, 'Too many filters (max 10)', 'TOO_MANY_FILTERS');
  const cleanFilters = filters.map((f) => {
    const field = String(f?.field || '');
    const op = String(f?.op || 'eq');
    if (!fields[field]) throw new ApiError(400, `Invalid filter field: ${field}`, 'INVALID_FILTER');
    if (!OPS[fields[field].type].includes(op)) {
      throw new ApiError(400, `Operator "${op}" not allowed for ${field}`, 'INVALID_FILTER');
    }
    try {
      coerce(fields[field].type, f.value);
    } catch {
      throw new ApiError(400, `Invalid value for ${field}`, 'INVALID_FILTER');
    }
    return { field, op, value: String(f.value ?? '').trim() };
  });

  const sortField = String(body.sort?.field || 'createdAt');
  if (sortField !== 'createdAt' && !fields[sortField]) {
    throw new ApiError(400, `Invalid sort field: ${sortField}`, 'INVALID_SORT');
  }

  return {
    source,
    columns,
    filters: cleanFilters,
    sort: { field: sortField, dir: body.sort?.dir === 'asc' ? 'asc' : 'desc' },
  };
};

// ------------------------------------------------------
// Execution
// ------------------------------------------------------

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const label = (doc) => {
  if (!doc || typeof doc !== 'object') return doc ?? '';
  const person = [doc.firstName, doc.lastName].filter(Boolean).join(' ');
  return (
    doc.name || doc.title || doc.fullName || person || doc.companyName || doc.email ||
    Object.entries(doc).find(([k, v]) => /Number$/.test(k) && v)?.[1] || String(doc._id)
  );
};

const runDefinition = async (req, def) => {
  await checkPermission(req, `${SOURCES[def.source].resource}:READ`);
  const Model = mongoose.model(SOURCES[def.source].model);
  const fields = fieldsOf(def.source);
  const paths = Model.schema.paths;

  const query = {};
  if (paths.workspace) query.workspace = { $in: [workspaceOf(req), null] };
  if (paths.isDeleted) query.isDeleted = { $ne: true };

  def.filters.forEach(({ field, op, value }) => {
    const typed = coerce(fields[field].type, value);
    const cond = query[field] || (query[field] = {});
    if (op === 'contains') {
      Object.assign(cond, { $regex: escapeRegex(typed), $options: 'i' });
    } else if (op === 'eq' && fields[field].type === 'Date') {
      // Same calendar day.
      const end = new Date(typed);
      end.setHours(23, 59, 59, 999);
      typed.setHours(0, 0, 0, 0);
      Object.assign(cond, { $gte: typed, $lte: end });
    } else {
      cond[`$${op}`] = typed;
    }
  });

  const refs = def.columns.filter((c) => fields[c].ref && fields[c].ref !== 'Workspace');
  let find = Model.find(query)
    .select(def.columns.join(' '))
    .sort({ [def.sort.field]: def.sort.dir === 'asc' ? 1 : -1 })
    .limit(MAX_ROWS)
    .lean();
  refs.forEach((path) => {
    find = find.populate({ path, select: '-password -refreshTokenHash' });
  });

  const [docs, total] = await Promise.all([find, Model.countDocuments(query)]);
  const rows = docs.map((doc) =>
    Object.fromEntries(
      def.columns.map((c) => [c, refs.includes(c) ? label(doc[c]) : doc[c] ?? null]),
    ),
  );

  return { columns: def.columns, rows, total, truncated: total > rows.length };
};

const findOwn = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, 'Invalid report id', 'INVALID_ID');
  }
  const report = await SavedReport.findOne({ _id: req.params.id, workspace: workspaceOf(req) });
  if (!report) throw new ApiError(404, 'Report not found', 'NOT_FOUND');
  return report;
};

const assertCanEdit = (req, report) => {
  if (!isAdmin(req) && String(report.createdBy) !== String(req.user?._id)) {
    throw new ApiError(403, 'Only the report owner can change it', 'PERMISSION_DENIED');
  }
};

// ------------------------------------------------------
// Handlers
// ------------------------------------------------------

exports.sources = asyncHandler(async (_req, res) => {
  const data = Object.entries(SOURCES).map(([key, s]) => ({
    key,
    label: s.label,
    fields: Object.entries(fieldsOf(key)).map(([field, meta]) => ({
      key: field,
      type: meta.type,
      ops: OPS[meta.type],
    })),
  }));
  sendSuccess(res, data, 'Report sources fetched');
});

exports.list = asyncHandler(async (req, res) => {
  const reports = await SavedReport.find({ workspace: workspaceOf(req) })
    .populate('createdBy', 'name email')
    .sort({ updatedAt: -1 })
    .limit(200);
  sendSuccess(res, reports, 'Reports fetched');
});

exports.getById = asyncHandler(async (req, res) => {
  sendSuccess(res, await findOwn(req), 'Report fetched');
});

exports.create = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) throw new ApiError(400, 'Report name is required', 'NAME_REQUIRED');
  const report = await SavedReport.create({
    ...validateDefinition(req.body),
    name,
    workspace: workspaceOf(req),
    createdBy: req.user?._id || null,
  });
  sendSuccess(res, report, 'Report created', 201);
});

exports.update = asyncHandler(async (req, res) => {
  const report = await findOwn(req);
  assertCanEdit(req, report);
  const name = String(req.body?.name ?? report.name).trim();
  if (!name) throw new ApiError(400, 'Report name is required', 'NAME_REQUIRED');
  Object.assign(report, validateDefinition({ ...report.toObject(), ...req.body }), { name });
  await report.save();
  sendSuccess(res, report, 'Report updated');
});

exports.remove = asyncHandler(async (req, res) => {
  const report = await findOwn(req);
  assertCanEdit(req, report);
  await report.deleteOne();
  sendSuccess(res, null, 'Report deleted');
});

exports.preview = asyncHandler(async (req, res) => {
  sendSuccess(res, await runDefinition(req, validateDefinition(req.body)), 'Report generated');
});

exports.run = asyncHandler(async (req, res) => {
  const report = await findOwn(req);
  const result = await runDefinition(req, validateDefinition(report.toObject()));
  sendSuccess(res, { report, ...result }, 'Report generated');
});

exports.exportCsv = asyncHandler(async (req, res) => {
  await checkPermission(req, 'REPORTS:EXPORT');
  const report = await findOwn(req);
  const { columns, rows } = await runDefinition(req, validateDefinition(report.toObject()));
  const csv = [
    columns.map(csvCell).join(','),
    ...rows.map((row) => columns.map((c) => csvCell(row[c])).join(',')),
  ].join('\r\n');
  const file = report.name.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() || 'report';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${file}.csv"`);
  res.send(`﻿${csv}`);
});
