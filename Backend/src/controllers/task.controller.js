const Model = require('../models/Task');
const createCrudController = require('../utils/controllerFactory');

module.exports = createCrudController({
  Model,
  populate: 'assignedTo lead company contact opportunity',
});
