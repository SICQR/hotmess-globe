#!/usr/bin/env node
/**
 * seed-test-accounts.js — Reset test-red and test-blue to known state.
 *
 * Usage:
 *   SUPABASE_URL=https://klsywpvncqqglhnhrjbh.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=<key> \
 *   node scripts/seed-test-accounts.js
 *
 * Or via npm (env vars must be set):
 *   npm run seed:test
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ACCOUNTS = [
  {
    email: 'test-red@hotmessldn.com',
    password: '***REMOVED_PASSWORD***',
    display_name: 'Test Red',
    username: 'test-red',
    last_lat: 51.5103,
    last_lng: -0.1291,
  },
  {
    email: 'test-blue@hotmessldn.com',
    password: '***REMOVED_PASSWORD***',
    display_name: 'Test Blue',
    username: 'test-blue',
    last_lat: 51.5047,
    last_lng: -0.1252,
  },
];

async function seedAccount(account) {
  const { email, password, display_name, username, last_lat, last_lng } = account;

  // 1. Check if auth user exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  let userId;

  if (existing) {
    userId = existing.id;
    // Update password
    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (updateErr) throw new Error(`Failed to update ${email}: ${updateErr.message}`);
  } else {
    // Create user
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr) throw new Error(`Failed to create ${email}: ${createErr.message}`);
    userId = created.user.id;
  }

  // 2. Upsert profiles row with London coordinates
  const now = new Date().toISOString();
  const { error: profileErr } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        email,
        display_name,
        username,
        last_lat,
        last_lng,
        last_loc_ts: now,
        is_online: true,
        last_seen: now,
        privacy_hide_proximity: false,
        age_verified: true,
        onboarding_complete: true,
        community_attested_at: now,
      },
      { onConflict: 'id' }
    );

  if (profileErr) throw new Error(`Failed to upsert profile for ${email}: ${profileErr.message}`);

  return userId;
}

async function main() {
  console.log('Seeding test accounts...\n');

  for (const account of ACCOUNTS) {
    try {
      const userId = await seedAccount(account);
      console.log(`  ${account.display_name} ✓  (${account.email} → ${userId})`);
    } catch (err) {
      console.error(`  ${account.display_name} ✗  ${err.message}`);
      process.exitCode = 1;
    }
  }

  console.log('\nDone.');
}

main();
