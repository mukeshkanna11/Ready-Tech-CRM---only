const { runFollowupJob, runActivityReminders } = require('./followup.job');

const startNotificationJob = () => {
  const run = () => {
    runFollowupJob().catch((error) => console.error('Notification job error:', error));
    runActivityReminders().catch((error) => console.error('Activity reminder job error:', error));
  };
  run();
  return setInterval(run, 5 * 60 * 1000);
};

module.exports = { startNotificationJob };
