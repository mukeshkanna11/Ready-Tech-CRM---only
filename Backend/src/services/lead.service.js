'use strict';

const mongoose = require('mongoose');

const Lead = require('../models/Lead');
const Company = require('../models/Company');
const Contact = require('../models/Contact');
const Opportunity = require('../models/Opportunity');

const ApiError = require('../utils/ApiError');

// ======================================================
// LEAD SERVICE
// ======================================================
//
// Lead conversion:
//
// Lead
//   ↓
// Company
//   ↓
// Contact
//   ↓
// Opportunity
//
// Conversion is executed inside a MongoDB transaction.
//
// Lead business/tax details are copied to Company:
// - GSTIN
// - PAN
// - Email
// - Phone
// - Address
// - City
// - State
// - Country
// - Postal Code
//
// Lead contact details are copied to Contact.
//
// ======================================================


// ======================================================
// CONSTANTS
// ======================================================

const LEAD_STATUS_WON = 'WON';

const OPPORTUNITY_STAGE = 'QUALIFICATION';

const COMPANY_STATUS = 'ACTIVE';

const CONTACT_STATUS = 'ACTIVE';


// ======================================================
// HELPERS
// ======================================================

// ------------------------------------------------------
// Validate ObjectId
// ------------------------------------------------------

const isValidObjectId = (value) => {
  return Boolean(
    value &&
    mongoose.Types.ObjectId.isValid(value)
  );
};


// ------------------------------------------------------
// Normalize string
// ------------------------------------------------------

const normalizeString = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  return String(value).trim();
};


// ------------------------------------------------------
// Normalize email
// ------------------------------------------------------

const normalizeEmail = (value) => {
  const email = normalizeString(value);

  return email
    ? email.toLowerCase()
    : '';
};


// ------------------------------------------------------
// Normalize uppercase value
// ------------------------------------------------------

const normalizeUpper = (value) => {
  const valueString =
    normalizeString(value);

  return valueString
    ? valueString.toUpperCase()
    : '';
};


// ------------------------------------------------------
// Normalize GSTIN
// ------------------------------------------------------

const normalizeGSTIN = (value) => {
  return normalizeUpper(value)
    .replace(/\s+/g, '');
};


// ------------------------------------------------------
// Normalize PAN
// ------------------------------------------------------

const normalizePAN = (value) => {
  return normalizeUpper(value)
    .replace(/\s+/g, '');
};


// ------------------------------------------------------
// Normalize phone
// ------------------------------------------------------

const normalizePhone = (value) => {
  return normalizeString(value);
};


// ------------------------------------------------------
// Normalize tags
// ------------------------------------------------------

const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) {
    return [];
  }

  return [
    ...new Set(
      tags
        .map((tag) =>
          normalizeUpper(tag)
        )
        .filter(Boolean)
    ),
  ];
};


// ------------------------------------------------------
// Escape regex
// ------------------------------------------------------

const escapeRegex = (value) => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
};


// ------------------------------------------------------
// Resolve owner
// ------------------------------------------------------

const resolveOwner = (
  lead,
  userId
) => {
  return lead.assignedTo || userId;
};


// ======================================================
// COMPANY
// ======================================================

// ======================================================
// FIND EXISTING COMPANY
// ======================================================
//
// Priority:
//
// 1. Existing lead.company
// 2. GSTIN
// 3. PAN
// 4. Exact company name
// 5. Email
// 6. Phone
//
// ======================================================

