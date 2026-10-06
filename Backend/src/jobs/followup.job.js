const Task = require('../models/Task');
const Activity = require('../models/Activity');
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

// Calendar/activity reminders: one notification per activity when reminderAt passes.
const runActivityReminders = async () => {
  const due = await Activity.find({
    isDeleted: false,
    reminderEnabled: true,
    reminderSent: { $ne: true },
    reminderAt: { $lte: new Date() },
    status: { $nin: ['COMPLETED', 'CANCELLED'] },
  }).select('_id subject scheduledAt assignedTo').limit(200);

  let sent = 0;

  for (const activity of due) {
    // Claim first so overlapping runs never notify twice.
    const claimed = await Activity.updateOne(
      { _id: activity._id, reminderSent: { $ne: true } },
      { $set: { reminderSent: true } },
    );
    if (!claimed.modifiedCount) continue;

    await Notification.create({
      user: activity.assignedTo,
      title: 'Upcoming activity',
      message: `"${activity.subject}" is scheduled for ${
        activity.scheduledAt ? activity.scheduledAt.toISOString() : 'soon'
      }.`,
      type: 'ACTIVITY_REMINDER',
      entityType: 'Activity',
      entityId: activity._id,
    });
    sent += 1;
  }

  if (sent) logger.info(`Created ${sent} activity reminder(s).`);
};

module.exports = { runFollowupJob, runActivityReminders };
