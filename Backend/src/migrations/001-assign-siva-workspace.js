'use strict';

// ======================================================
// ONE-TIME MIGRATION: ASSIGN EXISTING DATA TO SIVA'S WORKSPACE
// ======================================================
//
// Usage (from Backend/):
//   node src/migrations/001-assign-siva-workspace.js --email=<siva-login-email>            (dry run)
//   node src/migrations/001-assign-siva-workspace.js --email=<siva-login-email> --apply    (write)
//
// Optional: --name="Workspace Name"
//
// Safe to re-run:
//   - The workspace is looked up by owner before creating.
//   - Only documents with no workspace (missing or null) are updated.
//   - Nothing is deleted. Passwords and other user fields are untouched.
//   - Roles are not modified. Other users are not assigned.

require('../config/env');

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const { connectDB, disconnectDB } = require('../config/db');

// Load every model so mongoose.models contains all CRM collections.
const modelsDir = path.join(__dirname, '..', 'models');
fs.readdirSync(modelsDir)
  .filter((file) => file.endsWith('.js'))
  .forEach((file) => require(path.join(modelsDir, file)));

const User = mongoose.model('User');
const Workspace = mongoose.model('Workspace');

// Not CRM data records: handled separately or intentionally left alone.
const EXCLUDED_MODELS = ['User', 'Role', 'Workspace'];

const UNASSIGNED = {
  $or: [{ workspace: { $exists: false } }, { workspace: null }],
};

const getArg = (name) => {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  return arg ? arg.slice(prefix.length).trim() : null;
};

const run = async () => {
  const email = (getArg('email') || '').toLowerCase();
  const workspaceName = getArg('name') || 'Siva CRM Workspace';
  const apply = process.argv.includes('--apply');

  if (!email) {
    throw new Error(
      'Missing --email=<siva-login-email>. Refusing to guess the workspace owner.',
    );
  }

  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN (no writes)'}`);

  await connectDB();

  const user = await User.findOne({ email }).select('_id email workspace');

  if (!user) {
    throw new Error(`No user found with email "${email}". Nothing changed.`);
  }

  // --------------------------------------------------
  // 1. Find or create the workspace
  // --------------------------------------------------

  let workspace = user.workspace
    ? await Workspace.findById(user.workspace)
    : await Workspace.findOne({ owner: user._id });

  if (workspace) {
    console.log(`Workspace exists: ${workspace._id} (${workspace.name})`);
  } else if (apply) {
    workspace = await Workspace.create({
      name: workspaceName,
      owner: user._id,
      status: 'ACTIVE',
    });
    console.log(`Workspace created: ${workspace._id} (${workspace.name})`);
  } else {
    console.log(`Would create workspace "${workspaceName}" owned by ${email}`);
  }

  // --------------------------------------------------
  // 2. Assign Siva's user
  // --------------------------------------------------

  if (user.workspace) {
    console.log('User already has a workspace. Not changed.');
  } else if (apply) {
    // Native update: no save hooks, password untouched.
    await User.collection.updateOne(
      { _id: user._id, ...UNASSIGNED },
      { $set: { workspace: workspace._id } },
    );
    console.log(`User ${email} assigned to workspace.`);
  } else {
    console.log(`Would assign user ${email} to workspace.`);
  }

  // --------------------------------------------------
  // 3. Assign all unassigned CRM records
  // --------------------------------------------------

  const modelNames = Object.keys(mongoose.models).filter(
    (name) => !EXCLUDED_MODELS.includes(name),
  );

  for (const name of modelNames) {
    // Native collection: bypasses schema strict mode,
    // since CRM schemas do not define `workspace` yet.
    const collection = mongoose.models[name].collection;

    if (apply) {
      const result = await collection.updateMany(UNASSIGNED, {
        $set: { workspace: workspace._id },
      });
      console.log(`${name}: ${result.modifiedCount} assigned`);
    } else {
      const count = await collection.countDocuments(UNASSIGNED);
      console.log(`${name}: ${count} would be assigned`);
    }
  }

  // --------------------------------------------------
  // 4. Report other users left unassigned
  // --------------------------------------------------

  const otherUsers = await User.collection.countDocuments({
    _id: { $ne: user._id },
    ...UNASSIGNED,
  });

  console.log(`Other users without a workspace (left unchanged): ${otherUsers}`);
};

run()
  .then(() => console.log('Migration finished.'))
  .catch((error) => {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB().catch(() => {});
  });
