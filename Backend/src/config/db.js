'use strict';

const mongoose = require('mongoose');

const env = require('./env');
const logger = require('./logger');


// ======================================================
// MONGOOSE GLOBAL SETTINGS
// ======================================================

mongoose.set('strictQuery', true);


// ======================================================
// DATABASE STATE
// ======================================================

let isConnected = false;


// ======================================================
// CONNECT DATABASE
// ======================================================

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    logger.info('MongoDB already connected');
    return mongoose.connection;
  }

  try {
    const connection = await mongoose.connect(
      env.mongoUri,
      {
        // Connection timeout
        serverSelectionTimeoutMS:
          env.mongoServerSelectionTimeout,

        // Socket timeout
        socketTimeoutMS:
          env.mongoSocketTimeout,

        // Connection pool
        maxPoolSize:
          env.mongoMaxPoolSize,

        minPoolSize:
          env.mongoMinPoolSize,

        // Keep connections alive
        heartbeatFrequencyMS:
          env.mongoHeartbeatFrequency,

        // Faster initial connection
        connectTimeoutMS:
          env.mongoConnectTimeout,

        // Prevent buffering queries while DB is down
        bufferCommands: false,
      }
    );

    isConnected = true;

    logger.info(
      `MongoDB connected: ${connection.connection.host}/${connection.connection.name}`
    );

    return connection.connection;
  } catch (error) {
    isConnected = false;

    logger.error(
      `MongoDB connection failed: ${error.message}`,
      error.stack
    );

    throw error;
  }
};


// ======================================================
// DISCONNECT DATABASE
// ======================================================

const disconnectDB = async () => {
  if (
    mongoose.connection.readyState === 0
  ) {
    isConnected = false;
    return;
  }

  try {
    await mongoose.disconnect();

    isConnected = false;

    logger.info(
      'MongoDB disconnected'
    );
  } catch (error) {
    logger.error(
      `MongoDB disconnect failed: ${error.message}`,
      error.stack
    );

    throw error;
  }
};


// ======================================================
// DATABASE STATUS
// ======================================================

const isDBConnected = () => {
  return (
    isConnected &&
    mongoose.connection.readyState === 1
  );
};


// ======================================================
// MONGOOSE EVENTS
// ======================================================

mongoose.connection.on(
  'connected',
  () => {
    isConnected = true;

    logger.info(
      'MongoDB connection established'
    );
  }
);


mongoose.connection.on(
  'disconnected',
  () => {
    isConnected = false;

    logger.warn(
      'MongoDB connection lost'
    );
  }
);


mongoose.connection.on(
  'reconnected',
  () => {
    isConnected = true;

    logger.info(
      'MongoDB reconnected'
    );
  }
);


mongoose.connection.on(
  'error',
  (error) => {
    logger.error(
      `MongoDB error: ${error.message}`,
      error.stack
    );
  }
);


// ======================================================
// EXPORT
// ======================================================

module.exports = {
  connectDB,
  disconnectDB,
  isDBConnected,
};