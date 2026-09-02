'use strict';

const mongoose = require('mongoose');

const Lead = require('../models/Lead');
const User = require('../models/User');
const Company = require('../models/Company');
const Contact = require('../models/Contact');

const createCrudController =
  require('../utils/controllerFactory');

const asyncHandler =
  require('../utils/asyncHandler');

const { sendSuccess } =
  require('../utils/apiResponse');

const {
  convertLead,
} = require('../services/lead.service');

const ApiError =
  require('../utils/ApiError');


// ======================================================
// CONSTANTS
// ======================================================

const POPULATE =
  'assignedTo company contact convertedOpportunity';

const LEAD_STATUSES = [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST',
];

const LEAD_SOURCES = [
  'WEBSITE',
  'REFERRAL',
  'SOCIAL_MEDIA',
  'ADVERTISEMENT',
  'EMAIL',
  'PHONE',
  'WALK_IN',
  'IMPORT',
  'OTHER',
];


// ======================================================
// BASE CRUD
// ======================================================

const base =
  createCrudController({
    Model: Lead,
    populate: POPULATE,
  });


// ======================================================
// HELPERS
// ======================================================

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};


const normalizeString = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  return String(value).trim();
};


const normalizeEmail = (value) => {
  return normalizeString(value).toLowerCase();
};


const validateObjectId =
  (value, fieldName, errorCode) => {
    if (!isValidObjectId(value)) {
      throw new ApiError(
        400,
        `Invalid ${fieldName}`,
        errorCode
      );
    }
  };


const validateUser = async (
  userId
) => {
  if (!userId) {
    return null;
  }

  validateObjectId(
    userId,
    'assigned user ID',
    'INVALID_ASSIGNED_USER'
  );

  const user =
    await User.findById(userId)
      .select('_id isActive')
      .lean();

  if (!user) {
    throw new ApiError(
      404,
      'Assigned user not found',
      'ASSIGNED_USER_NOT_FOUND'
    );
  }

  if (!user.isActive) {
    throw new ApiError(
      400,
      'Assigned user is inactive',
      'ASSIGNED_USER_INACTIVE'
    );
  }

  return user;
};


const validateCompany = async (
  companyId
) => {
  if (!companyId) {
    return null;
  }

  validateObjectId(
    companyId,
    'company ID',
    'INVALID_COMPANY_ID'
  );

  const company =
    await Company.findById(companyId)
      .select('_id')
      .lean();

  if (!company) {
    throw new ApiError(
      404,
      'Company not found',
      'COMPANY_NOT_FOUND'
    );
  }

  return company;
};


const validateContact = async (
  contactId
) => {
  if (!contactId) {
    return null;
  }

  validateObjectId(
    contactId,
    'contact ID',
    'INVALID_CONTACT_ID'
  );

  const contact =
    await Contact.findById(contactId)
      .select('_id')
      .lean();

  if (!contact) {
    throw new ApiError(
      404,
      'Contact not found',
      'CONTACT_NOT_FOUND'
    );
  }

  return contact;
};


const validateLeadId = (
  leadId
) => {
  validateObjectId(
    leadId,
    'lead ID',
    'INVALID_LEAD_ID'
  );
};


// ======================================================
// CREATE LEAD
// ======================================================

