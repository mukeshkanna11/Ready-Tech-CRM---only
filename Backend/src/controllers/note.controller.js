'use strict';

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Note = require('../models/Note');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { uploadDir } = require('../middleware/upload.middleware');

// Record types a note can be linked to.
const LINKS = {
  lead: 'Lead',
  contact: 'Contact',
  company: 'Company',
  opportunity: 'Opportunity',
  quotation: 'Quotation',
  invoice: 'Invoice',
};

const MAX_ATTACHMENTS = 20;
const POPULATE = { path: 'author attachments.uploadedBy', select: 'name email' };

const workspaceOf = (req) => req.user?.workspace || null;

const removeFiles = (files = []) =>
  files.forEach((file) => {
    const name = path.basename(file.filename || '');
    if (name) fs.unlink(path.join(uploadDir, name), () => {});
  });

const loadNote = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new ApiError(400, 'Invalid note ID', 'INVALID_ID');
  }

  const note = await Note.findOne({ _id: req.params.id, workspace: workspaceOf(req) });
  if (!note) throw new ApiError(404, 'Note not found', 'NOTE_NOT_FOUND');

  return note;
};

const cleanContent = (value) => {
  const content = String(value || '').trim();
  if (!content) throw new ApiError(400, 'Note content is required', 'CONTENT_REQUIRED');
  return content;
};

// GET /notes?lead=&contact=&company=&opportunity=
exports.list = asyncHandler(async (req, res) => {
  const filter = { workspace: workspaceOf(req) };

  Object.keys(LINKS).forEach((field) => {
    const value = req.query[field];
    if (!value) return;
    if (!mongoose.isValidObjectId(value)) {
      throw new ApiError(400, `Invalid ${field}`, 'INVALID_ID');
    }
    filter[field] = value;
  });

  const notes = await Note.find(filter).sort({ createdAt: -1 }).limit(500).populate(POPULATE);

  sendSuccess(res, notes, 'Notes fetched successfully');
});

exports.getById = asyncHandler(async (req, res) => {
  const note = await loadNote(req);
  await note.populate(POPULATE);
  sendSuccess(res, note, 'Note fetched successfully');
});

// POST /notes  { content, lead|contact|company|opportunity|quotation|invoice }
exports.create = asyncHandler(async (req, res) => {
  const data = {
    content: cleanContent(req.body.content),
    author: req.user._id,
    workspace: workspaceOf(req),
  };

  for (const [field, modelName] of Object.entries(LINKS)) {
    const value = req.body[field];
    if (!value) continue;

    if (
      !mongoose.isValidObjectId(value) ||
      !(await mongoose.model(modelName).exists({ _id: value }))
    ) {
      throw new ApiError(400, `Linked ${field} not found`, 'INVALID_LINK');
    }

    data[field] = value;
  }

  if (!Object.keys(LINKS).some((field) => data[field])) {
    throw new ApiError(400, 'A note must be linked to a CRM record', 'LINK_REQUIRED');
  }

  const note = await Note.create(data);
  await note.populate(POPULATE);
  sendSuccess(res, note, 'Note created successfully', 201);
});

// PUT /notes/:id  { content }  (links are fixed after creation)
exports.update = asyncHandler(async (req, res) => {
  const note = await loadNote(req);
  note.content = cleanContent(req.body.content);
  await note.save();
  await note.populate(POPULATE);
  sendSuccess(res, note, 'Note updated successfully');
});

exports.remove = asyncHandler(async (req, res) => {
  const note = await loadNote(req);
  await note.deleteOne();
  removeFiles(note.attachments);
  sendSuccess(res, null, 'Note deleted successfully');
});

// Runs before the upload so files are never written for a missing note.
exports.loadForUpload = asyncHandler(async (req, _res, next) => {
  req.note = await loadNote(req);
  next();
});

// POST /notes/:id/attachments  (multipart field: files)
exports.addAttachments = asyncHandler(async (req, res) => {
  const note = req.note;
  const files = req.files || [];

  if (!files.length) throw new ApiError(400, 'No files uploaded', 'FILES_REQUIRED');

  if (note.attachments.length + files.length > MAX_ATTACHMENTS) {
    removeFiles(files);
    throw new ApiError(400, `A note can have at most ${MAX_ATTACHMENTS} files`, 'TOO_MANY_FILES');
  }

  files.forEach((file) =>
    note.attachments.push({
      name: file.originalname,
      filename: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      uploadedBy: req.user._id,
    }),
  );

  await note.save();
  await note.populate(POPULATE);
  sendSuccess(res, note, 'Attachments uploaded successfully', 201);
});

const findAttachment = (note, attachmentId) => {
  const attachment = note.attachments.id(attachmentId);
  if (!attachment) throw new ApiError(404, 'Attachment not found', 'ATTACHMENT_NOT_FOUND');
  return attachment;
};

// GET /notes/:id/attachments/:attachmentId
exports.downloadAttachment = asyncHandler(async (req, res) => {
  const note = await loadNote(req);
  const attachment = findAttachment(note, req.params.attachmentId);
  const filePath = path.join(uploadDir, path.basename(attachment.filename));

  if (!fs.existsSync(filePath)) {
    throw new ApiError(404, 'File is no longer available', 'FILE_MISSING');
  }

  res.download(filePath, attachment.name);
});

// DELETE /notes/:id/attachments/:attachmentId
exports.removeAttachment = asyncHandler(async (req, res) => {
  const note = await loadNote(req);
  const attachment = findAttachment(note, req.params.attachmentId);

  attachment.deleteOne();
  await note.save();
  removeFiles([attachment]);

  await note.populate(POPULATE);
  sendSuccess(res, note, 'Attachment deleted successfully');
});