const findExistingCompany = async ({
  lead,
  session,
}) => {

  // ----------------------------------------------------
  // 1. Existing relation
  // ----------------------------------------------------

  if (
    lead.company &&
    isValidObjectId(lead.company)
  ) {
    const company =
      await Company.findById(
        lead.company
      ).session(session);

    if (company) {
      return company;
    }
  }


  const companyName =
    normalizeString(
      lead.companyName
    );

  const gstin =
    normalizeGSTIN(
      lead.gstin
    );

  const panNumber =
    normalizePAN(
      lead.panNumber
    );

  const email =
    normalizeEmail(
      lead.email
    );

  const phone =
    normalizePhone(
      lead.phone
    );


  // ----------------------------------------------------
  // 2. GSTIN
  // ----------------------------------------------------

  if (gstin) {
    const company =
      await Company.findOne({
        gstin,
      }).session(session);

    if (company) {
      return company;
    }
  }


  // ----------------------------------------------------
  // 3. PAN
  // ----------------------------------------------------

  if (panNumber) {
    const company =
      await Company.findOne({
        panNumber,
      }).session(session);

    if (company) {
      return company;
    }
  }


  // ----------------------------------------------------
  // 4. Company name
  // ----------------------------------------------------

  if (companyName) {
    const company =
      await Company.findOne({
        name: {
          $regex:
            `^${escapeRegex(companyName)}$`,
          $options: 'i',
        },
      }).session(session);

    if (company) {
      return company;
    }
  }


  // ----------------------------------------------------
  // 5. Email
  // ----------------------------------------------------

  if (email) {
    const company =
      await Company.findOne({
        email,
      }).session(session);

    if (company) {
      return company;
    }
  }


  // ----------------------------------------------------
  // 6. Phone
  // ----------------------------------------------------

  if (phone) {
    const company =
      await Company.findOne({
        phone,
      }).session(session);

    if (company) {
      return company;
    }
  }


  return null;
};


// ======================================================
// BUILD COMPANY DATA
// ======================================================

const buildCompanyData = ({
  lead,
  owner,
}) => {

  const companyName =
    normalizeString(
      lead.companyName
    ) ||
    normalizeString(
      lead.name
    );


  return {
    name: companyName,

    email:
      normalizeEmail(
        lead.email
      ),

    phone:
      normalizePhone(
        lead.phone
      ),

    alternatePhone:
      normalizePhone(
        lead.alternatePhone
      ),

    gstin:
      normalizeGSTIN(
        lead.gstin
      ),

    panNumber:
      normalizePAN(
        lead.panNumber
      ),

    // Backward compatibility
    taxNumber:
      normalizeGSTIN(
        lead.gstin
      ),

    owner,

    source:
      normalizeUpper(
        lead.source
      ),

    status:
      COMPANY_STATUS,

    address: {
      street:
        normalizeString(
          lead.address
        ),

      city:
        normalizeString(
          lead.city
        ),

      state:
        normalizeString(
          lead.state
        ),

      country:
        normalizeString(
          lead.country
        ),

      postalCode:
        normalizeString(
          lead.postalCode
        ),
    },

    tags:
      normalizeTags(
        lead.tags
      ),

    notes:
      normalizeString(
        lead.notes
      ),
  };
};


// ======================================================
// UPDATE EXISTING COMPANY
// ======================================================
//
// Existing company may have partial data.
//
// Only fill missing company data from Lead.
// Existing company information is not unnecessarily
// overwritten.
//
// ======================================================

