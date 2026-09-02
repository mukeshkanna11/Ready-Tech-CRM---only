'use strict';

const dotenv = require('dotenv');

dotenv.config();


// ======================================================
// HELPERS
// ======================================================

const getString = (
  key,
  fallback = ''
) => {
  const value = process.env[key];

  if (
    value === undefined ||
    value === null
  ) {
    return fallback;
  }

  return String(value).trim();
};


const getNumber = (
  key,
  fallback
) => {
  const value = Number(
    process.env[key]
  );

  return Number.isFinite(value)
    ? value
    : fallback;
};


const getBoolean = (
  key,
  fallback = false
) => {
  const value =
    process.env[key];

  if (
    value === undefined
  ) {
    return fallback;
  }

  return (
    String(value)
      .trim()
      .toLowerCase() ===
    'true'
  );
};


// ======================================================
// REQUIRED ENVIRONMENT VARIABLES
// ======================================================

const required = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
];

for (const key of required) {
  if (
    !process.env[key] ||
    !String(process.env[key]).trim()
  ) {
    throw new Error(
      `Missing required environment variable: ${key}`
    );
  }
}


// ======================================================
// ENVIRONMENT
// ======================================================

const nodeEnv =
  getString(
    'NODE_ENV',
    'development'
  ).toLowerCase();


// ======================================================
// ENV CONFIG
// ======================================================

const env = {

  // ----------------------------------------------
  // Application
  // ----------------------------------------------

  nodeEnv,

  isDevelopment:
    nodeEnv === 'development',

  isProduction:
    nodeEnv === 'production',

  isTest:
    nodeEnv === 'test',

  port: getNumber(
    'PORT',
    5000
  ),


  // ----------------------------------------------
  // Frontend / CORS
  // ----------------------------------------------

  clientUrl: getString(
    'CLIENT_URL',
    'http://localhost:5173'
  ),

  allowedOrigins:
    getString(
      'CORS_ORIGINS',
      getString(
        'CLIENT_URL',
        'http://localhost:5173'
      )
    )
      .split(',')
      .map(
        (origin) =>
          origin.trim()
      )
      .filter(Boolean),


  // ----------------------------------------------
  // MongoDB
  // ----------------------------------------------

  mongoUri:
    getString(
      'MONGODB_URI'
    ),

  mongoServerSelectionTimeout:
    getNumber(
      'MONGO_SERVER_SELECTION_TIMEOUT',
      10000
    ),

  mongoSocketTimeout:
    getNumber(
      'MONGO_SOCKET_TIMEOUT',
      45000
    ),

  mongoConnectTimeout:
    getNumber(
      'MONGO_CONNECT_TIMEOUT',
      10000
    ),

  mongoHeartbeatFrequency:
    getNumber(
      'MONGO_HEARTBEAT_FREQUENCY',
      10000
    ),

  mongoMaxPoolSize:
    getNumber(
      'MONGO_MAX_POOL_SIZE',
      20
    ),

  mongoMinPoolSize:
    getNumber(
      'MONGO_MIN_POOL_SIZE',
      2
    ),


  // ----------------------------------------------
  // JWT
  // ----------------------------------------------

  jwtAccessSecret:
    getString(
      'JWT_ACCESS_SECRET'
    ),

  jwtRefreshSecret:
    getString(
      'JWT_REFRESH_SECRET'
    ),

  jwtAccessExpires:
    getString(
      'JWT_ACCESS_EXPIRES',
      '15m'
    ),

  jwtRefreshExpires:
    getString(
      'JWT_REFRESH_EXPIRES',
      '7d'
    ),


  // ----------------------------------------------
  // Cookies
  // ----------------------------------------------

  cookieSecure:
    getBoolean(
      'COOKIE_SECURE',
      nodeEnv === 'production'
    ),

  cookieSameSite:
    getString(
      'COOKIE_SAME_SITE',
      nodeEnv === 'production'
        ? 'none'
        : 'lax'
    ),


  // ----------------------------------------------
  // Email / Resend
  // ----------------------------------------------

  resendApiKey:
    getString(
      'RESEND_API_KEY'
    ),

  resendFromEmail:
    getString(
      'RESEND_FROM_EMAIL'
    ),

  companyEmail:
    getString(
      'COMPANY_EMAIL'
    ),


  // ----------------------------------------------
  // SMTP fallback
  // ----------------------------------------------

  smtpHost:
    getString(
      'SMTP_HOST'
    ),

  smtpPort:
    getNumber(
      'SMTP_PORT',
      587
    ),

  smtpUser:
    getString(
      'SMTP_USER'
    ),

  smtpPass:
    getString(
      'SMTP_PASS'
    ),

  smtpFrom:
    getString(
      'SMTP_FROM'
    ),


  // ----------------------------------------------
  // Admin seed
  // ----------------------------------------------

  adminName:
    getString(
      'ADMIN_NAME',
      'CRM Admin'
    ),

  adminEmail:
    getString(
      'ADMIN_EMAIL'
    ),

  adminPassword:
    getString(
      'ADMIN_PASSWORD'
    ),

  adminPhone:
    getString(
      'ADMIN_PHONE'
    ),


  // ----------------------------------------------
  // Uploads
  // ----------------------------------------------

  uploadMaxFileSize:
    getNumber(
      'UPLOAD_MAX_FILE_SIZE',
      5 * 1024 * 1024
    ),

  uploadMaxFiles:
    getNumber(
      'UPLOAD_MAX_FILES',
      5
    ),


  // ----------------------------------------------
  // Pagination
  // ----------------------------------------------

  defaultPageSize:
    getNumber(
      'DEFAULT_PAGE_SIZE',
      20
    ),

  maxPageSize:
    getNumber(
      'MAX_PAGE_SIZE',
      100
    ),


  // ----------------------------------------------
  // Rate limiting
  // ----------------------------------------------

  apiRateLimit:
    getNumber(
      'API_RATE_LIMIT',
      300
    ),

  authRateLimit:
    getNumber(
      'AUTH_RATE_LIMIT',
      20
    ),
};


