#!/usr/bin/env node

/**
 * Database Connection Test Script
 * 
 * Tests basic database operations to verify connectivity and RLS policies
 * 
 * Usage:
 *   node scripts/test-database-connection.js
 * 
 * Requires SUPABASE_URL and SUPABASE_ANON_KEY env vars
 */

import { createClient } from '@supabase/supabase-js';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testConnection() {
  log('\n🔌 Testing Database Connection...\n', 'cyan');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    log('❌ Missing environment variables:', 'red');
    console.log('  - SUPABASE_URL');
    console.log('  - SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test 1: Basic connection
  log('Test 1: Basic table query...', 'cyan');
  try {
    const { data, error } = await supabase
      .from('User')
      .select('email')
      .limit(1);

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      throw error;
    }

    log('✅ Successfully connected to User table', 'green');
    if (data && data.length > 0) {
      log(`   Found ${data.length} user(s)`, 'green');
    }
  } catch (err) {
    log(`❌ Connection failed: ${err.message}`, 'red');
    process.exit(1);
  }

  // Test 2: RPC function
  log('\nTest 2: RPC function call...', 'cyan');
  try {
    const { data, error } = await supabase
      .rpc('get_server_time');

    if (error) {
      log(`⚠️  RPC function not found (may not be critical): ${error.message}`, 'yellow');
    } else {
      log('✅ RPC functions working', 'green');
      log(`   Server time: ${data}`, 'green');
    }
  } catch (err) {
    log(`⚠️  RPC test failed: ${err.message}`, 'yellow');
  }

  // Test 3: Multiple table access
  log('\nTest 3: Checking table access...', 'cyan');
  const criticalTables = ['User', 'Beacon', 'products', 'orders', 'messages'];
  
  for (const table of criticalTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error && error.code !== 'PGRST116') {
        log(`⚠️  ${table}: ${error.message}`, 'yellow');
      } else {
        log(`✅ ${table}: accessible`, 'green');
      }
    } catch (err) {
      log(`❌ ${table}: ${err.message}`, 'red');
    }
  }

  // Test 4: Real-time channel
  log('\nTest 4: Real-time capabilities...', 'cyan');
  try {
    const channel = supabase.channel('test-channel');
    
    const subscription = channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        log('✅ Real-time subscriptions working', 'green');
        channel.unsubscribe();
      }
    });

    // Wait for subscription
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (err) {
    log(`⚠️  Real-time test failed: ${err.message}`, 'yellow');
  }

  // Test 5: Storage access
  log('\nTest 5: Storage bucket access...', 'cyan');
  try {
    const { data, error } = await supabase
      .storage
      .listBuckets();

    if (error) {
      log(`⚠️  Storage check failed: ${error.message}`, 'yellow');
    } else {
      log('✅ Storage accessible', 'green');
      const uploadsBucket = data.find(b => b.name === 'uploads');
      if (uploadsBucket) {
        log('   ✅ uploads bucket found', 'green');
      } else {
        log('   ⚠️  uploads bucket not found', 'yellow');
      }
    }
  } catch (err) {
    log(`⚠️  Storage test failed: ${err.message}`, 'yellow');
  }

  log('\n🎉 Connection tests complete!\n', 'green');
}

testConnection().catch(err => {
  log(`\n❌ Unexpected error: ${err.message}`, 'red');
  console.error(err);
  process.exit(1);
});