const updateCompanyFromLead = async ({
  company,
  lead,
  owner,
  session,
}) => {

  let changed = false;


  // ----------------------------------------------------
  // Basic fields
  // ----------------------------------------------------

  if (
    !company.name &&
    (lead.companyName || lead.name)
  ) {
    company.name =
      normalizeString(
        lead.companyName
      ) ||
      normalizeString(
        lead.name
      );

    changed = true;
  }


  if (
    !company.email &&
    lead.email
  ) {
    company.email =
      normalizeEmail(
        lead.email
      );

    changed = true;
  }


  if (
    !company.phone &&
    lead.phone
  ) {
    company.phone =
      normalizePhone(
        lead.phone
      );

    changed = true;
  }


  if (
    !company.alternatePhone &&
    lead.alternatePhone
  ) {
    company.alternatePhone =
      normalizePhone(
        lead.alternatePhone
      );

    changed = true;
  }


  // ----------------------------------------------------
  // GSTIN
  // ----------------------------------------------------

  if (
    !company.gstin &&
    lead.gstin
  ) {
    company.gstin =
      normalizeGSTIN(
        lead.gstin
      );

    changed = true;
  }


  // ----------------------------------------------------
  // PAN
  // ----------------------------------------------------

  if (
    !company.panNumber &&
    lead.panNumber
  ) {
    company.panNumber =
      normalizePAN(
        lead.panNumber
      );

    changed = true;
  }


  // ----------------------------------------------------
  // Backward-compatible tax number
  // ----------------------------------------------------

  if (
    !company.taxNumber &&
    lead.gstin
  ) {
    company.taxNumber =
      normalizeGSTIN(
        lead.gstin
      );

    changed = true;
  }


  // ----------------------------------------------------
  // Owner
  // ----------------------------------------------------

  if (
    !company.owner &&
    owner
  ) {
    company.owner = owner;

    changed = true;
  }


  // ----------------------------------------------------
  // Address
  // ----------------------------------------------------

  if (!company.address) {
    company.address = {};
  }


  if (
    !company.address.street &&
    lead.address
  ) {
    company.address.street =
      normalizeString(
        lead.address
      );

    changed = true;
  }


  if (
    !company.address.city &&
    lead.city
  ) {
    company.address.city =
      normalizeString(
        lead.city
      );

    changed = true;
  }


  if (
    !company.address.state &&
    lead.state
  ) {
    company.address.state =
      normalizeString(
        lead.state
      );

    changed = true;
  }


  if (
    !company.address.country &&
    lead.country
  ) {
    company.address.country =
      normalizeString(
        lead.country
      );

    changed = true;
  }


  if (
    !company.address.postalCode &&
    lead.postalCode
  ) {
    company.address.postalCode =
      normalizeString(
        lead.postalCode
      );

    changed = true;
  }


  // ----------------------------------------------------
  // Tags
  // ----------------------------------------------------

  const leadTags =
    normalizeTags(
      lead.tags
    );

  if (leadTags.length) {

    const existingTags =
      normalizeTags(
        company.tags
      );

    const mergedTags = [
      ...new Set([
        ...existingTags,
        ...leadTags,
      ]),
    ];

    if (
      mergedTags.length !==
      existingTags.length
    ) {
      company.tags = mergedTags;

      changed = true;
    }
  }


  // ----------------------------------------------------
  // Notes
  // ----------------------------------------------------

  if (
    !company.notes &&
    lead.notes
  ) {
    company.notes =
      normalizeString(
        lead.notes
      );

    changed = true;
  }


  // ----------------------------------------------------
  // Save only when changed
  // ----------------------------------------------------

  if (changed) {
    await company.save({
      session,
    });
  }


  return company;
};


// ======================================================
// CREATE COMPANY FROM LEAD
// ======================================================

const createCompanyFromLead = async ({
  lead,
  owner,
  session,
}) => {

  // ----------------------------------------------------
  // Find existing
  // ----------------------------------------------------

  const existingCompany =
    await findExistingCompany({
      lead,
      session,
    });


  // ----------------------------------------------------
  // Existing company
  // ----------------------------------------------------

  if (existingCompany) {

    return updateCompanyFromLead({
      company:
        existingCompany,

      lead,

      owner,

      session,
    });
  }


  // ----------------------------------------------------
  // Company name required
  // ----------------------------------------------------

  const companyName =
    normalizeString(
      lead.companyName
    ) ||
    normalizeString(
      lead.name
    );


  if (!companyName) {
    return null;
  }


  // ----------------------------------------------------
  // Build company
  // ----------------------------------------------------

  const companyData =
    buildCompanyData({
      lead,
      owner,
    });


  // ----------------------------------------------------
  // Create
  // ----------------------------------------------------

  const [company] =
    await Company.create(
      [companyData],
      {
        session,
      }
    );


  return company;
};


// ======================================================
// CONTACT
// ======================================================

// ======================================================
// FIND EXISTING CONTACT
// ======================================================
//
// Priority:
//
// 1. Existing lead.contact
// 2. Email + company
// 3. Email
// 4. Phone + company
// 5. Phone
//
// ======================================================

