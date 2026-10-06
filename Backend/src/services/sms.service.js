'use strict';

// ======================================================
// SMS / WHATSAPP PROVIDER (Twilio REST API, no SDK)
// ======================================================
//
// All provider-specific code lives here. Configure with:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
//   TWILIO_SMS_FROM            e.g. +15551234567 (or a Messaging Service SID "MG...")
//   TWILIO_WHATSAPP_FROM       e.g. +14155238886 (WhatsApp-enabled sender)
//   SMS_DEFAULT_COUNTRY_CODE   optional, e.g. +91, used for numbers without "+"

const PROVIDER = 'TWILIO';

const serviceError = (message, statusCode, code) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

// Returns an E.164 number or throws 400.
const normalizePhone = (value) => {
  let phone = String(value || '').replace(/[\s().-]/g, '');

  if (!phone.startsWith('+')) {
    const countryCode = String(process.env.SMS_DEFAULT_COUNTRY_CODE || '').trim();
    if (!countryCode) {
      throw serviceError(
        'Phone number must include a country code, e.g. +919876543210',
        400,
        'INVALID_PHONE',
      );
    }
    phone = `${countryCode.startsWith('+') ? countryCode : `+${countryCode}`}${phone.replace(/^0+/, '')}`;
  }

  if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
    throw serviceError(`Invalid phone number "${value}"`, 400, 'INVALID_PHONE');
  }

  return phone;
};

const getConfig = (channel) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = channel === 'WHATSAPP' ? process.env.TWILIO_WHATSAPP_FROM : process.env.TWILIO_SMS_FROM;

  if (!sid || !token || !from) {
    throw serviceError(
      `${channel === 'WHATSAPP' ? 'WhatsApp' : 'SMS'} is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and ${
        channel === 'WHATSAPP' ? 'TWILIO_WHATSAPP_FROM' : 'TWILIO_SMS_FROM'
      }.`,
      503,
      'MESSAGING_NOT_CONFIGURED',
    );
  }

  return { sid, token, from };
};

const isConfigured = (channel) => {
  try {
    getConfig(channel);
    return true;
  } catch {
    return false;
  }
};

// channel: 'SMS' | 'WHATSAPP'. Resolves { id, to, provider } or throws.
const sendMessage = async ({ channel, to, body }) => {
  const { sid, token, from } = getConfig(channel);
  const phone = normalizePhone(to);
  const text = String(body || '').trim();

  if (!text) throw serviceError('Message is required', 400, 'BODY_REQUIRED');
  if (text.length > 1600) throw serviceError('Message cannot exceed 1600 characters', 400, 'BODY_TOO_LONG');

  const params = new URLSearchParams({ Body: text });
  if (channel === 'WHATSAPP') {
    params.set('To', `whatsapp:${phone}`);
    params.set('From', from.startsWith('whatsapp:') ? from : `whatsapp:${from}`);
  } else {
    params.set('To', phone);
    params.set(from.startsWith('MG') ? 'MessagingServiceSid' : 'From', from);
  }

  let response;
  try {
    response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    throw serviceError(`Messaging provider unreachable: ${error.message}`, 502, 'PROVIDER_UNREACHABLE');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw serviceError(data.message || `Messaging provider error (${response.status})`, 502, 'PROVIDER_ERROR');
  }

  return { id: data.sid || null, to: phone, provider: PROVIDER };
};

module.exports = {
  sendMessage,
  normalizePhone,
  isConfigured,
};
