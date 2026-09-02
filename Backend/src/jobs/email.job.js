const logger = require('../config/logger');

const startEmailJob = () => {
  logger.info('Email job initialized. Provider is handled by email.service.js.');
  return null;
};

module.exports = { startEmailJob };
