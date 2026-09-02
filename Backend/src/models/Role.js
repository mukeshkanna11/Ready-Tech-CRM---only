'use strict';

const mongoose = require('mongoose');


// ======================================================
// ROLE SCHEMA
// ======================================================

const roleSchema = new mongoose.Schema(
  {
    // --------------------------------------------------
    // ROLE NAME
    // --------------------------------------------------

    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [2, 'Role name must be at least 2 characters'],
      maxlength: [80, 'Role name cannot exceed 80 characters'],
    },


    // --------------------------------------------------
    // DESCRIPTION
    // --------------------------------------------------

    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },


    // --------------------------------------------------
    // PERMISSIONS
    // --------------------------------------------------
    //
    // Examples:
    //
    // LEADS:READ
    // LEADS:CREATE
    // LEADS:UPDATE
    // LEADS:DELETE
    //
    // LEADS:*
    //
    // *
    //
    // --------------------------------------------------

    permissions: {
      type: [
        {
          type: String,
          trim: true,
          uppercase: true,
          maxlength: 100,
        },
      ],

      default: [],

      // Prevent duplicate permissions
      validate: {
        validator: function validatePermissions(
          permissions
        ) {
          if (!Array.isArray(permissions)) {
            return false;
          }

          const normalized =
            permissions.map(
              (permission) =>
                String(permission)
                  .trim()
                  .toUpperCase()
            );

          return (
            new Set(normalized).size ===
            normalized.length
          );
        },

        message:
          'Role permissions must be unique',
      },
    },


    // --------------------------------------------------
    // SYSTEM ROLE
    // --------------------------------------------------

    isSystem: {
      type: Boolean,
      default: false,
      index: true,
    },


    // --------------------------------------------------
    // ACTIVE STATUS
    // --------------------------------------------------

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,

    versionKey: false,

    toJSON: {
      transform: (_doc, ret) => {
        // Normalize output
        if (
          Array.isArray(
            ret.permissions
          )
        ) {
          ret.permissions =
            ret.permissions.map(
              (permission) =>
                String(permission)
                  .trim()
                  .toUpperCase()
            );
        }

        return ret;
      },
    },
  }
);


// ======================================================
// INDEXES
// ======================================================


roleSchema.index({
  isSystem: 1,
  isActive: 1,
});

roleSchema.index({
  createdAt: -1,
});


// ======================================================
// NORMALIZE ROLE DATA
// ======================================================

roleSchema.pre(
  'validate',
  function normalizeRole(next) {
    // ----------------------------------------------
    // Normalize role name
    // ----------------------------------------------

    if (this.name) {
      this.name =
        this.name
          .trim()
          .toUpperCase();
    }

    // ----------------------------------------------
    // Normalize permissions
    // ----------------------------------------------

    if (
      Array.isArray(
        this.permissions
      )
    ) {
      this.permissions =
        [
          ...new Set(
            this.permissions
              .map(
                (permission) =>
                  String(
                    permission
                  )
                    .trim()
                    .toUpperCase()
              )
              .filter(Boolean)
          ),
        ];
    }

    next();
  }
);


// ======================================================
// PERMISSION CHECK
// ======================================================

roleSchema.methods.hasPermission =
  function hasPermission(
    requiredPermission
  ) {
    if (
      !requiredPermission
    ) {
      return false;
    }

    const required =
      String(
        requiredPermission
      )
        .trim()
        .toUpperCase();

    const permissions =
      Array.isArray(
        this.permissions
      )
        ? this.permissions
        : [];

    return permissions.some(
      (granted) => {
        const permission =
          String(
            granted
          )
            .trim()
            .toUpperCase();

        // Full access
        if (
          permission === '*'
        ) {
          return true;
        }

        // Exact permission
        if (
          permission === required
        ) {
          return true;
        }

        // Module wildcard
        //
        // LEADS:*
        // allows
        // LEADS:READ
        // LEADS:CREATE
        // LEADS:UPDATE
        //

        if (
          permission.endsWith(
            ':*'
          )
        ) {
          const prefix =
            permission.slice(
              0,
              -2
            );

          return (
            required === prefix ||
            required.startsWith(
              `${prefix}:`
            )
          );
        }

        return false;
      }
    );
  };


// ======================================================
// MULTIPLE PERMISSION CHECK
// ======================================================

roleSchema.methods.hasAnyPermission =
  function hasAnyPermission(
    requiredPermissions = []
  ) {
    if (
      !Array.isArray(
        requiredPermissions
      )
    ) {
      return false;
    }

    return requiredPermissions.some(
      (permission) =>
        this.hasPermission(
          permission
        )
    );
  };


// ======================================================
// ALL PERMISSIONS CHECK
// ======================================================

roleSchema.methods.hasAllPermissions =
  function hasAllPermissions(
    requiredPermissions = []
  ) {
    if (
      !Array.isArray(
        requiredPermissions
      )
    ) {
      return false;
    }

    return requiredPermissions.every(
      (permission) =>
        this.hasPermission(
          permission
        )
    );
  };


// ======================================================
// SYSTEM ROLE CHECK
// ======================================================

roleSchema.methods.isSystemRole =
  function isSystemRole() {
    return this.isSystem === true;
  };


// ======================================================
// MODEL
// ======================================================

const Role =
  mongoose.model(
    'Role',
    roleSchema
  );

module.exports = Role;