const createLead =
  asyncHandler(
    async (req, res) => {

      const body = {
        ...req.body,
      };

      // --------------------------------------------------
      // REQUIRED
      // --------------------------------------------------

      const name =
        normalizeString(body.name);

      if (!name) {
        throw new ApiError(
          400,
          'Lead name is required',
          'NAME_REQUIRED'
        );
      }

      if (name.length < 2) {
        throw new ApiError(
          400,
          'Lead name must be at least 2 characters',
          'INVALID_NAME'
        );
      }


      // --------------------------------------------------
      // EMAIL NORMALIZATION
      // --------------------------------------------------

      if (body.email) {
        body.email =
          normalizeEmail(body.email);
      }


      // --------------------------------------------------
      // GSTIN NORMALIZATION
      // --------------------------------------------------

      if (body.gstin) {
        body.gstin =
          normalizeString(body.gstin)
            .toUpperCase();
      }


      // --------------------------------------------------
      // PAN NORMALIZATION
      // --------------------------------------------------

      if (body.panNumber) {
        body.panNumber =
          normalizeString(body.panNumber)
            .toUpperCase();
      }


      // --------------------------------------------------
      // VALIDATE ASSIGNED USER
      // --------------------------------------------------

      await validateUser(
        body.assignedTo
      );


      // --------------------------------------------------
      // VALIDATE COMPANY
      // --------------------------------------------------

      await validateCompany(
        body.company
      );


      // --------------------------------------------------
      // VALIDATE CONTACT
      // --------------------------------------------------

      await validateContact(
        body.contact
      );


      // --------------------------------------------------
      // VALIDATE SOURCE
      // --------------------------------------------------

      if (
        body.source &&
        !LEAD_SOURCES.includes(
          body.source
        )
      ) {
        throw new ApiError(
          400,
          'Invalid lead source',
          'INVALID_LEAD_SOURCE'
        );
      }


      // --------------------------------------------------
      // VALIDATE STATUS
      // --------------------------------------------------

      if (
        body.status &&
        !LEAD_STATUSES.includes(
          body.status
        )
      ) {
        throw new ApiError(
          400,
          'Invalid lead status',
          'INVALID_LEAD_STATUS'
        );
      }


      // --------------------------------------------------
      // LOST REASON
      // --------------------------------------------------

      if (
        body.status === 'LOST' &&
        !normalizeString(
          body.lostReason
        )
      ) {
        throw new ApiError(
          400,
          'Lost reason is required when lead status is LOST',
          'LOST_REASON_REQUIRED'
        );
      }


      // --------------------------------------------------
      // CLEAN BASIC VALUES
      // --------------------------------------------------

      body.name = name;

      if (body.designation) {
        body.designation =
          normalizeString(
            body.designation
          );
      }

      if (body.phone) {
        body.phone =
          normalizeString(
            body.phone
          );
      }

      if (body.alternatePhone) {
        body.alternatePhone =
          normalizeString(
            body.alternatePhone
          );
      }

      if (body.companyName) {
        body.companyName =
          normalizeString(
            body.companyName
          );
      }


      // --------------------------------------------------
      // CREATE
      // --------------------------------------------------

      let lead;

      try {
        lead =
          await Lead.create(body);
      } catch (error) {

        // Duplicate email
        if (
          error?.code === 11000
        ) {
          throw new ApiError(
            409,
            'A lead with this email already exists',
            'LEAD_EMAIL_EXISTS'
          );
        }

        throw error;
      }


      // --------------------------------------------------
      // POPULATE
      // --------------------------------------------------

      await lead.populate(
        POPULATE
      );


      // --------------------------------------------------
      // RESPONSE
      // --------------------------------------------------

      sendSuccess(
        res,
        lead,
        'Lead created successfully',
        201
      );
    }
  );


// ======================================================
// GET LEAD BY ID
// ======================================================

const getById =
  asyncHandler(
    async (req, res) => {

      validateLeadId(
        req.params.id
      );

      const lead =
        await Lead.findById(
          req.params.id
        )
          .populate(
            POPULATE
          );

      if (!lead) {
        throw new ApiError(
          404,
          'Lead not found',
          'LEAD_NOT_FOUND'
        );
      }

      sendSuccess(
        res,
        lead,
        'Lead fetched successfully'
      );
    }
  );


// ======================================================
// UPDATE LEAD
// ======================================================

