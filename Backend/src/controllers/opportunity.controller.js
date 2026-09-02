const Opportunity = require('../models/Opportunity');
const createCrudController = require('../utils/controllerFactory');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { pipeline } = require('../services/opportunity.service');

const base = createCrudController({
  Model: Opportunity,
  populate: 'owner company contact lead products.product',
});

module.exports = {
  ...base,
  stage: asyncHandler(async (req, res) => {
    const updated = await Opportunity.findByIdAndUpdate(
      req.params.id,
      { stage: req.body.stage, probability: req.body.probability },
      { new: true, runValidators: true },
    );

    if (!updated) return res.status(404).json({ success: false, message: 'Opportunity not found' });
    sendSuccess(res, updated, 'Opportunity stage updated');
  }),
  pipeline: asyncHandler(async (_req, res) => {
    sendSuccess(res, await pipeline());
  }),
};
