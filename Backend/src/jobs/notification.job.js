const { runFollowupJob } = require('./followup.job');

const startNotificationJob = () => {
  const run = () => runFollowupJob().catch((error) => console.error('Notification job error:', error));
  run();
  return setInterval(run, 5 * 60 * 1000);
};

module.exports = { startNotificationJob };
