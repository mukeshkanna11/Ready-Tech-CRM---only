"use strict";

const express = require("express");

const router = express.Router();

const {
  create,
  getAll,
  getById,
  update,
  remove,

  start,
  complete,
  cancel,
  assign,

  getMyTasks,
  getUpcoming,
  getOverdue,
  getStats,

  restore,

  getLeadTasks,
  getCompanyTasks,
  getContactTasks,
  getOpportunityTasks,
} = require("../controllers/task.controller");

const {
  authenticate,
} = require("../middleware/auth.middleware");

/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
*/

router.use(authenticate);

/*
|--------------------------------------------------------------------------
| SPECIAL ROUTES
| IMPORTANT:
| Keep these BEFORE /:id
|--------------------------------------------------------------------------
*/

/*
 * Statistics
 * GET /api/v1/tasks/stats
 */
router.get("/stats", getStats);

/*
 * My Tasks
 * GET /api/v1/tasks/my
 */
router.get("/my", getMyTasks);

/*
 * Upcoming Tasks
 * GET /api/v1/tasks/upcoming
 */
router.get("/upcoming", getUpcoming);

/*
 * Overdue Tasks
 * GET /api/v1/tasks/overdue
 */
router.get("/overdue", getOverdue);

/*
|--------------------------------------------------------------------------
| CRM RELATIONSHIP ROUTES
|--------------------------------------------------------------------------
*/

/*
 * Lead Tasks
 * GET /api/v1/tasks/lead/:leadId
 */
router.get("/lead/:leadId", getLeadTasks);

/*
 * Company Tasks
 * GET /api/v1/tasks/company/:companyId
 */
router.get("/company/:companyId", getCompanyTasks);

/*
 * Contact Tasks
 * GET /api/v1/tasks/contact/:contactId
 */
router.get("/contact/:contactId", getContactTasks);

/*
 * Opportunity Tasks
 * GET /api/v1/tasks/opportunity/:opportunityId
 */
router.get(
  "/opportunity/:opportunityId",
  getOpportunityTasks
);

/*
|--------------------------------------------------------------------------
| MAIN CRUD
|--------------------------------------------------------------------------
*/

/*
 * Create
 * POST /api/v1/tasks
 */
router.post("/", create);

/*
 * Get all
 * GET /api/v1/tasks
 */
router.get("/", getAll);

/*
|--------------------------------------------------------------------------
| ID ACTIONS
|--------------------------------------------------------------------------
*/

/*
 * Start
 * PATCH /api/v1/tasks/:id/start
 */
router.patch("/:id/start", start);

/*
 * Complete
 * PATCH /api/v1/tasks/:id/complete
 */
router.patch("/:id/complete", complete);

/*
 * Cancel
 * PATCH /api/v1/tasks/:id/cancel
 */
router.patch("/:id/cancel", cancel);

/*
 * Assign
 * PATCH /api/v1/tasks/:id/assign
 */
router.patch("/:id/assign", assign);

/*
 * Restore
 * PATCH /api/v1/tasks/:id/restore
 */
router.patch("/:id/restore", restore);

/*
|--------------------------------------------------------------------------
| CRUD BY ID
|--------------------------------------------------------------------------
*/

/*
 * Get one
 * GET /api/v1/tasks/:id
 */
router.get("/:id", getById);

/*
 * Update
 * PUT /api/v1/tasks/:id
 */
router.put("/:id", update);

/*
 * Soft delete
 * DELETE /api/v1/tasks/:id
 */
router.delete("/:id", remove);

module.exports = router;