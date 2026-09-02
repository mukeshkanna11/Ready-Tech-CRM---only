const Role = require('../models/Role');
const createCrudController = require('../utils/controllerFactory');

module.exports = createCrudController({ Model: Role });
