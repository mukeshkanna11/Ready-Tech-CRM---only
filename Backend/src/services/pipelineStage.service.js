'use strict';

const PipelineStage = require('../models/PipelineStage');
const { OPPORTUNITY_STAGES } = require('../utils/constants');

const SYSTEM_STAGES = ['CLOSED_WON', 'CLOSED_LOST'];

const toName = (key) =>
  key
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

let defaultsReady = false;

// Seed the original fixed stages once (idempotent upsert),
// so existing opportunity stage values stay valid.
const ensureDefaultStages = async () => {
  if (defaultsReady) return;

  await PipelineStage.bulkWrite(
    OPPORTUNITY_STAGES.map((key, index) => ({
      updateOne: {
        filter: { key },
        update: {
          $setOnInsert: {
            key,
            name: toName(key),
            order: index + 1,
            isActive: true,
            isSystem: SYSTEM_STAGES.includes(key),
          },
        },
        upsert: true,
      },
    })),
  );

  defaultsReady = true;
};

const getStages = async ({ activeOnly = false } = {}) => {
  await ensureDefaultStages();

  const filter = activeOnly ? { isActive: true } : {};

  return PipelineStage.find(filter).sort({ order: 1, createdAt: 1 }).lean();
};

const getStageKeys = async (options) =>
  (await getStages(options)).map((stage) => stage.key);

module.exports = {
  SYSTEM_STAGES,
  ensureDefaultStages,
  getStages,
  getStageKeys,
};
