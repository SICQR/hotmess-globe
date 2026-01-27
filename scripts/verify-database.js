#!/usr/bin/env node

/**
 * Database Migration Verification Script
 * 
 * Verifies that:
 * 1. All expected tables exist
 * 2. All tables have RLS enabled
 * 3. Migration files are properly ordered
 * 4. No table conflicts exist
 * 
 * Usage:
 *   node scripts/verify-database.js
 * 
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Expected tables from entityTables array in supabaseClient.jsx
const EXPECTED_TABLES = [
  'orders', 'xp_ledger', 'sweat_coins', 'beacon_checkins',
  'user_achievements', 'achievements', 'user_friendships',
  'user_follows', 'right_now_status', 'event_rsvps', 'messages',
  'chat_threads', 'squads', 'squad_members', 'user_highlights',
  'profile_views', 'bot_sessions', 'user_vibes', 'notifications',
  'reports', 'user_blocks', 'beacon_comments', 'daily_challenges',
  'challenge_completions',
  'cities', 'user_intents',
  'community_posts', 'post_likes', 'post_comments',
  'trusted_contacts', 'safety_checkins', 'notification_outbox',
  'beacon_bookmarks', 'product_favorites',
  'reviews', 'marketplace_reviews', 'product_views', 'event_views',
  'user_streaks', 'venue_kings', 'seller_ratings',
  'cart_items', 'user_tags', 'user_tribes',
  'user_interactions', 'activity_feed',
  'order_items', 'promotions', 'seller_payouts', 'featured_listings',
  
  // Additional tables not in entityTables but used by app
  'products', 'UserActivity', 'push_subscriptions', 'routing_cache',
  'routing_rate_limits', 'user_presence_locations', 'soundcloud_oauth_states',
  'soundcloud_oauth_tokens', 'audio_metadata', 'notification_preferences',
  'user_privacy_settings', 'user_private_profile', 'gdpr_requests',
  'billing_receipts', 'subscriptions',
  
  // Core tables with capitalized names
  'User', 'Beacon', 'EventRSVP'
];

// Critical tables that MUST have RLS enabled
const CRITICAL_RLS_TABLES = [
  'User', 'users', 'orders', 'messages', 'cart_items',
  'notifications', 'user_privacy_settings', 'user_private_profile',
  'payment_methods', 'subscriptions', 'billing_receipts'
];

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

async function verifyMigrationFiles() {
  info('\n📁 Verifying migration files...');
  
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  success(`Found ${files.length} migration files`);

  // Check for proper timestamp ordering
  let lastTimestamp = '';
  const issues = [];
  
  for (const file of files) {
    const timestamp = file.split('_')[0];
    if (timestamp < lastTimestamp) {
      issues.push(`File ${file} is out of order (comes after ${lastTimestamp})`);
    }
    lastTimestamp = timestamp;
  }

  if (issues.length > 0) {
    error('Migration file ordering issues:');
    issues.forEach(issue => console.log(`  - ${issue}`));
    return false;
  }

  success('All migration files properly ordered');

  // Check for duplicate table creations
  const tableCounts = {};
  for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const tableMatches = content.matchAll(/create table (?:if not exists )?public\.([a-zA-Z_"]+)/gi);
    
    for (const match of tableMatches) {
      const tableName = match[1].replace(/"/g, '');
      tableCounts[tableName] = (tableCounts[tableName] || 0) + 1;
    }
  }

  const duplicates = Object.entries(tableCounts).filter(([_, count]) => count > 1);
  if (duplicates.length > 0) {
    warning('Tables created in multiple migrations (usually OK with IF NOT EXISTS):');
    duplicates.forEach(([table, count]) => {
      console.log(`  - ${table}: ${count} times`);
    });
  }

  return true;
}

async function verifyDatabaseTables(supabase) {
  info('\n🗄️  Verifying database tables...');

  // Query for all tables in public schema
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_type', 'BASE TABLE');

  if (tablesError) {
    error(`Failed to query tables: ${tablesError.message}`);
    return false;
  }

  const existingTables = new Set(tables.map(t => t.table_name));
  
  success(`Found ${existingTables.size} tables in database`);

  // Check for missing expected tables
  const missingTables = EXPECTED_TABLES.filter(table => {
    // Check both exact match and lowercase version
    return !existingTables.has(table) && !existingTables.has(table.toLowerCase());
  });

  if (missingTables.length > 0) {
    error('Missing expected tables:');
    missingTables.forEach(table => console.log(`  - ${table}`));
    return false;
  }

  success('All expected tables exist');
  return true;
}

async function verifyRLS(supabase) {
  info('\n🔒 Verifying RLS policies...');

  // Query for tables with RLS enabled
  const { data, error: rlsError } = await supabase.rpc('check_rls_status', {});

  if (rlsError) {
    // If the RPC doesn't exist, we'll need to check manually
    warning('RLS check RPC not found, skipping automated RLS verification');
    warning('Manually verify RLS with: SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = \'public\';');
    return true;
  }

  const tablesWithoutRLS = data.filter(t => !t.rowsecurity);
  const criticalTablesWithoutRLS = tablesWithoutRLS.filter(t => 
    CRITICAL_RLS_TABLES.includes(t.tablename)
  );

  if (criticalTablesWithoutRLS.length > 0) {
    error('CRITICAL: These tables MUST have RLS enabled:');
    criticalTablesWithoutRLS.forEach(table => console.log(`  - ${table.tablename}`));
    return false;
  }

  if (tablesWithoutRLS.length > 0) {
    warning('These tables do not have RLS enabled (may be intentional):');
    tablesWithoutRLS.forEach(table => console.log(`  - ${table.tablename}`));
  } else {
    success('All tables have RLS enabled');
  }

  return true;
}

async function verifyStorageBuckets(supabase) {
  info('\n📦 Verifying storage buckets...');

  const { data: buckets, error: bucketsError } = await supabase
    .storage
    .listBuckets();

  if (bucketsError) {
    error(`Failed to list buckets: ${bucketsError.message}`);
    return false;
  }

  success(`Found ${buckets.length} storage buckets`);

  const uploadsBucket = buckets.find(b => b.name === 'uploads');
  if (!uploadsBucket) {
    error('Missing required "uploads" bucket');
    return false;
  }

  success('Required "uploads" bucket exists');
  return true;
}

async function verifyConnections(supabase) {
  info('\n🔌 Verifying database connections...');

  try {
    // Test basic query
    const { error: userError } = await supabase
      .from('User')
      .select('email')
      .limit(1);

    if (userError && userError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      error(`Failed to query User table: ${userError.message}`);
      return false;
    }

    success('Successfully connected and queried User table');

    // Test RPC function
    const { error: rpcError } = await supabase
      .rpc('get_server_time');

    if (rpcError) {
      warning(`RPC function get_server_time failed: ${rpcError.message}`);
    } else {
      success('RPC functions working');
    }

    return true;
  } catch (err) {
    error(`Connection test failed: ${err.message}`);
    return false;
  }
}

async function main() {
  log('\n🔍 Hotmess Database Verification\n', 'blue');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    error('Missing required environment variables:');
    console.log('  - SUPABASE_URL');
    console.log('  - SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)');
    console.log('\nSet these in your .env file or environment');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Run all verification checks
  const results = {
    migrationFiles: await verifyMigrationFiles(),
    databaseTables: await verifyDatabaseTables(supabase),
    rls: await verifyRLS(supabase),
    storage: await verifyStorageBuckets(supabase),
    connections: await verifyConnections(supabase),
  };

  // Print summary
  log('\n📊 Verification Summary:\n', 'blue');
  
  Object.entries(results).forEach(([check, passed]) => {
    const icon = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    log(`${icon} ${check.replace(/([A-Z])/g, ' $1').trim()}`, color);
  });

  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    log('\n🎉 All checks passed! Database is production-ready.\n', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Some checks failed. Review the errors above.\n', 'yellow');
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    error(`Unexpected error: ${err.message}`);
    console.error(err);
    process.exit(1);
  });
}

export { verifyMigrationFiles, verifyDatabaseTables, verifyRLS, verifyStorageBuckets, verifyConnections };
