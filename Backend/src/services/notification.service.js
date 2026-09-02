const Notification = require('../models/Notification');

const createNotification = (payload) => Notification.create(payload);

const notifyUser = async (user, title, message, meta = {}) =>
  createNotification({
    user,
    title,
    message,
    ...meta,
  });

module.exports = { createNotification, notifyUser };
