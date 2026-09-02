const Task = require('../models/Task');
const Notification = require('../models/Notification');
const logger = require('../config/logger');

const runFollowupJob = async () => {
  const now = new Date();
  const end = new Date(now.getTime() + 15 * 60 * 1000);

  const tasks = await Task.find({
    status: 'PENDING',
    dueDate: { $gte: now, $lte: end },
  }).select('_id title assignedTo');

  for (const task of tasks) {
    await Notification.create({
      user: task.assignedTo,
      title: 'Upcoming follow-up',
      message: `Task "${task.title}" is due soon.`,
      type: 'TASK_REMINDER',
      entityType: 'Task',
      entityId: task._id,
    });
  }

  if (tasks.length) logger.info(`Created ${tasks.length} follow-up reminder(s).`);
};

module.exports = { runFollowupJob };