const findExistingContact = async ({
  lead,
  companyId,
  session,
}) => {

  // ----------------------------------------------------
  // Existing relation
  // ----------------------------------------------------

  if (
    lead.contact &&
    isValidObjectId(lead.contact)
  ) {

    const contact =
      await Contact.findById(
        lead.contact
      ).session(session);

    if (contact) {
      return contact;
    }
  }


  const email =
    normalizeEmail(
      lead.email
    );

  const phone =
    normalizePhone(
      lead.phone
    );


  // ----------------------------------------------------
  // Email + company
  // ----------------------------------------------------

  if (email && companyId) {

    const contact =
      await Contact.findOne({
        email,
        company: companyId,
      }).session(session);

    if (contact) {
      return contact;
    }
  }


  // ----------------------------------------------------
  // Email globally
  // ----------------------------------------------------

  if (email) {

    const contact =
      await Contact.findOne({
        email,
      }).session(session);

    if (contact) {
      return contact;
    }
  }


  // ----------------------------------------------------
  // Phone + company
  // ----------------------------------------------------

  if (phone && companyId) {

    const contact =
      await Contact.findOne({
        phone,
        company: companyId,
      }).session(session);

    if (contact) {
      return contact;
    }
  }


  // ----------------------------------------------------
  // Phone globally
  // ----------------------------------------------------

  if (phone) {

    const contact =
      await Contact.findOne({
        phone,
      }).session(session);

    if (contact) {
      return contact;
    }
  }


  return null;
};


// ======================================================
// SPLIT CONTACT NAME
// ======================================================

const splitContactName = (
  leadName
) => {

  const fullName =
    normalizeString(
      leadName
    ) ||
    'Unknown Contact';


  const parts =
    fullName.split(/\s+/);


  const firstName =
    parts.shift() ||
    'Unknown';


  const lastName =
    parts.join(' ');


  return {
    firstName,
    lastName,
  };
};


// ======================================================
// UPDATE EXISTING CONTACT
// ======================================================

const updateContactFromLead = async ({
  contact,
  lead,
  companyId,
  owner,
  session,
}) => {

  let changed = false;


  // ----------------------------------------------------
  // Company
  // ----------------------------------------------------

  if (
    companyId &&
    !contact.company
  ) {
    contact.company =
      companyId;

    changed = true;
  }


  // ----------------------------------------------------
  // Owner
  // ----------------------------------------------------

  if (
    !contact.owner &&
    owner
  ) {
    contact.owner =
      owner;

    changed = true;
  }


  // ----------------------------------------------------
  // Designation
  // ----------------------------------------------------

  if (
    !contact.designation &&
    lead.designation
  ) {
    contact.designation =
      normalizeString(
        lead.designation
      );

    changed = true;
  }


  // ----------------------------------------------------
  // Email
  // ----------------------------------------------------

  if (
    !contact.email &&
    lead.email
  ) {
    contact.email =
      normalizeEmail(
        lead.email
      );

    changed = true;
  }


  // ----------------------------------------------------
  // Phone
  // ----------------------------------------------------

  if (
    !contact.phone &&
    lead.phone
  ) {
    contact.phone =
      normalizePhone(
        lead.phone
      );

    changed = true;
  }


  // ----------------------------------------------------
  // Alternate phone
  // ----------------------------------------------------

  if (
    !contact.alternatePhone &&
    lead.alternatePhone
  ) {
    contact.alternatePhone =
      normalizePhone(
        lead.alternatePhone
      );

    changed = true;
  }


  // ----------------------------------------------------
  // Address
  // ----------------------------------------------------

  if (
    !contact.address &&
    lead.address
  ) {
    contact.address =
      normalizeString(
        lead.address
      );

    changed = true;
  }


  if (
    !contact.city &&
    lead.city
  ) {
    contact.city =
      normalizeString(
        lead.city
      );

    changed = true;
  }


  if (
    !contact.state &&
    lead.state
  ) {
    contact.state =
      normalizeString(
        lead.state
      );

    changed = true;
  }


  if (
    !contact.country &&
    lead.country
  ) {
    contact.country =
      normalizeString(
        lead.country
      );

    changed = true;
  }


  if (
    !contact.postalCode &&
    lead.postalCode
  ) {
    contact.postalCode =
      normalizeString(
        lead.postalCode
      );

    changed = true;
  }


  // ----------------------------------------------------
  // Tags
  // ----------------------------------------------------

  const leadTags =
    normalizeTags(
      lead.tags
    );

  if (leadTags.length) {

    const existingTags =
      normalizeTags(
        contact.tags
      );

    const mergedTags = [
      ...new Set([
        ...existingTags,
        ...leadTags,
      ]),
    ];

    if (
      mergedTags.length !==
      existingTags.length
    ) {
      contact.tags =
        mergedTags;

      changed = true;
    }
  }


  // ----------------------------------------------------
  // Notes
  // ----------------------------------------------------

  if (
    !contact.notes &&
    lead.notes
  ) {
    contact.notes =
      normalizeString(
        lead.notes
      );

    changed = true;
  }


  // ----------------------------------------------------
  // Save
  // ----------------------------------------------------

  if (changed) {
    await contact.save({
      session,
    });
  }


  return contact;
};


