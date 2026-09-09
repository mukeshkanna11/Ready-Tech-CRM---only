'use strict';

const asyncHandler = require('../utils/asyncHandler');

const {
  createOrUpdateLeadFromEnquiry,
  sendEnquiryNotification,
} = require('../services/emailEnquiry.service');

/**
 * Create / Update Lead from Website Enquiry
 *
 * POST /api/v1/email/enquiry
 *
 * Flow:
 * Website Enquiry
 *      ↓
 * Create / Update Lead
 *      ↓
 * Send notification email to company
 */
const createEmailEnquiry = asyncHandler(
  async (req, res) => {
    const {
      name,
      email,
      phone,
      companyName,
      message,
    } = req.body;

    // --------------------------------------------------
    // CREATE / UPDATE LEAD
    // --------------------------------------------------

    const result =
      await createOrUpdateLeadFromEnquiry({
        name,
        email,
        phone,
        companyName,
        message,
      });

    // --------------------------------------------------
    // SEND EMAIL NOTIFICATION
    // --------------------------------------------------

    let emailNotification = null;

    try {
      emailNotification =
        await sendEnquiryNotification({
          name,
          email,
          phone,
          companyName,
          message,
          lead: result.lead,
        });
    } catch (error) {
      /**
       * IMPORTANT:
       *
       * Lead creation should not fail just because
       * notification email failed.
       *
       * The Lead has already been created/updated.
       */
      console.error(
        '[EMAIL ENQUIRY] Notification failed:',
        error.message
      );
    }

    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return res
      .status(result.created ? 201 : 200)
      .json({
        success: true,

        message: result.created
          ? 'Lead created from website enquiry successfully'
          : 'Existing lead updated from website enquiry successfully',

        data: {
          lead: result.lead,

          created: result.created,

          emailNotificationSent:
            emailNotification &&
            !emailNotification.skipped,
        },
      });
  }
);

module.exports = {
  createEmailEnquiry,
};