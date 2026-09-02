'use strict';

const { z } = require('zod');

// ======================================================
// COMMON VALIDATORS
// ======================================================

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(120, 'Name must not exceed 120 characters');

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Please provide a valid email address')
  .max(254, 'Email address is too long');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must not exceed 72 characters');

const phoneSchema = z
  .string()
  .trim()
  .min(7, 'Phone number is too short')
  .max(30, 'Phone number must not exceed 30 characters')
  .regex(
    /^[+]?[\d\s().-]+$/,
    'Please provide a valid phone number'
  );

// ======================================================
// REGISTER
// ======================================================

const registerSchema = z
  .object({
    name: nameSchema,

    email: emailSchema,

    password: passwordSchema,

    phone: phoneSchema.optional(),
  })
  .strict();

// ======================================================
// LOGIN
// ======================================================

const loginSchema = z
  .object({
    email: emailSchema,

    password: passwordSchema,
  })
  .strict();

// ======================================================
// REFRESH TOKEN
// ======================================================

const refreshTokenSchema = z
  .object({
    refreshToken: z
      .string()
      .trim()
      .min(
        1,
        'Refresh token is required'
      ),
  })
  .strict();

// ======================================================
// CHANGE PASSWORD
// ======================================================

const changePasswordSchema = z
  .object({
    currentPassword: passwordSchema,

    newPassword: passwordSchema,

    confirmPassword: passwordSchema,
  })
  .strict()
  .superRefine(
    (data, ctx) => {
      if (
        data.newPassword !==
        data.confirmPassword
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode
            .custom,
          path: [
            'confirmPassword',
          ],
          message:
            'Passwords do not match',
        });
      }

      if (
        data.currentPassword ===
        data.newPassword
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode
            .custom,
          path: [
            'newPassword',
          ],
          message:
            'New password must be different from current password',
        });
      }
    }
  );

// ======================================================
// FORGOT PASSWORD
// ======================================================

const forgotPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

// ======================================================
// RESET PASSWORD
// ======================================================

const resetPasswordSchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(
        1,
        'Reset token is required'
      ),

    password: passwordSchema,

    confirmPassword: passwordSchema,
  })
  .strict()
  .superRefine(
    (data, ctx) => {
      if (
        data.password !==
        data.confirmPassword
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode
            .custom,
          path: [
            'confirmPassword',
          ],
          message:
            'Passwords do not match',
        });
      }
    }
  );

// ======================================================
// VERIFY EMAIL
// ======================================================

const verifyEmailSchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(
        1,
        'Verification token is required'
      ),
  })
  .strict();

// ======================================================
// RESEND VERIFICATION EMAIL
// ======================================================

const resendVerificationSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

// ======================================================
// UPDATE PROFILE
// ======================================================
//
// Useful for:
// PUT /api/auth/profile
//
// All fields optional.
// At least one field required.
//

const updateProfileSchema = z
  .object({
    name: nameSchema.optional(),

    email: emailSchema.optional(),

    phone: phoneSchema.optional(),
  })
  .strict()
  .refine(
    (data) =>
      Object.keys(data).length > 0,
    {
      message:
        'At least one field is required',
    }
  );

// ======================================================
// PASSWORD STRENGTH HELPER
// ======================================================
//
// Optional stronger validation if you want it later.
//
// Current project keeps minimum requirement at
// 8 characters so existing users are not affected.
// ======================================================

const strongPasswordSchema = passwordSchema
  .refine(
    (value) => /[A-Z]/.test(value),
    {
      message:
        'Password must contain at least one uppercase letter',
    }
  )
  .refine(
    (value) => /[a-z]/.test(value),
    {
      message:
        'Password must contain at least one lowercase letter',
    }
  )
  .refine(
    (value) => /\d/.test(value),
    {
      message:
        'Password must contain at least one number',
    }
  );

// ======================================================
// EXPORT
// ======================================================

module.exports = {
  // Common
  nameSchema,
  emailSchema,
  passwordSchema,
  phoneSchema,
  strongPasswordSchema,

  // Auth
  registerSchema,
  loginSchema,
  refreshTokenSchema,

  // Password
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,

  // Email
  verifyEmailSchema,
  resendVerificationSchema,

  // Profile
  updateProfileSchema,
};