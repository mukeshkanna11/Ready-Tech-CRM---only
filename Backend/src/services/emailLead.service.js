'use strict';

const Lead = require('../models/Lead');
const ApiError = require('../utils/ApiError');

/**
 * Normalize email
 */
const normalizeEmail = (value) => {
  if (!value) return '';
  return String(value).trim().toLowerCase();
};

/**
 * Clean string
 */
const cleanString = (value) => {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
};

/**
 * Extract email from:
 * "Rajesh Kumar <rajesh@abc.com>"
 * or
 * "rajesh@abc.com"
 */
const extractEmail = (value) => {
  const input = cleanString(value);

  if (!input) return '';

  const match = input.match(
    /<([^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)>/
  );

  if (match?.[1]) {
    return normalizeEmail(match[1]);
  }

  const emailMatch = input.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  return emailMatch
    ? normalizeEmail(emailMatch[0])
    : '';
};

/**
 * Extract display name from:
 * "Rajesh Kumar <rajesh@abc.com>"
 */
const extractName = (value) => {
  const input = cleanString(value);

  if (!input) {
    return '';
  }

  const match = input.match(
    /^(.+?)\s*<[^<>]+>$/
  );

  if (match?.[1]) {
    return match[1]
      .replace(/^["']|["']$/g, '')
      .trim();
  }

  return '';
};

/**
 * Extract phone number from email body.
 */
const extractPhone = (text) => {
  const body = cleanString(text);

  if (!body) {
    return '';
  }

  const match = body.match(
    /(?:phone|mobile|contact|tel|telephone)?\s*(?:number|no)?\s*[:\-]?\s*(\+?\d[\d\s().-]{8,}\d)/i
  );

  if (!match?.[1]) {
    return '';
  }

  return match[1]
    .replace(/[^\d+]/g, '')
    .trim();
};

/**
 * Extract company from common formats.
 */
const extractCompany = (text) => {
  const body = cleanString(text);

  if (!body) {
    return '';
  }

  const match = body.match(
    /(?:company|organization|organisation|business)\s*[:\-]\s*(.+)/i
  );

  if (!match?.[1]) {
    return '';
  }

  return match[1]
    .split(/\r?\n/)[0]
    .trim()
    .slice(0, 200);
};

/**
 * Extract labelled name from email body.
 */
const extractBodyName = (text) => {
  const body = cleanString(text);

  if (!body) {
    return '';
  }

  const match = body.match(
    /(?:name|full\s*name|customer\s*name)\s*[:\-]\s*(.+)/i
  );

  if (!match?.[1]) {
    return '';
  }

  return match[1]
    .split(/\r?\n/)[0]
    .trim()
    .slice(0, 200);
};

/**
 * Parse incoming email.
 */
const parseIncomingEmail = ({
  from,
  sender,
  subject,
  text,
  html,
  body,
}) => {
  const rawSender =
    from ||
    sender ||
    '';

  const email =
    extractEmail(rawSender);

  const senderName =
    extractName(rawSender);

  const emailBody =
    cleanString(
      text ||
      body ||
      ''
    );

  const name =
    extractBodyName(emailBody) ||
    senderName ||
    email.split('@')[0] ||
    'Email Lead';

  const phone =
    extractPhone(emailBody);

  const companyName =
    extractCompany(emailBody);

  return {
    name: name.slice(0, 200),
    email,
    phone: phone.slice(0, 30),
    companyName,
    source: 'EMAIL',
    status: 'NEW',
    notes: [
      subject
        ? `Subject: ${cleanString(subject)}`
        : '',
      emailBody
        ? `Email: ${emailBody}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 5000),
  };
};

/**
 * Create or update Lead from incoming email.
 *
 * Duplicate protection:
 * Email is used as the primary identifier.
 */
const createOrUpdateLeadFromEmail = async ({
  from,
  sender,
  subject,
  text,
  html,
  body,
}) => {
  const leadData =
    parseIncomingEmail({
      from,
      sender,
      subject,
      text,
      html,
      body,
    });

  if (!leadData.email) {
    throw new ApiError(
      400,
      'Sender email is required',
      'EMAIL_REQUIRED'
    );
  }

  // --------------------------------------------------
  // FIND EXISTING LEAD
  // --------------------------------------------------

  let lead =
    await Lead.findOne({
      email: leadData.email,
    });

  // --------------------------------------------------
  // EXISTING LEAD
  // --------------------------------------------------

  if (lead) {
    const update = {
      lastContactAt: new Date(),
    };

    // Add phone only if existing lead does not have one
    if (
      !lead.phone &&
      leadData.phone
    ) {
      update.phone =
        leadData.phone;
    }

    // Add company only if missing
    if (
      !lead.companyName &&
      leadData.companyName
    ) {
      update.companyName =
        leadData.companyName;
    }

    // Add email communication to notes
    if (leadData.notes) {
      const existingNotes =
        cleanString(lead.notes);

      update.notes =
        [
          existingNotes,
          leadData.notes,
        ]
          .filter(Boolean)
          .join('\n\n---\n\n')
          .slice(-5000);
    }

    lead =
      await Lead.findByIdAndUpdate(
        lead._id,
        {
          $set: update,
        },
        {
          new: true,
          runValidators: true,
        }
      );

    await lead.populate(
      'assignedTo company contact convertedOpportunity'
    );

    return {
      lead,
      created: false,
    };
  }

  // --------------------------------------------------
  // CREATE NEW LEAD
  // --------------------------------------------------

  try {
    lead =
      await Lead.create(
        leadData
      );
  } catch (error) {
    // Race-condition protection:
    // another request may have created the same email.
    if (error?.code === 11000) {
      lead =
        await Lead.findOne({
          email: leadData.email,
        });

      if (!lead) {
        throw error;
      }

      return {
        lead,
        created: false,
      };
    }

    throw error;
  }

  await lead.populate(
    'assignedTo company contact convertedOpportunity'
  );

  return {
    lead,
    created: true,
  };
};

module.exports = {
  parseIncomingEmail,
  createOrUpdateLeadFromEmail,
};