// ======================================================
// CREATE CONTACT FROM LEAD
// ======================================================

const createContactFromLead = async ({
  lead,
  companyId,
  owner,
  session,
}) => {

  // ----------------------------------------------------
  // Find existing
  // ----------------------------------------------------

  const existingContact =
    await findExistingContact({
      lead,
      companyId,
      session,
    });


  // ----------------------------------------------------
  // Existing contact
  // ----------------------------------------------------

  if (existingContact) {

    return updateContactFromLead({
      contact:
        existingContact,

      lead,

      companyId,

      owner,

      session,
    });
  }


  // ----------------------------------------------------
  // Name
  // ----------------------------------------------------

  const {
    firstName,
    lastName,
  } =
    splitContactName(
      lead.name
    );


  // ----------------------------------------------------
  // Create
  // ----------------------------------------------------

  const [contact] =
    await Contact.create(
      [
        {
          firstName,

          lastName,

          designation:
            normalizeString(
              lead.designation
            ),

          email:
            normalizeEmail(
              lead.email
            ),

          phone:
            normalizePhone(
              lead.phone
            ),

          alternatePhone:
            normalizePhone(
              lead.alternatePhone
            ),

          company:
            companyId || null,

          owner,

          source:
            normalizeUpper(
              lead.source
            ),

          status:
            CONTACT_STATUS,

          address:
            normalizeString(
              lead.address
            ),

          city:
            normalizeString(
              lead.city
            ),

          state:
            normalizeString(
              lead.state
            ),

          country:
            normalizeString(
              lead.country
            ),

          postalCode:
            normalizeString(
              lead.postalCode
            ),

          tags:
            normalizeTags(
              lead.tags
            ),

          notes:
            normalizeString(
              lead.notes
            ),

          lastContactAt:
            lead.lastContactAt ||
            null,

          nextFollowUpAt:
            lead.nextFollowUpAt ||
            null,
        },
      ],
      {
        session,
      }
    );


  return contact;
};


// ======================================================
// OPPORTUNITY
// ======================================================

const createOpportunityFromLead = async ({
  lead,
  companyId,
  contactId,
  owner,
  session,
}) => {

  // ----------------------------------------------------
  // Relation validation
  // ----------------------------------------------------

  if (
    !companyId &&
    !contactId
  ) {
    throw new ApiError(
      400,
      'Company or contact is required to create an opportunity',
      'OPPORTUNITY_RELATION_REQUIRED'
    );
  }


  // ----------------------------------------------------
  // Opportunity name
  // ----------------------------------------------------

  const leadName =
    normalizeString(
      lead.name
    ) ||
    'Lead';


  const opportunityName =
    `${leadName} Opportunity`;


  // ----------------------------------------------------
  // Value
  // ----------------------------------------------------

  const value =
    Number(
      lead.value || 0
    );


  if (
    Number.isNaN(value) ||
    value < 0
  ) {
    throw new ApiError(
      400,
      'Invalid lead value',
      'INVALID_LEAD_VALUE'
    );
  }


  // ----------------------------------------------------
  // Create
  // ----------------------------------------------------

  const [opportunity] =
    await Opportunity.create(
      [
        {
          name:
            opportunityName,

          company:
            companyId || null,

          contact:
            contactId || null,

          lead:
            lead._id,

          owner,

          value,

          currency:
            normalizeUpper(
              lead.currency
            ) ||
            'INR',

          stage:
            OPPORTUNITY_STAGE,
        },
      ],
      {
        session,
      }
    );


  return opportunity;
};


