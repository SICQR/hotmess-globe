/**
 * Admin Role Verification Script
 * 
 * This script verifies that admin users have the correct role set in the database.
 * It also provides functionality to grant admin role to specified users.
 * 
 * Usage:
 *   # Check current admin status
 *   node scripts/verify-admin-roles.js --check
 * 
 *   # Grant admin role to a user
 *   node scripts/verify-admin-roles.js --grant admin@hotmess.london
 * 
 *   # List all admins
 *   node scripts/verify-admin-roles.js --list
 * 
 * Environment Variables Required:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Known admin emails from ADMIN_EMAILS env var
const getAdminEmailsFromEnv = () => {
  const envEmails = process.env.ADMIN_EMAILS || '';
  return envEmails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
};

/**
 * List all users with admin or moderator role
 */
async function listAdmins() {
  console.log('\n📋 Listing all admin/moderator users...\n');
  
  const { data, error } = await supabase
    .from('User')
    .select('email, role, full_name, created_date')
    .in('role', ['admin', 'moderator'])
    .order('role')
    .order('email');
  
  if (error) {
    console.error('❌ Failed to fetch admins:', error.message);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('⚠️  No admin or moderator users found in database.');
    console.log('\n   Known admin emails from ADMIN_EMAILS env var:');
    const envAdmins = getAdminEmailsFromEnv();
    envAdmins.forEach(email => console.log(`   - ${email}`));
    return;
  }
  
  console.log('Admin/Moderator Users:');
  console.log('─'.repeat(60));
  
  data.forEach(user => {
    const roleIcon = user.role === 'admin' ? '👑' : '🛡️';
    console.log(`${roleIcon} ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Name: ${user.full_name || '(not set)'}`);
    console.log(`   Created: ${user.created_date || '(unknown)'}`);
    console.log('');
  });
  
  console.log(`Total: ${data.length} admin/moderator user(s)`);
}

/**
 * Check if known admin emails have the correct role set
 */
async function checkAdminRoles() {
  console.log('\n🔍 Checking admin roles...\n');
  
  const knownAdmins = getAdminEmailsFromEnv();
  
  if (knownAdmins.length === 0) {
    console.log('⚠️  No admin emails configured in ADMIN_EMAILS environment variable.');
    console.log('   The admin middleware will fall back to database role checking only.\n');
    return;
  }
  
  console.log(`Found ${knownAdmins.length} email(s) in ADMIN_EMAILS:\n`);
  
  for (const email of knownAdmins) {
    const { data: user, error } = await supabase
      .from('User')
      .select('email, role, full_name')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error || !user) {
      console.log(`❌ ${email}`);
      console.log(`   Status: User not found in database`);
      console.log('');
      continue;
    }
    
    const hasAdminRole = user.role === 'admin';
    const statusIcon = hasAdminRole ? '✅' : '⚠️';
    
    console.log(`${statusIcon} ${email}`);
    console.log(`   Database Role: ${user.role || '(not set)'}`);
    console.log(`   Name: ${user.full_name || '(not set)'}`);
    
    if (!hasAdminRole) {
      console.log(`   ⚠️  User is in ADMIN_EMAILS but does not have role='admin' in database.`);
      console.log(`      Run: node scripts/verify-admin-roles.js --grant ${email}`);
    }
    
    console.log('');
  }
}

/**
 * Grant admin role to a user
 */
async function grantAdminRole(email) {
  console.log(`\n🔐 Granting admin role to: ${email}\n`);
  
  // Check if user exists
  const { data: existingUser, error: fetchError } = await supabase
    .from('User')
    .select('email, role, full_name')
    .eq('email', email.toLowerCase())
    .single();
  
  if (fetchError || !existingUser) {
    console.error(`❌ User not found: ${email}`);
    console.error('   The user must sign up first before being granted admin role.');
    return;
  }
  
  if (existingUser.role === 'admin') {
    console.log(`✅ User ${email} already has admin role.`);
    return;
  }
  
  // Grant admin role
  const { error: updateError } = await supabase
    .from('User')
    .update({ role: 'admin' })
    .eq('email', email.toLowerCase());
  
  if (updateError) {
    console.error(`❌ Failed to grant admin role:`, updateError.message);
    return;
  }
  
  console.log(`✅ Successfully granted admin role to ${email}`);
  console.log(`   Previous role: ${existingUser.role || '(not set)'}`);
  console.log(`   New role: admin`);
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === '--help' || command === '-h') {
    console.log(`
Admin Role Verification Script

Usage:
  node scripts/verify-admin-roles.js [command] [options]

Commands:
  --check         Check if ADMIN_EMAILS users have correct database role
  --list          List all users with admin or moderator role
  --grant <email> Grant admin role to a specific user

Examples:
  node scripts/verify-admin-roles.js --check
  node scripts/verify-admin-roles.js --list
  node scripts/verify-admin-roles.js --grant admin@hotmess.london
`);
    return;
  }
  
  switch (command) {
    case '--check':
      await checkAdminRoles();
      break;
    case '--list':
      await listAdmins();
      break;
    case '--grant':
      const email = args[1];
      if (!email) {
        console.error('❌ Please provide an email address.');
        console.error('   Usage: node scripts/verify-admin-roles.js --grant <email>');
        process.exit(1);
      }
      await grantAdminRole(email);
      break;
    default:
      console.error(`❌ Unknown command: ${command}`);
      console.error('   Run --help for usage information.');
      process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
