'use strict';

const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const Company = require('../models/Company');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { LEAD_STATUSES } = require('../utils/constants');
const { isValidLeadSource } = require('./leadSource.controller');
const { authorizePermission } = require('../middleware/authorize.middleware');

// ======================================================
// CSV IMPORT / EXPORT for Leads, Contacts, Companies
// ======================================================

const MAX_IMPORT_ROWS = 2000;
const MAX_EXPORT_ROWS = 10000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const workspaceOf = (req) => req.user?.workspace || null;

// Minimal RFC 4180 parser: quoted fields, escaped quotes, CRLF/LF.
const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const input = String(text || '').replace(/^﻿/, '');

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => String(cell).trim() !== ''));
};

const csvCell = (value) => {
  if (value === undefined || value === null) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const headerKey = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// column: CSV header, path: export getter, field: import target.
const ENTITIES = {
  leads: {
    Model: Lead,
    resource: 'LEADS',
    columns: [
      ['Name', 'name'],
      ['Email', 'email'],
      ['Phone', 'phone'],
      ['Company Name', 'companyName'],
      ['Designation', 'designation'],
      ['Source', 'source'],
      ['Status', 'status'],
      ['Value', 'value'],
      ['City', 'city'],
      ['State', 'state'],
      ['Country', 'country'],
      ['Tags', 'tags'],
      ['Notes', 'notes'],
      ['Created At', 'createdAt'],
    ],
    // Leads carry a workspace; legacy untagged leads are included.
    exportFilter: (req) => ({ workspace: { $in: [workspaceOf(req), null] } }),
    duplicateFilter: (doc, req) =>
      doc.email ? { email: doc.email, workspace: { $in: [workspaceOf(req), null] } } : null,
    required: ['name'],
    prepare: async (doc, req) => {
      const errors = [];
      doc.source = doc.source ? String(doc.source).trim().toUpperCase().replace(/\s+/g, '_') : 'IMPORT';
      if (!(await isValidLeadSource(doc.source, workspaceOf(req)))) {
        errors.push(`Unknown source "${doc.source}"`);
      }
      if (doc.status) {
        doc.status = String(doc.status).trim().toUpperCase();
        if (!LEAD_STATUSES.includes(doc.status)) errors.push(`Invalid status "${doc.status}"`);
        if (doc.status === 'LOST' && !doc.lostReason) doc.lostReason = 'Imported';
      }
      if (doc.value !== undefined) {
        const value = Number(String(doc.value).replace(/[, ]/g, ''));
        if (Number.isNaN(value) || value < 0) errors.push('Value must be a positive number');
        else doc.value = value;
      }
      if (doc.tags !== undefined) {
        doc.tags = String(doc.tags).split(/[;|]/).map((t) => t.trim()).filter(Boolean);
      }
      doc.workspace = workspaceOf(req);
      return errors;
    },
  },

  contacts: {
    Model: Contact,
    resource: 'CONTACTS',
    columns: [
      ['First Name', 'firstName'],
      ['Last Name', 'lastName'],
      ['Email', 'email'],
      ['Phone', 'phone'],
      ['Designation', 'designation'],
      ['Department', 'department'],
      ['Source', 'source'],
      ['Status', 'status'],
      ['City', 'city'],
      ['State', 'state'],
      ['Country', 'country'],
      ['Notes', 'notes'],
      ['Created At', 'createdAt'],
    ],
    exportFilter: () => ({}),
    duplicateFilter: (doc) => (doc.email ? { email: doc.email } : null),
    required: ['firstName'],
    prepare: async (doc) => {
      const errors = [];
      if (doc.status) {
        doc.status = String(doc.status).trim().toUpperCase();
        if (!['ACTIVE', 'INACTIVE'].includes(doc.status)) errors.push(`Invalid status "${doc.status}"`);
      }
      if (!doc.source) doc.source = 'IMPORT';
      return errors;
    },
  },

  companies: {
    Model: Company,
    resource: 'COMPANIES',
    columns: [
      ['Name', 'name'],
      ['Email', 'email'],
      ['Phone', 'phone'],
      ['Website', 'website'],
      ['Industry', 'industry'],
      ['GSTIN', 'gstin'],
      ['Description', 'description'],
      ['Status', 'status'],
      ['Created At', 'createdAt'],
    ],
    exportFilter: () => ({ isDeleted: { $ne: true } }),
    duplicateFilter: (doc) => ({
      name: { $regex: `^${doc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      isDeleted: { $ne: true },
    }),
    required: ['name'],
    prepare: async (doc, req) => {
      doc.source = 'IMPORT';
      if (doc.status) doc.status = String(doc.status).trim().toUpperCase();
      doc.createdBy = req.user?._id;
      return [];
    },
  },
};

const entityOf = (req) => {
  const entity = ENTITIES[req.params.entity];
  if (!entity) throw new ApiError(404, 'Unsupported record type', 'UNSUPPORTED_ENTITY');
  return entity;
};

// Permission is per record type: export = READ, import = CREATE.
const requireEntityPermission = (action) => (req, res, next) => {
  const entity = ENTITIES[req.params.entity];
  if (!entity) return next(new ApiError(404, 'Unsupported record type', 'UNSUPPORTED_ENTITY'));
  return authorizePermission(`${entity.resource}:${action}`)(req, res, next);
};

// GET /data/:entity/export
const exportCsv = asyncHandler(async (req, res) => {
  const entity = entityOf(req);
  const filter = entity.exportFilter(req);

  if (req.params.entity === 'leads') {
    if (req.query.source) filter.source = String(req.query.source);
    if (req.query.status) filter.status = String(req.query.status);
  }

  const records = await entity.Model.find(filter)
    .sort({ createdAt: -1 })
    .limit(MAX_EXPORT_ROWS)
    .lean();

  const lines = [
    entity.columns.map(([header]) => csvCell(header)).join(','),
    ...records.map((record) =>
      entity.columns
        .map(([, field]) => {
          const value = record[field];
          return csvCell(Array.isArray(value) ? value.join('; ') : value);
        })
        .join(','),
    ),
  ];

  const date = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.entity}-${date}.csv"`);
  res.send(`﻿${lines.join('\r\n')}`);
});

// GET /data/:entity/template
const templateCsv = asyncHandler(async (req, res) => {
  const entity = entityOf(req);
  const headers = entity.columns.filter(([, field]) => field !== 'createdAt').map(([h]) => h);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${req.params.entity}-template.csv"`);
  res.send(`${headers.join(',')}\r\n`);
});

// POST /data/:entity/import?dryRun=true  { csv }
// Every row is validated on its own; valid rows are saved, invalid rows are reported.
const importCsv = asyncHandler(async (req, res) => {
  const entity = entityOf(req);
  const dryRun = String(req.query.dryRun) === 'true';
  const rows = parseCsv(req.body?.csv);

  if (rows.length < 2) throw new ApiError(400, 'CSV must have a header row and at least one data row', 'EMPTY_CSV');
  if (rows.length - 1 > MAX_IMPORT_ROWS) {
    throw new ApiError(400, `Import is limited to ${MAX_IMPORT_ROWS} rows per file`, 'TOO_MANY_ROWS');
  }

  const fieldByHeader = Object.fromEntries(
    entity.columns.map(([header, field]) => [headerKey(header), field]),
  );
  // Also accept the raw field name as a header (e.g. "companyName").
  entity.columns.forEach(([, field]) => { fieldByHeader[headerKey(field)] = field; });

  const fields = rows[0].map((header) => fieldByHeader[headerKey(header)] || null);
  const missing = entity.required.filter((field) => !fields.includes(field));
  if (missing.length) {
    throw new ApiError(400, `Missing required column(s): ${missing.join(', ')}`, 'MISSING_COLUMNS');
  }

  const seen = new Set();
  const result = { total: rows.length - 1, created: 0, failed: [], dryRun };

  for (let index = 1; index < rows.length; index += 1) {
    const rowNumber = index + 1; // spreadsheet row (header is row 1)
    const doc = {};

    rows[index].forEach((cell, col) => {
      const field = fields[col];
      const value = String(cell ?? '').trim();
      if (field && field !== 'createdAt' && value !== '') doc[field] = value;
    });

    const errors = entity.required
      .filter((field) => !doc[field])
      .map((field) => `${field} is required`);

    if (doc.email) {
      doc.email = doc.email.toLowerCase();
      if (!EMAIL_PATTERN.test(doc.email)) errors.push(`Invalid email "${doc.email}"`);
    }

    if (!errors.length) errors.push(...(await entity.prepare(doc, req)));

    if (!errors.length) {
      const dupKey = (doc.email || doc.name || '').toLowerCase();
      const dupFilter = entity.duplicateFilter(doc, req);
      if (dupKey && seen.has(dupKey)) errors.push('Duplicate of an earlier row in this file');
      else if (dupFilter && (await entity.Model.exists(dupFilter))) errors.push('A matching record already exists');
      if (dupKey) seen.add(dupKey);
    }

    if (!errors.length) {
      try {
        const record = new entity.Model(doc);
        if (dryRun) await record.validate();
        else await record.save();
        result.created += 1;
      } catch (error) {
        errors.push(
          ...(error.errors
            ? Object.values(error.errors).map((e) => e.message)
            : [error.message]),
        );
      }
    }

    if (errors.length) result.failed.push({ row: rowNumber, errors });
  }

  sendSuccess(
    res,
    result,
    dryRun
      ? `${result.created} row(s) valid, ${result.failed.length} with errors`
      : `${result.created} record(s) imported, ${result.failed.length} failed`,
  );
});

module.exports = {
  exportCsv,
  templateCsv,
  importCsv,
  requireEntityPermission,
  parseCsv,
  csvCell,
};