const updateLead =
  asyncHandler(
    async (req, res) => {

      validateLeadId(
        req.params.id
      );

      const existing =
        await Lead.findById(
          req.params.id
        );

      if (!existing) {
        throw new ApiError(
          404,
          'Lead not found',
          'LEAD_NOT_FOUND'
        );
      }


      const update = {
        ...req.body,
      };


      // --------------------------------------------------
      // NAME
      // --------------------------------------------------

      if (
        update.name !== undefined
      ) {
        update.name =
          normalizeString(
            update.name
          );

        if (!update.name) {
          throw new ApiError(
            400,
            'Lead name cannot be empty',
            'NAME_REQUIRED'
          );
        }
      }


      // --------------------------------------------------
      // EMAIL
      // --------------------------------------------------

      if (
        update.email !== undefined
      ) {
        update.email =
          normalizeEmail(
            update.email
          );
      }


      // --------------------------------------------------
      // GSTIN
      // --------------------------------------------------

      if (
        update.gstin !== undefined
      ) {
        update.gstin =
          normalizeString(
            update.gstin
          ).toUpperCase();
      }


      // --------------------------------------------------
      // PAN
      // --------------------------------------------------

      if (
        update.panNumber !== undefined
      ) {
        update.panNumber =
          normalizeString(
            update.panNumber
          ).toUpperCase();
      }


      // --------------------------------------------------
      // ASSIGNED USER
      // --------------------------------------------------

      if (
        update.assignedTo !== undefined
      ) {
        await validateUser(
          update.assignedTo
        );
      }


      // --------------------------------------------------
      // COMPANY
      // --------------------------------------------------

      if (
        update.company !== undefined
      ) {
        await validateCompany(
          update.company
        );
      }


      // --------------------------------------------------
      // CONTACT
      // --------------------------------------------------

      if (
        update.contact !== undefined
      ) {
        await validateContact(
          update.contact
        );
      }


      // --------------------------------------------------
      // SOURCE
      // --------------------------------------------------

      if (
        update.source !== undefined &&
        !LEAD_SOURCES.includes(
          update.source
        )
      ) {
        throw new ApiError(
          400,
          'Invalid lead source',
          'INVALID_LEAD_SOURCE'
        );
      }


      // --------------------------------------------------
      // STATUS
      // --------------------------------------------------

      if (
        update.status !== undefined
      ) {

        if (
          !LEAD_STATUSES.includes(
            update.status
          )
        ) {
          throw new ApiError(
            400,
            'Invalid lead status',
            'INVALID_LEAD_STATUS'
          );
        }


        if (
          update.status === 'LOST'
        ) {

          const lostReason =
            normalizeString(
              update.lostReason
            ) ||
            existing.lostReason;

          if (!lostReason) {
            throw new ApiError(
              400,
              'Lost reason is required when lead status is LOST',
              'LOST_REASON_REQUIRED'
            );
          }

          update.lostReason =
            lostReason;

        } else {

          update.lostReason = '';
        }


        // WON timestamp
        if (
          update.status === 'WON' &&
          existing.status !== 'WON'
        ) {
          update.lastContactAt =
            new Date();
        }
      }


      // --------------------------------------------------
      // TAGS
      // --------------------------------------------------

      if (
        Array.isArray(
          update.tags
        )
      ) {
        update.tags =
          [
            ...new Set(
              update.tags
                .map((tag) =>
                  String(tag)
                    .trim()
                    .toUpperCase()
                )
                .filter(Boolean)
            ),
          ];
      }


      // --------------------------------------------------
      // UPDATE
      // --------------------------------------------------

      let updated;

      try {

        updated =
          await Lead.findByIdAndUpdate(
            req.params.id,
            {
              $set: update,
            },
            {
              new: true,
              runValidators: true,
              context: 'query',
            }
          )
            .populate(
              POPULATE
            );

      } catch (error) {

        if (
          error?.code === 11000
        ) {
          throw new ApiError(
            409,
            'A lead with this email already exists',
            'LEAD_EMAIL_EXISTS'
          );
        }

        throw error;
      }


      if (!updated) {
        throw new ApiError(
          404,
          'Lead not found',
          'LEAD_NOT_FOUND'
        );
      }


      sendSuccess(
        res,
        updated,
        'Lead updated successfully'
      );
    }
  );


// ======================================================
// ASSIGN LEAD
// ======================================================

const assign =
  asyncHandler(
    async (req, res) => {

      validateLeadId(
        req.params.id
      );

      const {
        userId,
      } = req.body;


      if (!userId) {
        throw new ApiError(
          400,
          'User ID is required',
          'USER_ID_REQUIRED'
        );
      }


      await validateUser(
        userId
      );


      const updated =
        await Lead.findByIdAndUpdate(
          req.params.id,
          {
            $set: {
              assignedTo:
                userId,
            },
          },
          {
            new: true,
            runValidators: true,
          }
        )
          .populate(
            POPULATE
          );


      if (!updated) {
        throw new ApiError(
          404,
          'Lead not found',
          'LEAD_NOT_FOUND'
        );
      }


      sendSuccess(
        res,
        updated,
        'Lead assigned successfully'
      );
    }
  );


// ======================================================
// UPDATE STATUS
// ======================================================

const status =
  asyncHandler(
    async (req, res) => {

      validateLeadId(
        req.params.id
      );

      const {
        status: newStatus,
        lostReason,
      } = req.body;


      if (
        !LEAD_STATUSES.includes(
          newStatus
        )
      ) {
        throw new ApiError(
          400,
          'Invalid lead status',
          'INVALID_STATUS'
        );
      }


      if (
        newStatus === 'LOST' &&
        !normalizeString(
          lostReason
        )
      ) {
        throw new ApiError(
          400,
          'Lost reason is required',
          'LOST_REASON_REQUIRED'
        );
      }


      const update = {
        status:
          newStatus,
      };


      if (
        newStatus === 'LOST'
      ) {
        update.lostReason =
          normalizeString(
            lostReason
          );
      } else {
        update.lostReason = '';
      }


      if (
        newStatus === 'WON'
      ) {
        update.lastContactAt =
          new Date();
      }


      const updated =
        await Lead.findByIdAndUpdate(
          req.params.id,
          {
            $set: update,
          },
          {
            new: true,
            runValidators: true,
          }
        )
          .populate(
            POPULATE
          );


      if (!updated) {
        throw new ApiError(
          404,
          'Lead not found',
          'LEAD_NOT_FOUND'
        );
      }


      sendSuccess(
        res,
        updated,
        'Lead status updated successfully'
      );
    }
  );


