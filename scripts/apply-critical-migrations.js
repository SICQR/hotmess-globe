#!/usr/bin/env node
/**
 * Apply critical missing migrations to Supabase database
 * Uses the service role key for admin access
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

// Critical migrations to apply (in order)
const MIGRATIONS = [
  '20260127100000_enable_realtime_right_now_status.sql',
  '20260127500000_add_level_unlocks.sql',
  '20260127600000_add_checkin_and_xp_tables.sql',
  '20260128000000_create_match_probability_tables.sql',
];

async function checkTableExists(tableName) {
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', tableName)
    .maybeSingle();
  
  // Alternative: use raw query
  if (error) {
    // Try using rpc
    const { data: rpcData } = await supabase.rpc('get_server_time');
    // If we can call RPC, connection works - just check differently
    return null; // Unknown
  }
  return !!data;
}

async function runMigration(filename) {
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', filename);
  
  if (!fs.existsSync(migrationPath)) {
    console.log(`⚠️  Migration file not found: ${filename}`);
    return { success: false, skipped: true };
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  
  console.log(`\n📄 Applying: ${filename}`);
  console.log(`   Size: ${sql.length} characters`);
  
  try {
    // Use Supabase's SQL execution endpoint via fetch
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ sql_query: sql })
    });

    if (!response.ok) {
      // exec_sql function might not exist, need to use direct connection
      throw new Error(`HTTP ${response.status}`);
    }
    
    console.log(`   ✅ Applied successfully`);
    return { success: true };
  } catch (error) {
    // Supabase REST API doesn't support raw SQL execution
    // We need to output the SQL for manual execution
    console.log(`   ⚠️  Cannot execute via API - requires Supabase Dashboard`);
    return { success: false, needsManual: true };
  }
}

async function testConnection() {
  console.log('🔌 Testing database connection...');
  
  // Try to query a simple table
  const { data, error } = await supabase
    .from('User')
    .select('email')
    .limit(1);
  
  if (error && !error.message.includes('does not exist')) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
  
  console.log('✅ Connected to Supabase');
  return true;
}

async function checkMissingTables() {
  console.log('\n📊 Checking for missing tables...\n');
  
  const tablesToCheck = [
    'xp_balances',
    'user_checkins',
    'xp_transactions',
    'level_unlocks',
    'user_unlocked_features',
    'profile_embeddings',
    'scoring_config',
    'match_score_cache',
  ];
  
  const missing = [];
  const existing = [];
  
  for (const table of tablesToCheck) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error && error.message.includes('does not exist')) {
      missing.push(table);
      console.log(`   ❌ ${table} - MISSING`);
    } else {
      existing.push(table);
      console.log(`   ✅ ${table} - exists`);
    }
  }
  
  return { missing, existing };
}

async function outputMigrationSQL() {
  console.log('\n' + '='.repeat(70));
  console.log('📋 MANUAL MIGRATION REQUIRED');
  console.log('='.repeat(70));
  console.log('\nSupabase REST API does not support raw SQL execution.');
  console.log('Please run these migrations manually in Supabase Dashboard:\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/axxwdjmbwkvqhcpwters/sql');
  console.log('2. Copy and paste the SQL from each migration file below:\n');
  
  for (const migration of MIGRATIONS) {
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migration);
    if (fs.existsSync(migrationPath)) {
      console.log(`   📄 supabase/migrations/${migration}`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('💡 TIP: You can also run: supabase login && supabase db push');
  console.log('='.repeat(70) + '\n');
}

async function main() {
  console.log('🚀 HOTMESS Database Migration Helper\n');
  
  const connected = await testConnection();
  if (!connected) {
    process.exit(1);
  }
  
  const { missing } = await checkMissingTables();
  
  if (missing.length === 0) {
    console.log('\n✅ All required tables exist! No migrations needed.');
    return;
  }
  
  console.log(`\n⚠️  ${missing.length} tables are missing.`);
  
  // Output instructions for manual migration
  await outputMigrationSQL();
  
  // Also create a combined SQL file for easy execution
  const combinedPath = path.join(__dirname, '..', 'scripts', 'combined-migrations.sql');
  let combinedSQL = '-- Combined critical migrations for HOTMESS\n';
  combinedSQL += '-- Generated: ' + new Date().toISOString() + '\n\n';
  
  for (const migration of MIGRATIONS) {
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migration);
    if (fs.existsSync(migrationPath)) {
      combinedSQL += `-- ============================================================================\n`;
      combinedSQL += `-- Migration: ${migration}\n`;
      combinedSQL += `-- ============================================================================\n\n`;
      combinedSQL += fs.readFileSync(migrationPath, 'utf8');
      combinedSQL += '\n\n';
    }
  }
  
  fs.writeFileSync(combinedPath, combinedSQL);
  console.log(`📝 Combined SQL written to: scripts/combined-migrations.sql`);
  console.log('   You can copy-paste this file content into Supabase SQL Editor.\n');
}

main().catch(console.error);
