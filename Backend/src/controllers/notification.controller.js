const Model = require('../models/Notification');
const createCrudController = require('../utils/controllerFactory');

module.exports = createCrudController({
  Model,
  populate: 'user',
});
