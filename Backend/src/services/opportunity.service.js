const Opportunity = require('../models/Opportunity');

const pipeline = async (filter = {}) => {
  return Opportunity.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$stage',
        count: { $sum: 1 },
        value: { $sum: '$value' },
      },
    },
    { $sort: { value: -1 } },
  ]);
};

module.exports = { pipeline };
