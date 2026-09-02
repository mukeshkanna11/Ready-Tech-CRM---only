'use strict';

const { z } = require('zod');


// ======================================================
// HELPERS
// ======================================================

const objectIdSchema = z
  .string()
  .trim()
  .regex(
    /^[a-fA-F0-9]{24}$/,
    'Invalid MongoDB ObjectId'
  );


// ======================================================
// COMMON FIELDS
// ======================================================

const nameSchema = z
  .string()
  .trim()
  .min(
    2,
    'Name must be at least 2 characters'
  )
  .max(
    120,
    'Name cannot exceed 120 characters'
  );


const emailSchema = z
  .string()
  .trim()
  .email(
    'Please provide a valid email address'
  )
  .transform(
    (value) =>
      value.toLowerCase()
  );


const phoneSchema = z
  .string()
  .trim()
  .max(
    30,
    'Phone number cannot exceed 30 characters'
  )
  .optional()
  .or(
    z.literal('')
  );


const passwordSchema = z
  .string()
  .min(
    8,
    'Password must be at least 8 characters'
  )
  .max(
    72,
    'Password cannot exceed 72 characters'
  );


// ======================================================
// CREATE USER
// ======================================================
//
// POST /api/v1/users
//
// Admin creates a CRM user.
//
// ======================================================

const createUserSchema = z
  .object({
    name: nameSchema,

    email: emailSchema,

    password: passwordSchema,

    phone: phoneSchema,

    role: objectIdSchema,
  })
  .strict();


// ======================================================
// UPDATE USER
// ======================================================
//
// PUT /api/v1/users/:id
//
// Password is intentionally NOT included here.
// Password changes should use a dedicated endpoint.
//
// ======================================================

const updateUserSchema = z
  .object({
    name: nameSchema.optional(),

    phone: phoneSchema,

    avatar: z
      .string()
      .trim()
      .max(
        500,
        'Avatar URL cannot exceed 500 characters'
      )
      .optional()
      .or(
        z.literal('')
      ),

    role: objectIdSchema.optional(),

    isActive:
      z.boolean().optional(),
  })
  .strict();


// ======================================================
// UPDATE USER STATUS
// ======================================================
//
// PATCH /api/v1/users/:id/status
//
// ======================================================

const updateUserStatusSchema =
  z
    .object({
      isActive:
        z.boolean(),
    })
    .strict();


// ======================================================
// CHANGE PASSWORD
// ======================================================
//
// Dedicated password-change validation.
//
// ======================================================

const changePasswordSchema =
  z
    .object({
      currentPassword:
        passwordSchema,

      newPassword:
        passwordSchema,

      confirmPassword:
        passwordSchema,
    })
    .strict()
    .refine(
      (data) =>
        data.newPassword ===
        data.confirmPassword,
      {
        message:
          'Passwords do not match',
        path: [
          'confirmPassword',
        ],
      }
    )
    .refine(
      (data) =>
        data.currentPassword !==
        data.newPassword,
      {
        message:
          'New password must be different from current password',
        path: [
          'newPassword',
        ],
      }
    );


// ======================================================
// ADMIN RESET PASSWORD
// ======================================================
//
// Admin can reset another user's password.
//
// ======================================================

const resetUserPasswordSchema =
  z
    .object({
      password:
        passwordSchema,

      confirmPassword:
        passwordSchema,
    })
    .strict()
    .refine(
      (data) =>
        data.password ===
        data.confirmPassword,
      {
        message:
          'Passwords do not match',
        path: [
          'confirmPassword',
        ],
      }
    );


// ======================================================
// USER LIST QUERY
// ======================================================
//
// GET /api/v1/users
//
// Supports:
//
// ?page=1
// ?limit=20
// ?search=arun
// ?role=ROLE_ID
// ?isActive=true
// ?sort=-createdAt
//
// ======================================================

const listUsersQuerySchema =
  z
    .object({
      page: z
        .coerce
        .number()
        .int()
        .min(1)
        .optional(),

      limit: z
        .coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .optional(),

      search: z
        .string()
        .trim()
        .max(120)
        .optional(),

      role:
        objectIdSchema.optional(),

      isActive:
        z
          .enum([
            'true',
            'false',
          ])
          .optional(),

      sort: z
        .string()
        .trim()
        .max(100)
        .optional(),

      fromDate: z
        .string()
        .optional(),

      toDate: z
        .string()
        .optional(),
    })
    .strict();


// ======================================================
// USER ID PARAMS
// ======================================================

const userIdParamsSchema =
  z
    .object({
      id: objectIdSchema,
    })
    .strict();


// ======================================================
// EXPORT
// ======================================================

module.exports = {
  createUserSchema,

  updateUserSchema,

  updateUserStatusSchema,

  changePasswordSchema,

  resetUserPasswordSchema,

  listUsersQuerySchema,

  userIdParamsSchema,
};