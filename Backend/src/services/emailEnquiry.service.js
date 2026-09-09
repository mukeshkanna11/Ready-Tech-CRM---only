'use strict';

const Lead = require('../models/Lead');
const ApiError = require('../utils/ApiError');
const { sendEmail } = require('./email.service');

const normalizeEmail = (value) => {
  if (!value) return '';
  return String(value).trim().toLowerCase();
};

const cleanString = (value, maxLength = 5000) => {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim().slice(0, maxLength);
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const createOrUpdateLeadFromEnquiry = async ({
  name,
  email,
  phone,
  companyName,
  message,
}) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new ApiError(
      400,
      'Email is required',
      'EMAIL_REQUIRED'
    );
  }

  if (!isValidEmail(normalizedEmail)) {
    throw new ApiError(
      400,
      'Please provide a valid email address',
      'INVALID_EMAIL'
    );
  }

  const cleanName = cleanString(name, 200);

  if (!cleanName || cleanName.length < 2) {
    throw new ApiError(
      400,
      'Name must contain at least 2 characters',
      'INVALID_NAME'
    );
  }

  const cleanPhone = cleanString(phone, 30);
  const cleanCompany = cleanString(companyName, 200);
  const cleanMessage = cleanString(message, 5000);

  let lead = await Lead.findOne({
    email: normalizedEmail,
  });

  let created = false;

  // --------------------------------------------------
  // EXISTING LEAD
  // --------------------------------------------------

  if (lead) {
    const update = {
      lastContactAt: new Date(),
    };

    if (!lead.phone && cleanPhone) {
      update.phone = cleanPhone;
    }

    if (!lead.companyName && cleanCompany) {
      update.companyName = cleanCompany;
    }

    if (cleanMessage) {
      const enquiryNote = [
        'Website Enquiry:',
        cleanMessage,
      ].join('\n');

      const existingNotes = cleanString(
        lead.notes,
        5000
      );

      update.notes = [
        existingNotes,
        enquiryNote,
      ]
        .filter(Boolean)
        .join('\n\n---\n\n')
        .slice(-5000);
    }

    lead = await Lead.findByIdAndUpdate(
      lead._id,
      {
        $set: update,
      },
      {
        new: true,
        runValidators: true,
      }
    );
  }

  // --------------------------------------------------
  // CREATE NEW LEAD
  // --------------------------------------------------

  if (!lead) {
    const notes = cleanMessage
      ? `Website Enquiry:\n${cleanMessage}`
      : 'Website enquiry received';

    try {
      lead = await Lead.create({
        name: cleanName,
        email: normalizedEmail,
        phone: cleanPhone,
        companyName: cleanCompany,
        source: 'EMAIL',
        status: 'NEW',
        notes,
        lastContactAt: new Date(),
      });

      created = true;
    } catch (error) {
      // Race-condition protection
      if (error?.code === 11000) {
        lead = await Lead.findOne({
          email: normalizedEmail,
        });

        if (!lead) {
          throw error;
        }

        created = false;
      } else {
        throw error;
      }
    }
  }

  await lead.populate(
    'assignedTo company contact convertedOpportunity'
  );

  return {
    lead,
    created,
  };
};

// --------------------------------------------------
// SEND ENQUIRY EMAIL TO COMPANY
// --------------------------------------------------

const sendEnquiryNotification = async ({
  name,
  email,
  phone,
  companyName,
  message,
  lead,
}) => {
  const subject = `New Website Enquiry - ${name}`;

  const safeMessage = cleanString(message, 5000);

  const text = `
New Website Enquiry

Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
Company: ${companyName || 'Not provided'}

Message:
${safeMessage || 'No message provided'}

Lead ID: ${lead?._id || 'N/A'}
Lead Source: WEBSITE
Lead Status: ${lead?.status || 'NEW'}
`.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>New Website Enquiry</h2>

      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
      <p><strong>Company:</strong> ${companyName || 'Not provided'}</p>

      <hr />

      <h3>Message</h3>
      <p style="white-space: pre-line;">
        ${safeMessage || 'No message provided'}
      </p>

      <hr />

      <p><strong>Lead ID:</strong> ${lead?._id || 'N/A'}</p>
      <p><strong>Lead Source:</strong> WEBSITE</p>
      <p><strong>Lead Status:</strong> ${lead?.status || 'NEW'}</p>
    </div>
  `;

  return sendEmail({
    to: 'quries.readytechsolutions@gmail.com',
    subject,
    html,
    text,
  });
};

module.exports = {
  createOrUpdateLeadFromEnquiry,
  sendEnquiryNotification,
};