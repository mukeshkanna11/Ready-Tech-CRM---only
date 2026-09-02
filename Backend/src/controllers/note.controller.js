const Model = require('../models/Note');
const createCrudController = require('../utils/controllerFactory');

module.exports = createCrudController({
  Model,
  populate: 'author lead company contact opportunity quotation invoice',
});
