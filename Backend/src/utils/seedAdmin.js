'use strict';


// ======================================================
// ENVIRONMENT
// ======================================================

require('../config/env');


// ======================================================
// DEPENDENCIES
// ======================================================

const mongoose = require('mongoose');

const env = require('../config/env');

const {
  connectDB,
  disconnectDB,
} = require('../config/db');

const Role = require('../models/Role');
const User = require('../models/User');


// ======================================================
// SUPER ADMIN PERMISSIONS
// ======================================================
//
// "*" gives complete access.
//
// Keeping the module permissions here as well makes the
// seed useful if later you decide to remove wildcard
// access and use granular permissions.
//
// ======================================================

const SUPER_ADMIN_PERMISSIONS = [
  '*',

  // Dashboard
  'DASHBOARD:READ',

  // Companies
  'COMPANIES:READ',
  'COMPANIES:CREATE',
  'COMPANIES:UPDATE',
  'COMPANIES:DELETE',

  // Contacts
  'CONTACTS:READ',
  'CONTACTS:CREATE',
  'CONTACTS:UPDATE',
  'CONTACTS:DELETE',

  // Leads
  'LEADS:READ',
  'LEADS:CREATE',
  'LEADS:UPDATE',
  'LEADS:DELETE',
  'LEADS:ASSIGN',
  'LEADS:CONVERT',

  // Opportunities
  'OPPORTUNITIES:READ',
  'OPPORTUNITIES:CREATE',
  'OPPORTUNITIES:UPDATE',
  'OPPORTUNITIES:DELETE',

  // Activities
  'ACTIVITIES:READ',
  'ACTIVITIES:CREATE',
  'ACTIVITIES:UPDATE',
  'ACTIVITIES:DELETE',

  // Tasks
  'TASKS:READ',
  'TASKS:CREATE',
  'TASKS:UPDATE',
  'TASKS:DELETE',
  'TASKS:ASSIGN',

  // Notes
  'NOTES:READ',
  'NOTES:CREATE',
  'NOTES:UPDATE',
  'NOTES:DELETE',

  // Products
  'PRODUCTS:READ',
  'PRODUCTS:CREATE',
  'PRODUCTS:UPDATE',
  'PRODUCTS:DELETE',

  // Quotations
  'QUOTATIONS:READ',
  'QUOTATIONS:CREATE',
  'QUOTATIONS:UPDATE',
  'QUOTATIONS:DELETE',

  // Invoices
  'INVOICES:READ',
  'INVOICES:CREATE',
  'INVOICES:UPDATE',
  'INVOICES:DELETE',
  'INVOICES:PAYMENT',

  // Notifications
  'NOTIFICATIONS:READ',
  'NOTIFICATIONS:CREATE',
  'NOTIFICATIONS:UPDATE',
  'NOTIFICATIONS:DELETE',

  // Reports
  'REPORTS:READ',
  'REPORTS:EXPORT',

  // Users
  'USERS:READ',
  'USERS:CREATE',
  'USERS:UPDATE',
  'USERS:DELETE',

  // Roles
  'ROLES:READ',
  'ROLES:CREATE',
  'ROLES:UPDATE',
  'ROLES:DELETE',

  // Audit
  'AUDIT_LOGS:READ',
];


// ======================================================
// DEFAULT ROLES
// ======================================================
//
// These roles can be created once and then managed from
// the CRM admin panel.
//
// ======================================================

