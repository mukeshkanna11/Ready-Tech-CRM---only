'use strict';

const asyncHandler =
  require('../utils/asyncHandler');

const {
  sendSuccess,
} = require('../utils/apiResponse');

const ApiError =
  require('../utils/ApiError');

const {
  createOrUpdateLeadFromEmail,
} = require('../services/emailLead.service');


/**
 * ======================================================
 * INCOMING EMAIL WEBHOOK
 * POST /api/v1/email/webhook
 * ======================================================
 *
 * Converts incoming email into a CRM Lead.
 *
 * Supported payload:
 *
 * {
 *   "from": "Rajesh Kumar <rajesh@abc.com>",
 *   "subject": "ERP Enquiry",
 *   "text": "Phone: 9876543210..."
 * }
 */
const receiveEmail =
  asyncHandler(
    async (req, res) => {

      const {
        from,
        sender,
        subject,
        text,
        html,
        body,
      } = req.body || {};

      if (
        !from &&
        !sender
      ) {
        throw new ApiError(
          400,
          'Incoming email sender is required',
          'EMAIL_SENDER_REQUIRED'
        );
      }

      const result =
        await createOrUpdateLeadFromEmail({
          from,
          sender,
          subject,
          text,
          html,
          body,
        });

      sendSuccess(
        res,
        {
          lead: result.lead,
          created: result.created,
          source: 'EMAIL',
        },
        result.created
          ? 'Lead created from email successfully'
          : 'Existing lead updated from email successfully',
        result.created
          ? 201
          : 200
      );
    }
  );


module.exports = {
  receiveEmail,
};