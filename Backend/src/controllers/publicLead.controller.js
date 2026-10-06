"use strict";

const Lead = require("../models/Lead");
const Activity = require("../models/Activity");
const User = require("../models/User");
const Company = require("../models/Company");

const asyncHandler =
  require("../utils/asyncHandler");

const ApiError =
  require("../utils/ApiError");

const {
  sendSuccess,
} = require("../utils/apiResponse");

const {
  sendEmail,
} = require("../services/email.service");
const logger =
  require("../config/logger");

const normalizeString = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).trim();
};

const normalizeEmail = (value) => {
  return normalizeString(value).toLowerCase();
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
};

const escapeHtml = (value) => {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const createPublicLead =
  asyncHandler(async (req, res) => {
    const {
      name,
      email,
      phone,
      alternatePhone,
      companyName,
      designation,
      subject,
      message,
      city,
      state,
      country,
      postalCode,
    } = req.body || {};

    // -----------------------------------------
    // REQUIRED
    // -----------------------------------------

    const cleanName =
      normalizeString(name);

    const cleanEmail =
      normalizeEmail(email);

    const cleanMessage =
      normalizeString(message);

    if (!cleanName) {
      throw new ApiError(
        400,
        "Name is required",
        "NAME_REQUIRED"
      );
    }

    if (cleanName.length < 2) {
      throw new ApiError(
        400,
        "Name must be at least 2 characters",
        "INVALID_NAME"
      );
    }

    if (!cleanEmail) {
      throw new ApiError(
        400,
        "Email is required",
        "EMAIL_REQUIRED"
      );
    }

    if (!isValidEmail(cleanEmail)) {
      throw new ApiError(
        400,
        "Invalid email address",
        "INVALID_EMAIL"
      );
    }

    if (!cleanMessage) {
      throw new ApiError(
        400,
        "Message is required",
        "MESSAGE_REQUIRED"
      );
    }

    // -----------------------------------------
    // DEFAULT CRM CONFIG
    // -----------------------------------------

    const defaultUserId =
      process.env.DEFAULT_LEAD_OWNER_USER_ID;

    const defaultCompanyId =
      process.env.DEFAULT_LEAD_COMPANY_ID;

    if (!defaultUserId) {
      throw new ApiError(
        500,
        "Default lead owner is not configured",
        "DEFAULT_LEAD_OWNER_NOT_CONFIGURED"
      );
    }

    if (!defaultCompanyId) {
      throw new ApiError(
        500,
        "Default CRM company is not configured",
        "DEFAULT_LEAD_COMPANY_NOT_CONFIGURED"
      );
    }

    const [
      defaultUser,
      defaultCompany,
    ] = await Promise.all([
      User.findById(defaultUserId)
        .select("_id name email isActive workspace")
        .lean(),

      Company.findById(defaultCompanyId)
        .select("_id name")
        .lean(),
    ]);

    if (!defaultUser) {
      throw new ApiError(
        500,
        "Default lead owner was not found",
        "DEFAULT_LEAD_OWNER_NOT_FOUND"
      );
    }

    if (!defaultUser.isActive) {
      throw new ApiError(
        500,
        "Default lead owner is inactive",
        "DEFAULT_LEAD_OWNER_INACTIVE"
      );
    }

    if (!defaultCompany) {
      throw new ApiError(
        500,
        "Default CRM company was not found",
        "DEFAULT_LEAD_COMPANY_NOT_FOUND"
      );
    }

    // -----------------------------------------
    // FIND EXISTING LEAD
    // -----------------------------------------

    // Public leads belong to the default owner's workspace.
    const workspace =
      defaultUser.workspace || null;

    let lead = await Lead.findOne({
      email: cleanEmail,
      workspace,
    });

    let isNewLead = false;

    if (lead) {
      // ---------------------------------------
      // EXISTING LEAD
      // ---------------------------------------

      // Public input only fills blank fields; it never
      // overwrites data the CRM team already has.
      const fillIfEmpty = (field, value) => {
        const clean =
          normalizeString(value);

        if (clean && !lead[field]) {
          lead[field] = clean;
        }
      };

      fillIfEmpty("phone", phone);
      fillIfEmpty("alternatePhone", alternatePhone);
      fillIfEmpty("companyName", companyName);
      fillIfEmpty("designation", designation);
      fillIfEmpty("city", city);
      fillIfEmpty("state", state);
      fillIfEmpty("country", country);
      fillIfEmpty("postalCode", postalCode);

      lead.lastContactAt =
        new Date();

      await lead.save();
    } else {
      // ---------------------------------------
      // NEW LEAD
      // ---------------------------------------

      lead = await Lead.create({
        name: cleanName,

        email: cleanEmail,

        phone:
          normalizeString(phone) ||
          undefined,

        alternatePhone:
          normalizeString(
            alternatePhone
          ) || undefined,

        companyName:
          normalizeString(
            companyName
          ) || undefined,

        designation:
          normalizeString(
            designation
          ) || undefined,

        source: "WEBSITE",

        workspace,

        status: "NEW",

        assignedTo:
          defaultUser._id,

        company:
          defaultCompany._id,

        city:
          normalizeString(city) ||
          undefined,

        state:
          normalizeString(state) ||
          undefined,

        country:
          normalizeString(country) ||
          undefined,

        postalCode:
          normalizeString(
            postalCode
          ) || undefined,

        lastContactAt:
          new Date(),

        notes:
          cleanMessage,
      });

      isNewLead = true;
    }

    // -----------------------------------------
    // EMAIL TO READY TECH
    // -----------------------------------------

    const inbox =
      process.env.CRM_INBOX_EMAIL;

    if (!inbox) {
      logger.warn(
        "CRM_INBOX_EMAIL is not configured; enquiry notification skipped"
      );
    }

    const emailSubject =
      subject
        ? `New CRM Enquiry: ${normalizeString(subject)}`
        : `New Website Enquiry - ${cleanName}`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
        <h2 style="margin-bottom:20px;">
          New Customer Enquiry
        </h2>

        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px;font-weight:bold;">Name</td>
            <td style="padding:8px;">
              ${escapeHtml(cleanName)}
            </td>
          </tr>

          <tr>
            <td style="padding:8px;font-weight:bold;">Email</td>
            <td style="padding:8px;">
              ${escapeHtml(cleanEmail)}
            </td>
          </tr>

          <tr>
            <td style="padding:8px;font-weight:bold;">Phone</td>
            <td style="padding:8px;">
              ${escapeHtml(phone || "-")}
            </td>
          </tr>

          <tr>
            <td style="padding:8px;font-weight:bold;">Company</td>
            <td style="padding:8px;">
              ${escapeHtml(companyName || "-")}
            </td>
          </tr>

          <tr>
            <td style="padding:8px;font-weight:bold;">Designation</td>
            <td style="padding:8px;">
              ${escapeHtml(designation || "-")}
            </td>
          </tr>

          <tr>
            <td style="padding:8px;font-weight:bold;">Subject</td>
            <td style="padding:8px;">
              ${escapeHtml(subject || "-")}
            </td>
          </tr>
        </table>

        <div style="margin-top:25px;">
          <h3>Customer Message</h3>

          <div style="padding:16px;background:#f5f5f5;border-radius:8px;white-space:pre-wrap;">
            ${escapeHtml(cleanMessage)}
          </div>
        </div>

        <div style="margin-top:25px;font-size:13px;color:#666;">
          ${isNewLead
            ? "A new lead was automatically created in Ready Tech CRM."
            : "An existing lead contacted Ready Tech again."}
        </div>
      </div>
    `;

    const text = `
New Customer Enquiry

Name: ${cleanName}
Email: ${cleanEmail}
Phone: ${phone || "-"}
Company: ${companyName || "-"}
Designation: ${designation || "-"}
Subject: ${subject || "-"}

Customer Message:
${cleanMessage}

CRM:
${isNewLead
  ? "New lead created automatically."
  : "Existing lead received a new enquiry."}
`;

    // The lead is already saved, so a notification failure
    // must not fail the visitor's submission.
    let emailResult = {};

    if (inbox) {
      try {
        emailResult =
          (await sendEmail({
        to: inbox,

        replyTo: cleanEmail,

        subject: emailSubject,

        html,

        text,

        tags: [
          {
            name: "source",
            value: "website",
          },
          {
            name: "crm",
            value: "lead-enquiry",
          },
        ],
      })) || {};
      } catch (error) {
        logger.error(
          "Website enquiry notification failed",
          error
        );
      }
    }

    // -----------------------------------------
    // CREATE EMAIL ACTIVITY
    // -----------------------------------------

    await Activity.create({
      workspace,

      type: "EMAIL",

      subject: emailSubject,

      description: cleanMessage,

      status: "COMPLETED",

      priority: "HIGH",

      completedAt: new Date(),

      assignedTo:
        lead.assignedTo ||
        defaultUser._id,

      createdBy:
        defaultUser._id,

      updatedBy:
        defaultUser._id,

      lead: lead._id,

      company:
        lead.company ||
        defaultCompany._id,

      emailAddress:
        cleanEmail,

      internalNotes:
        emailResult.id
          ? `Website enquiry received. Notification message ID: ${emailResult.id}`
          : "Website enquiry received. Notification email was not sent.",
    });

    // -----------------------------------------
    // RESPONSE
    // -----------------------------------------

    sendSuccess(
      res,
      {
        leadId: lead._id,

        isNewLead,

        messageId:
          emailResult.id || null,

        status: "RECEIVED",
      },
      "Your enquiry has been received successfully",
      201
    );
  });

module.exports = {
  createPublicLead,
};