const DEFAULT_ROLES = [
  {
    name: 'SUPER_ADMIN',

    description:
      'Full CRM system access',

    permissions:
      SUPER_ADMIN_PERMISSIONS,

    isSystem: true,
    isActive: true,
  },

  {
    name: 'ADMIN',

    description:
      'Administrative CRM access',

    permissions: [
      'DASHBOARD:READ',

      'COMPANIES:*',
      'CONTACTS:*',
      'LEADS:*',
      'OPPORTUNITIES:*',
      'ACTIVITIES:*',
      'TASKS:*',
      'NOTES:*',
      'PRODUCTS:*',
      'QUOTATIONS:*',
      'INVOICES:*',

      'USERS:READ',
      'USERS:CREATE',
      'USERS:UPDATE',

      'ROLES:READ',

      'REPORTS:READ',
      'REPORTS:EXPORT',

      'AUDIT_LOGS:READ',
    ],

    isSystem: true,
    isActive: true,
  },

  {
    name: 'MANAGER',

    description:
      'CRM manager access',

    permissions: [
      'DASHBOARD:READ',

      'COMPANIES:*',
      'CONTACTS:*',
      'LEADS:*',
      'OPPORTUNITIES:*',
      'ACTIVITIES:*',
      'TASKS:*',
      'NOTES:*',

      'PRODUCTS:READ',

      'QUOTATIONS:*',

      'INVOICES:READ',
      'INVOICES:PAYMENT',

      'REPORTS:READ',
      'REPORTS:EXPORT',
    ],

    isSystem: true,
    isActive: true,
  },

  {
    name: 'SALES',

    description:
      'Sales team CRM access',

    permissions: [
      'DASHBOARD:READ',

      'COMPANIES:READ',
      'COMPANIES:CREATE',
      'COMPANIES:UPDATE',

      'CONTACTS:READ',
      'CONTACTS:CREATE',
      'CONTACTS:UPDATE',

      'LEADS:READ',
      'LEADS:CREATE',
      'LEADS:UPDATE',
      'LEADS:ASSIGN',
      'LEADS:CONVERT',

      'OPPORTUNITIES:READ',
      'OPPORTUNITIES:CREATE',
      'OPPORTUNITIES:UPDATE',

      'ACTIVITIES:READ',
      'ACTIVITIES:CREATE',
      'ACTIVITIES:UPDATE',

      'TASKS:READ',
      'TASKS:CREATE',
      'TASKS:UPDATE',

      'NOTES:READ',
      'NOTES:CREATE',
      'NOTES:UPDATE',

      'PRODUCTS:READ',

      'QUOTATIONS:READ',
      'QUOTATIONS:CREATE',
      'QUOTATIONS:UPDATE',

      'INVOICES:READ',

      'REPORTS:READ',
    ],

    isSystem: true,
    isActive: true,
  },

  {
    name: 'SUPPORT',

    description:
      'Customer support CRM access',

    permissions: [
      'DASHBOARD:READ',

      'COMPANIES:READ',
      'CONTACTS:READ',

      'LEADS:READ',
      'LEADS:UPDATE',

      'ACTIVITIES:READ',
      'ACTIVITIES:CREATE',
      'ACTIVITIES:UPDATE',

      'TASKS:READ',
      'TASKS:CREATE',
      'TASKS:UPDATE',

      'NOTES:READ',
      'NOTES:CREATE',
      'NOTES:UPDATE',

      'INVOICES:READ',

      'NOTIFICATIONS:READ',
    ],

    isSystem: true,
    isActive: true,
  },

  {
    name: 'USER',

    description:
      'Basic CRM user access',

    permissions: [
      'DASHBOARD:READ',

      'COMPANIES:READ',
      'CONTACTS:READ',

      'LEADS:READ',
      'LEADS:CREATE',
      'LEADS:UPDATE',

      'OPPORTUNITIES:READ',

      'ACTIVITIES:READ',
      'ACTIVITIES:CREATE',

      'TASKS:READ',
      'TASKS:CREATE',
      'TASKS:UPDATE',

      'NOTES:READ',
      'NOTES:CREATE',

      'PRODUCTS:READ',

      'QUOTATIONS:READ',

      'INVOICES:READ',

      'NOTIFICATIONS:READ',
    ],

    isSystem: true,
    isActive: true,
  },
];


// ======================================================
// NORMALIZE PERMISSIONS
// ======================================================

