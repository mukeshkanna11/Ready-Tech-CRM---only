'use strict';


// ======================================================
// LOGGER
// ======================================================
//
// Lightweight production-ready logger.
// No external logging package required.
//
// Levels:
// - DEBUG
// - INFO
// - WARN
// - ERROR
//
// Usage:
// logger.info('Server started');
// logger.info('User created', { userId });
// logger.warn('Invalid request', { path });
// logger.error('Database failed', error);
//
// ======================================================


// ======================================================
// ENVIRONMENT
// ======================================================

const NODE_ENV =
  process.env.NODE_ENV ||
  'development';

const isDevelopment =
  NODE_ENV === 'development';


// ======================================================
// HELPERS
// ======================================================

const timestamp = () =>
  new Date().toISOString();


const serializeMeta = (
  meta
) => {
  if (
    meta === undefined ||
    meta === null
  ) {
    return '';
  }

  // Error object
  if (
    meta instanceof Error
  ) {
    return {
      name: meta.name,
      message: meta.message,
      stack: meta.stack,
      code: meta.code,
    };
  }

  // String / primitive
  if (
    typeof meta !== 'object'
  ) {
    return meta;
  }

  try {
    return JSON.parse(
      JSON.stringify(meta)
    );
  } catch {
    return '[Unserializable metadata]';
  }
};


const write = (
  level,
  message,
  meta,
  consoleMethod
) => {
  const entry = {
    timestamp:
      timestamp(),

    level,

    environment:
      NODE_ENV,

    message:
      String(message),
  };


  const serialized =
    serializeMeta(meta);

  if (
    serialized !== ''
  ) {
    entry.meta =
      serialized;
  }


  // Development:
  // readable console output.
  if (isDevelopment) {
    consoleMethod(
      `[${level}] ${entry.timestamp} ${entry.message}`,
      serialized !== ''
        ? serialized
        : ''
    );

    return;
  }


  // Production:
  // JSON structured logging.
  consoleMethod(
    JSON.stringify(entry)
  );
};


// ======================================================
// LOGGER
// ======================================================

const logger = {

  // ----------------------------------------------------
  // DEBUG
  // ----------------------------------------------------

  debug(
    message,
    meta = null
  ) {
    if (!isDevelopment) {
      return;
    }

    write(
      'DEBUG',
      message,
      meta,
      console.debug
    );
  },


  // ----------------------------------------------------
  // INFO
  // ----------------------------------------------------

  info(
    message,
    meta = null
  ) {
    write(
      'INFO',
      message,
      meta,
      console.log
    );
  },


  // ----------------------------------------------------
  // WARN
  // ----------------------------------------------------

  warn(
    message,
    meta = null
  ) {
    write(
      'WARN',
      message,
      meta,
      console.warn
    );
  },


  // ----------------------------------------------------
  // ERROR
  // ----------------------------------------------------

  error(
    message,
    meta = null
  ) {
    write(
      'ERROR',
      message,
      meta,
      console.error
    );
  },


  // ----------------------------------------------------
  // REQUEST
  // ----------------------------------------------------

  request(
    req,
    meta = {}
  ) {
    write(
      'HTTP',
      `${req.method} ${req.originalUrl}`,
      {
        ...meta,

        ip:
          req.ip,

        userId:
          req.user?._id
            ? String(
                req.user._id
              )
            : undefined,

        userAgent:
          req.get(
            'user-agent'
          ),
      },
      console.log
    );
  },


  // ----------------------------------------------------
  // DATABASE
  // ----------------------------------------------------

  database(
    message,
    meta = null
  ) {
    write(
      'DATABASE',
      message,
      meta,
      console.log
    );
  },


  // ----------------------------------------------------
  // SECURITY
  // ----------------------------------------------------

  security(
    message,
    meta = null
  ) {
    write(
      'SECURITY',
      message,
      meta,
      console.warn
    );
  },
};


// ======================================================
// EXPORT
// ======================================================

module.exports = logger;