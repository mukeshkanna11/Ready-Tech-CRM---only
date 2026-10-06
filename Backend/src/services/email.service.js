"use strict";

const { Resend } = require("resend");

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const getFromEmail = () => {
  return (
    process.env.RESEND_FROM_EMAIL ||
    "Ready Tech CRM <onboarding@resend.dev>"
  );
};

const normalizeRecipients = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(email).trim()
  );
};

const validateEmails = (emails, fieldName) => {
  const list = normalizeRecipients(emails);

  const invalid = list.filter(
    (email) => !isValidEmail(email)
  );

  if (invalid.length) {
    const error = new Error(
      `Invalid ${fieldName}: ${invalid.join(", ")}`
    );

    error.statusCode = 400;
    error.code = "INVALID_EMAIL";

    throw error;
  }

  return list;
};

const sendEmail = async ({
  to,
  cc,
  bcc,
  replyTo,
  subject,
  html,
  text,
  from,
  attachments,
  tags,
}) => {
  if (!resend) {
    const error = new Error(
      "Resend is not configured. Please set RESEND_API_KEY."
    );

    error.statusCode = 503;
    error.code = "EMAIL_SERVICE_NOT_CONFIGURED";

    throw error;
  }

  const recipients = validateEmails(
    to,
    "recipient"
  );

  if (!recipients.length) {
    const error = new Error(
      "At least one recipient is required."
    );

    error.statusCode = 400;
    error.code = "RECIPIENT_REQUIRED";

    throw error;
  }

  if (!subject || !String(subject).trim()) {
    const error = new Error(
      "Email subject is required."
    );

    error.statusCode = 400;
    error.code = "SUBJECT_REQUIRED";

    throw error;
  }

  if (
    (!html || !String(html).trim()) &&
    (!text || !String(text).trim())
  ) {
    const error = new Error(
      "Email body is required."
    );

    error.statusCode = 400;
    error.code = "BODY_REQUIRED";

    throw error;
  }

  const payload = {
    from: from || getFromEmail(),
    to: recipients,
    subject: String(subject).trim(),
  };

  const ccRecipients = validateEmails(
    cc,
    "CC recipient"
  );

  const bccRecipients = validateEmails(
    bcc,
    "BCC recipient"
  );

  if (ccRecipients.length) {
    payload.cc = ccRecipients;
  }

  if (bccRecipients.length) {
    payload.bcc = bccRecipients;
  }

  if (replyTo) {
    const replyRecipients = validateEmails(
      replyTo,
      "reply-to recipient"
    );

    if (replyRecipients.length) {
      payload.replyTo =
        replyRecipients.length === 1
          ? replyRecipients[0]
          : replyRecipients;
    }
  }

  if (html) {
    payload.html = String(html);
  }

  if (text) {
    payload.text = String(text);
  }

  if (
    Array.isArray(attachments) &&
    attachments.length
  ) {
    payload.attachments = attachments;
  }

  if (
    Array.isArray(tags) &&
    tags.length
  ) {
    payload.tags = tags;
  }

  const { data, error } =
    await resend.emails.send(payload);

  if (error) {
    const resendError = new Error(
      error.message ||
        "Email could not be sent."
    );

    resendError.statusCode = 502;
    resendError.code =
      error.name || "RESEND_EMAIL_ERROR";

    throw resendError;
  }

  return {
    id: data?.id || null,
  };
};

module.exports = {
  sendEmail,
};