const normalizePermissions = (
  permissions = []
) => {
  return [
    ...new Set(
      permissions
        .map(
          (permission) =>
            String(permission)
              .trim()
              .toUpperCase()
        )
        .filter(Boolean)
    ),
  ];
};


// ======================================================
// SEED ROLES
// ======================================================

const seedRoles = async () => {
  const roles = {};

  for (const roleData of DEFAULT_ROLES) {
    const normalizedPermissions =
      normalizePermissions(
        roleData.permissions
      );

    const role =
      await Role.findOneAndUpdate(
        {
          name: roleData.name,
        },
        {
          $set: {
            description:
              roleData.description,

            permissions:
              normalizedPermissions,

            isSystem:
              roleData.isSystem,

            isActive:
              roleData.isActive,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
          runValidators: true,
        }
      );

    roles[
      roleData.name
    ] = role;
  }

  return roles;
};


// ======================================================
// SEED ADMIN USER
// ======================================================

const seedAdminUser = async (
  superAdminRole
) => {
  if (
    !env.adminEmail ||
    !env.adminPassword
  ) {
    throw new Error(
      'ADMIN_EMAIL and ADMIN_PASSWORD must be configured in .env'
    );
  }

  const email =
    String(
      env.adminEmail
    )
      .trim()
      .toLowerCase();

  const name =
    String(
      env.adminName ||
      'Super Administrator'
    ).trim();

  let admin =
    await User.findOne({
      email,
    });

  if (!admin) {
    admin =
      await User.create({
        name,

        email,

        password:
          env.adminPassword,

        phone:
          env.adminPhone ||
          undefined,

        role:
          superAdminRole._id,

        isActive: true,
      });

    console.log(
      `Admin created: ${email}`
    );

    return admin;
  }


  // --------------------------------------------------
  // Existing admin
  // --------------------------------------------------

  const updates = {};

  if (
    !admin.role ||
    String(
      admin.role
    ) !==
      String(
        superAdminRole._id
      )
  ) {
    updates.role =
      superAdminRole._id;
  }

  if (
    admin.isActive !==
    true
  ) {
    updates.isActive =
      true;
  }

  if (
    Object.keys(updates)
      .length > 0
  ) {
    await User.findByIdAndUpdate(
      admin._id,
      {
        $set: updates,
      },
      {
        runValidators: true,
      }
    );

    console.log(
      `Admin account updated: ${email}`
    );
  } else {
    console.log(
      `Admin already exists: ${email}`
    );
  }

  return admin;
};


// ======================================================
// MAIN
// ======================================================

const run = async () => {
  try {
    console.log(
      '\n========================================'
    );

    console.log(
      'CRM DATABASE SEED'
    );

    console.log(
      '========================================\n'
    );


    // ----------------------------------------------
    // Connect database
    // ----------------------------------------------

    await connectDB();

    console.log(
      '✓ Database connected'
    );


    // ----------------------------------------------
    // Seed roles
    // ----------------------------------------------

    const roles =
      await seedRoles();

    console.log(
      `✓ ${Object.keys(roles).length} roles ready`
    );


    // ----------------------------------------------
    // Seed admin
    // ----------------------------------------------

    await seedAdminUser(
      roles.SUPER_ADMIN
    );


    console.log(
      '\n✓ CRM seed completed successfully\n'
    );
  } catch (error) {
    console.error(
      '\n✗ CRM seed failed:\n',
      error
    );

    process.exitCode = 1;
  } finally {
    // ----------------------------------------------
    // Always close database connection
    // ----------------------------------------------

    await disconnectDB().catch(
      (error) => {
        console.error(
          'Database disconnect error:',
          error.message
        );
      }
    );

    // Extra mongoose safety
    if (
      mongoose.connection.readyState !==
      0
    ) {
      await mongoose.disconnect()
        .catch(() => {});
    }
  }
};


// ======================================================
// RUN
// ======================================================

run();