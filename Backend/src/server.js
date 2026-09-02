'use strict';

const http = require('http');

const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');

const {
  connectDB,
  disconnectDB,
} = require('./config/db');

const {
  startNotificationJob,
} = require('./jobs/notification.job');

const {
  startEmailJob,
} = require('./jobs/email.job');


let server = null;
let notificationJob = null;
let emailJob = null;

let isShuttingDown = false;


// ======================================================
// START SERVER
// ======================================================

const start = async () => {
  try {

    // --------------------------------------------------
    // Database
    // --------------------------------------------------

    logger.info('🔄 Connecting to MongoDB...');

    await connectDB();

    logger.info('🟢 MongoDB connected successfully');


    // --------------------------------------------------
    // HTTP Server
    // --------------------------------------------------

    server = http.createServer(app);


    server.timeout =
      Number(
        process.env.SERVER_TIMEOUT || 120000
      );

    server.keepAliveTimeout =
      Number(
        process.env.KEEP_ALIVE_TIMEOUT || 65000
      );

    server.headersTimeout =
      Number(
        process.env.HEADERS_TIMEOUT || 66000
      );


    // --------------------------------------------------
    // Server error
    // --------------------------------------------------

    server.on(
      'error',
      (error) => {

        logger.error(
          '❌ HTTP server error',
          error
        );

      }
    );


    // --------------------------------------------------
    // Listen
    // --------------------------------------------------

    server.listen(
      env.port,
      '0.0.0.0',
      () => {

        logger.info(
          `🟢 CRM API running on port ${env.port} in ${env.nodeEnv} mode`
        );

      }
    );


    // --------------------------------------------------
    // Notification Job
    // --------------------------------------------------

    try {

      notificationJob =
        startNotificationJob();

      logger.info(
        '🟢 Notification job started'
      );

    } catch (error) {

      logger.error(
        '❌ Notification job failed to start',
        error
      );

    }


    // --------------------------------------------------
    // Email Job
    // --------------------------------------------------

    try {

      emailJob =
        startEmailJob();

      logger.info(
        '🟢 Email job started'
      );

    } catch (error) {

      logger.error(
        '❌ Email job failed to start',
        error
      );

    }


  } catch (error) {

    logger.error(
      '❌ CRM server startup failed',
      error
    );

    await disconnectDB()
      .catch((dbError) => {

        logger.error(
          '❌ Database disconnect failed',
          dbError
        );

      });

    process.exit(1);
  }
};


// ======================================================
// GRACEFUL SHUTDOWN
// ======================================================

const shutdown = async (
  signal
) => {

  if (isShuttingDown) {

    logger.warn(
      '⚠️ Shutdown already in progress'
    );

    return;
  }

  isShuttingDown = true;


  logger.info(
    `⚠️ ${signal} received. Starting graceful shutdown...`
  );


  // --------------------------------------------------
  // Stop HTTP server
  // --------------------------------------------------

  if (server) {

    await new Promise(
      (resolve) => {

        server.close(
          () => {

            logger.info(
              '🔴 HTTP server closed'
            );

            resolve();
          }
        );

      }
    ).catch((error) => {

      logger.error(
        '❌ HTTP server close failed',
        error
      );

    });

  }


  // --------------------------------------------------
  // Stop Notification Job
  // --------------------------------------------------

  if (notificationJob) {

    try {

      if (
        typeof notificationJob.stop ===
        'function'
      ) {

        await notificationJob.stop();

      } else {

        clearInterval(
          notificationJob
        );

      }

      notificationJob = null;

      logger.info(
        '🔴 Notification job stopped'
      );

    } catch (error) {

      logger.error(
        '❌ Notification job shutdown failed',
        error
      );

    }

  }


  // --------------------------------------------------
  // Stop Email Job
  // --------------------------------------------------

  if (emailJob) {

    try {

      if (
        typeof emailJob.stop ===
        'function'
      ) {

        await emailJob.stop();

      } else {

        clearInterval(
          emailJob
        );

      }

      emailJob = null;

      logger.info(
        '🔴 Email job stopped'
      );

    } catch (error) {

      logger.error(
        '❌ Email job shutdown failed',
        error
      );

    }

  }


  // --------------------------------------------------
  // MongoDB
  // --------------------------------------------------

  try {

    await disconnectDB();

    logger.info(
      '🔴 MongoDB connection closed'
    );

  } catch (error) {

    logger.error(
      '❌ MongoDB shutdown failed',
      error
    );

  }


  logger.info(
    '✅ CRM server shutdown completed'
  );

  process.exit(0);
};


// ======================================================
// PROCESS SIGNALS
// ======================================================

process.on(
  'SIGTERM',
  () => shutdown('SIGTERM')
);

process.on(
  'SIGINT',
  () => shutdown('SIGINT')
);


// ======================================================
// UNHANDLED REJECTION
// ======================================================

process.on(
  'unhandledRejection',
  (error) => {

    logger.error(
      '❌ Unhandled promise rejection',
      error
    );

    shutdown(
      'unhandledRejection'
    );

  }
);


// ======================================================
// UNCAUGHT EXCEPTION
// ======================================================

process.on(
  'uncaughtException',
  (error) => {

    logger.error(
      '❌ Uncaught exception',
      error
    );

    shutdown(
      'uncaughtException'
    );

  }
);


// ======================================================
// START
// ======================================================

start();


// ======================================================
// EXPORT
// ======================================================

module.exports = {
  start,
  shutdown,
};