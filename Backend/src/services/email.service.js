const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const env = require('../config/env');

let resendClient;

if (env.resendApiKey) {
  resendClient = new Resend(env.resendApiKey);
}

const sendEmail = async ({ to, subject, html, text }) => {
  if (resendClient && env.resendFromEmail) {
    const { data, error } = await resendClient.emails.send({
      from: env.resendFromEmail,
      to,
      subject,
      html,
      text,
    });

    if (error) throw new Error(error.message || 'Resend email failed');
    return data;
  }

  if (env.smtpHost && env.smtpUser && env.smtpPass) {
    const transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });

    return transporter.sendMail({
      from: env.smtpFrom || env.smtpUser,
      to,
      subject,
      html,
      text,
    });
  }

  return {
    skipped: true,
    reason: 'Email provider is not configured',
  };
};

module.exports = { sendEmail };
