'use strict';


// ======================================================
// CRM SYSTEM CONSTANTS
// ======================================================
// Single source of truth for:
// - Roles
// - Lead statuses/sources
// - Opportunity stages
// - Activity types
// - Invoice statuses
// - Quotation statuses
// - Payment statuses
// - Company/contact statuses
// - Common pagination limits
// ======================================================


// ======================================================
// ROLES
// ======================================================

const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  SALES: 'SALES',
  SUPPORT: 'SUPPORT',
  USER: 'USER',
});


// ======================================================
// LEAD STATUSES
// ======================================================

const LEAD_STATUSES = Object.freeze([
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST',
]);


// ======================================================
// LEAD SOURCES
// ======================================================

const LEAD_SOURCES = Object.freeze([
  'WEBSITE',
  'REFERRAL',
  'SOCIAL_MEDIA',
  'ADVERTISEMENT',
  'EMAIL',
  'PHONE',
  'WALK_IN',
  'IMPORT',
  'OTHER',
]);


// ======================================================
// OPPORTUNITY STAGES
// ======================================================

const OPPORTUNITY_STAGES = Object.freeze([
  'QUALIFICATION',
  'DISCOVERY',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
]);


// ======================================================
// ACTIVITY TYPES
// ======================================================

const ACTIVITY_TYPES = Object.freeze([
  'CALL',
  'EMAIL',
  'MEETING',
  'DEMO',
  'FOLLOW_UP',
  'WHATSAPP',
  'OTHER',
]);


// ======================================================
// COMPANY STATUS
// ======================================================

const COMPANY_STATUSES = Object.freeze([
  'ACTIVE',
  'INACTIVE',
]);


// ======================================================
// CONTACT STATUS
// ======================================================

const CONTACT_STATUSES = Object.freeze([
  'ACTIVE',
  'INACTIVE',
]);


// ======================================================
// INVOICE STATUSES
// ======================================================

const INVOICE_STATUSES = Object.freeze([
  'DRAFT',
  'SENT',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
]);


// ======================================================
// QUOTATION STATUSES
// ======================================================

const QUOTATION_STATUSES = Object.freeze([
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED',
]);


// ======================================================
// PAYMENT STATUSES
// ======================================================

const PAYMENT_STATUSES = Object.freeze([
  'PENDING',
  'PARTIALLY_PAID',
  'PAID',
  'FAILED',
  'REFUNDED',
  'CANCELLED',
]);


// ======================================================
// PAYMENT METHODS
// ======================================================

const PAYMENT_METHODS = Object.freeze([
  'CASH',
  'BANK_TRANSFER',
  'CARD',
  'UPI',
  'CHEQUE',
  'PAYPAL',
  'STRIPE',
  'OTHER',
]);


// ======================================================
// CURRENCY
// ======================================================

const CURRENCIES = Object.freeze([
  'INR',
  'USD',
  'EUR',
  'GBP',
  'AED',
  'SGD',
  'AUD',
  'CAD',
]);


// ======================================================
// PRIORITIES
// ======================================================

const PRIORITIES = Object.freeze([
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
]);


// ======================================================
// TASK STATUSES
// ======================================================

const TASK_STATUSES = Object.freeze([
  'TODO',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);


// ======================================================
// COMMUNICATION CHANNELS
// ======================================================

const COMMUNICATION_CHANNELS =
  Object.freeze([
    'EMAIL',
    'PHONE',
    'WHATSAPP',
    'SMS',
    'MEETING',
    'OTHER',
  ]);


// ======================================================
// USER ACCOUNT STATUS
// ======================================================

const USER_STATUS = Object.freeze([
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
]);


// ======================================================
// AUDIT ACTIONS
// ======================================================

const AUDIT_ACTIONS = Object.freeze([
  'CREATE',
  'UPDATE',
  'DELETE',
  'LOGIN',
  'LOGOUT',
  'EXPORT',
  'IMPORT',
  'ASSIGN',
  'CONVERT',
  'STATUS_CHANGE',
  'PAYMENT',
  'PASSWORD_CHANGE',
]);


// ======================================================
// CRM MODULES
// ======================================================

const CRM_MODULES = Object.freeze([
  'DASHBOARD',
  'COMPANY',
  'CONTACT',
  'LEAD',
  'OPPORTUNITY',
  'ACTIVITY',
  'QUOTATION',
  'INVOICE',
  'PRODUCT',
  'INVENTORY',
  'USER',
  'ROLE',
  'REPORT',
  'AUDIT_LOG',
]);


// ======================================================
// PERMISSION ACTIONS
// ======================================================

const PERMISSION_ACTIONS = Object.freeze([
  'READ',
  'CREATE',
  'UPDATE',
  'DELETE',
  'ASSIGN',
  'CONVERT',
  'EXPORT',
  'IMPORT',
  'PAYMENT',
]);


// ======================================================
// PAGINATION
// ======================================================

const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
});


// ======================================================
// DEFAULT VALUES
// ======================================================

const DEFAULTS = Object.freeze({
  CURRENCY: 'INR',
  LEAD_STATUS: 'NEW',
  LEAD_SOURCE: 'OTHER',
  COMPANY_STATUS: 'ACTIVE',
  CONTACT_STATUS: 'ACTIVE',
  INVOICE_STATUS: 'DRAFT',
  QUOTATION_STATUS: 'DRAFT',
  PRIORITY: 'MEDIUM',
});


// ======================================================
// EXPORT
// ======================================================

module.exports = {
  ROLES,

  LEAD_STATUSES,
  LEAD_SOURCES,

  OPPORTUNITY_STAGES,

  ACTIVITY_TYPES,

  COMPANY_STATUSES,
  CONTACT_STATUSES,

  INVOICE_STATUSES,
  QUOTATION_STATUSES,

  PAYMENT_STATUSES,
  PAYMENT_METHODS,

  CURRENCIES,

  PRIORITIES,
  TASK_STATUSES,

  COMMUNICATION_CHANNELS,

  USER_STATUS,

  AUDIT_ACTIONS,
  CRM_MODULES,
  PERMISSION_ACTIONS,

  PAGINATION,
  DEFAULTS,
};