// ======================================================
// UPDATE LEAD AFTER CONVERSION
// ======================================================

const updateLeadAfterConversion = async ({
  lead,
  companyId,
  contactId,
  opportunityId,
  session,
}) => {

  lead.company =
    companyId || null;

  lead.contact =
    contactId || null;

  lead.convertedOpportunity =
    opportunityId;

  lead.convertedAt =
    new Date();

  lead.status =
    LEAD_STATUS_WON;

  // ----------------------------------------------------
  // Conversion completed, follow-up no longer pending
  // ----------------------------------------------------

  lead.nextFollowUpAt =
    null;


  await lead.save({
    session,
  });


  return lead;
};


// ======================================================
// CONVERT LEAD
// ======================================================
//
// Main conversion method.
//
// ======================================================

const convertLead = async (
  leadId,
  userId
) => {

  // ====================================================
  // VALIDATE LEAD ID
  // ====================================================

  if (
    !isValidObjectId(
      leadId
    )
  ) {
    throw new ApiError(
      400,
      'Invalid lead ID',
      'INVALID_LEAD_ID'
    );
  }


  // ====================================================
  // VALIDATE USER ID
  // ====================================================

  if (
    !isValidObjectId(
      userId
    )
  ) {
    throw new ApiError(
      401,
      'Invalid authenticated user',
      'INVALID_USER'
    );
  }


  // ====================================================
  // SESSION
  // ====================================================

  const session =
    await mongoose.startSession();


  let result =
    null;


  try {

    await session.withTransaction(
      async () => {

        // ==============================================
        // FETCH LEAD
        // ==============================================

        const lead =
          await Lead.findById(
            leadId
          ).session(session);


        if (!lead) {
          throw new ApiError(
            404,
            'Lead not found',
            'LEAD_NOT_FOUND'
          );
        }


        // ==============================================
        // PREVENT DUPLICATE CONVERSION
        // ==============================================

        if (
          lead.convertedOpportunity
        ) {
          throw new ApiError(
            409,
            'Lead has already been converted',
            'LEAD_ALREADY_CONVERTED'
          );
        }


        // ==============================================
        // OWNER
        // ==============================================

        const owner =
          resolveOwner(
            lead,
            userId
          );


        // ==============================================
        // COMPANY
        // ==============================================

        const company =
          await createCompanyFromLead({
            lead,
            owner,
            session,
          });


        const companyId =
          company?._id ||
          lead.company ||
          null;


        // ==============================================
        // CONTACT
        // ==============================================

        const contact =
          await createContactFromLead({
            lead,
            companyId,
            owner,
            session,
          });


        const contactId =
          contact?._id ||
          lead.contact ||
          null;


        // ==============================================
        // OPPORTUNITY
        // ==============================================

        const opportunity =
          await createOpportunityFromLead({
            lead,
            companyId,
            contactId,
            owner,
            session,
          });


        // ==============================================
        // UPDATE LEAD
        // ==============================================

        await updateLeadAfterConversion({
          lead,

          companyId,

          contactId,

          opportunityId:
            opportunity._id,

          session,
        });


        // ==============================================
        // RESULT
        // ==============================================

        result =
          opportunity;
      }
    );


    // ==================================================
    // FINAL POPULATION
    // ==================================================

    if (result) {

      await result.populate([
        {
          path: 'company',
        },

        {
          path: 'contact',
        },

        {
          path: 'lead',
        },

        {
          path: 'owner',
        },
      ]);
    }


    return result;

  } finally {

    await session.endSession();
  }
};


// ======================================================
// EXPORT
// ======================================================

module.exports = {
  convertLead,
};