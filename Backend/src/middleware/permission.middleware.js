'use strict';

const { authenticate } = require('./auth.middleware');
const { authorizePermission } = require('./authorize.middleware');

// ======================================================
// RESOURCE PERMISSION GUARD
// ======================================================
//
// Mounted in app.js in front of a resource router.
// Maps the HTTP method to an action and checks
// `<RESOURCE>:<ACTION>` using the existing
// authorizePermission (SUPER_ADMIN / ADMIN bypass,
// '*' and 'RESOURCE:*' wildcards).
//
// Options:
//   write:    action used for all non-read methods,
//             e.g. 'PAYMENT' for payments (INVOICES:PAYMENT).
//   openRead: reads need only authentication (used by
//             lookup lists such as owner dropdowns).

const METHOD_ACTIONS = {
  GET: 'READ',
  HEAD: 'READ',
  OPTIONS: 'READ',
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE',
};

const requirePermission =
  (resource, actions = {}) =>
  (req, res, next) => {
    const check = () => {
      const action = METHOD_ACTIONS[req.method] || 'READ';

      if (action === 'READ' && actions.openRead) {
        return next();
      }

      const resolved =
        action !== 'READ' && actions.write ? actions.write : action;

      return authorizePermission(`${resource}:${resolved}`)(req, res, next);
    };

    // Routers authenticate per route, so ensure req.user exists here.
    if (req.user) {
      return check();
    }

    return authenticate(req, res, (error) => {
      if (error) {
        return next(error);
      }

      return check();
    });
  };

module.exports = { requirePermission };