// ======================================================
// VALIDATION
// ======================================================


// ------------------------------------------------------
// Production JWT security
// ------------------------------------------------------

if (
  env.isProduction
) {
  if (
    env.jwtAccessSecret.length < 32
  ) {
    throw new Error(
      'JWT_ACCESS_SECRET must be at least 32 characters in production.'
    );
  }

  if (
    env.jwtRefreshSecret.length < 32
  ) {
    throw new Error(
      'JWT_REFRESH_SECRET must be at least 32 characters in production.'
    );
  }
}


// ------------------------------------------------------
// Cookie validation
// ------------------------------------------------------

const validSameSiteValues = [
  'strict',
  'lax',
  'none',
];

if (
  !validSameSiteValues.includes(
    env.cookieSameSite.toLowerCase()
  )
) {
  throw new Error(
    'COOKIE_SAME_SITE must be strict, lax, or none.'
  );
}


// ------------------------------------------------------
// Production cookie requirement
// ------------------------------------------------------

if (
  env.isProduction &&
  env.cookieSameSite === 'none' &&
  !env.cookieSecure
) {
  throw new Error(
    'COOKIE_SECURE must be true when COOKIE_SAME_SITE is none in production.'
  );
}


// ------------------------------------------------------
// Admin seed validation
// ------------------------------------------------------
//
// Do not force ADMIN credentials for normal server
// startup. They are required only when seedAdmin runs.
//
// ------------------------------------------------------

if (
  env.adminEmail &&
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    env.adminEmail
  )
) {
  throw new Error(
    'ADMIN_EMAIL must be a valid email address.'
  );
}


// ======================================================
// SAFE CONFIG LOG
// ======================================================
//
// Never log passwords, JWT secrets, API keys, etc.
//
// ======================================================

const logEnvSummary = () => {
  return {
    environment:
      env.nodeEnv,

    port:
      env.port,

    database:
      'configured',

    clientUrl:
      env.clientUrl,

    corsOrigins:
      env.allowedOrigins,

    cookieSecure:
      env.cookieSecure,

    cookieSameSite:
      env.cookieSameSite,

    emailProvider:
      env.resendApiKey
        ? 'resend'
        : env.smtpHost
          ? 'smtp'
          : 'none',
  };
};


env.logEnvSummary =
  logEnvSummary;


// ======================================================
// EXPORT
// ======================================================

module.exports = env;