const express = require('express');
const { team, territory } = require('../controllers/team.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Mounted at /teams and /territories (see app.js).
const build = (c) => {
  const router = express.Router();
  router.use(authenticate);
  router.get('/', c.list);
  router.post('/', c.create);
  router.get('/:id', c.getById);
  router.put('/:id', c.update);
  router.delete('/:id', c.remove);
  return router;
};

module.exports = { teamRoutes: build(team), territoryRoutes: build(territory) };