// ======================================================
// UPDATE FOLLOW-UP
// ======================================================

const followUp =
  asyncHandler(
    async (req, res) => {

      validateLeadId(
        req.params.id
      );

      const {
        nextFollowUpAt,
        lastContactAt,
      } = req.body;


      if (
        nextFollowUpAt === undefined &&
        lastContactAt === undefined
      ) {
        throw new ApiError(
          400,
          'Follow-up data is required',
          'FOLLOWUP_DATA_REQUIRED'
        );
      }


      const update = {};


      // --------------------------------------------------
      // NEXT FOLLOW-UP
      // --------------------------------------------------

      if (
        nextFollowUpAt !== undefined
      ) {

        if (
          nextFollowUpAt === null ||
          nextFollowUpAt === ''
        ) {
          update.nextFollowUpAt =
            null;
        } else {

          const date =
            new Date(
              nextFollowUpAt
            );

          if (
            Number.isNaN(
              date.getTime()
            )
          ) {
            throw new ApiError(
              400,
              'Invalid next follow-up date',
              'INVALID_FOLLOWUP_DATE'
            );
          }

          update.nextFollowUpAt =
            date;
        }
      }


      // --------------------------------------------------
      // LAST CONTACT
      // --------------------------------------------------

      if (
        lastContactAt !== undefined
      ) {

        if (
          lastContactAt === null ||
          lastContactAt === ''
        ) {
          update.lastContactAt =
            null;
        } else {

          const date =
            new Date(
              lastContactAt
            );

          if (
            Number.isNaN(
              date.getTime()
            )
          ) {
            throw new ApiError(
              400,
              'Invalid last contact date',
              'INVALID_LAST_CONTACT_DATE'
            );
          }

          update.lastContactAt =
            date;
        }
      }


      const updated =
        await Lead.findByIdAndUpdate(
          req.params.id,
          {
            $set: update,
          },
          {
            new: true,
            runValidators: true,
          }
        )
          .populate(
            POPULATE
          );


      if (!updated) {
        throw new ApiError(
          404,
          'Lead not found',
          'LEAD_NOT_FOUND'
        );
      }


      sendSuccess(
        res,
        updated,
        'Lead follow-up updated successfully'
      );
    }
  );


// ======================================================
// CONVERT LEAD
// ======================================================

const convert =
  asyncHandler(
    async (req, res) => {

      validateLeadId(
        req.params.id
      );


      const lead =
        await Lead.findById(
          req.params.id
        )
          .select(
            '_id status convertedAt convertedOpportunity'
          );


      if (!lead) {
        throw new ApiError(
          404,
          'Lead not found',
          'LEAD_NOT_FOUND'
        );
      }


      // --------------------------------------------------
      // PREVENT DUPLICATE CONVERSION
      // --------------------------------------------------

      if (
        lead.convertedAt ||
        lead.convertedOpportunity
      ) {
        throw new ApiError(
          409,
          'Lead has already been converted',
          'LEAD_ALREADY_CONVERTED'
        );
      }


      // --------------------------------------------------
      // ONLY QUALIFIED / WON LEADS
      // --------------------------------------------------

      if (
        ![
          'QUALIFIED',
          'PROPOSAL',
          'NEGOTIATION',
          'WON',
        ].includes(
          lead.status
        )
      ) {
        throw new ApiError(
          400,
          'Lead must be qualified before conversion',
          'LEAD_NOT_READY_FOR_CONVERSION'
        );
      }


      const opportunity =
        await convertLead(
          req.params.id,
          req.user._id
        );


      sendSuccess(
        res,
        opportunity,
        'Lead converted successfully',
        201
      );
    }
  );


// ======================================================
// EXPORT
// ======================================================

module.exports = {

  // Base CRUD
  list:
    base.list,

  remove:
    base.remove,

  // Custom / safe CRUD
  create:
    createLead,

  getById:
    getById,

  update:
    updateLead,

  // Lead actions
  assign,

  status,

  followUp,

  convert,
};