#!/usr/bin/env node

/**
 * Integration Test & Validation Script
 * 
 * Tests all major integrations and API endpoints to ensure they're properly configured.
 * Run with: node scripts/validate-integrations.mjs
 */

import { createClient } from '@supabase/supabase-js';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

function logTest(name, passed, details = '') {
  const symbol = passed ? '✅' : '❌';
  const color = passed ? 'green' : 'red';
  log(`${symbol} ${name}`, color);
  if (details) {
    console.log(`   ${details}`);
  }
}

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [],
};

function recordTest(name, passed, critical = true, details = '') {
  results.tests.push({ name, passed, critical, details });
  if (passed) {
    results.passed++;
  } else if (critical) {
    results.failed++;
  } else {
    results.warnings++;
  }
  logTest(name, passed, details);
}

// Environment variable checks
function checkEnvVar(name, required = true) {
  const value = process.env[name];
  const exists = !!value && value !== 'undefined' && value !== 'null';
  
  if (required) {
    recordTest(
      `${name}`,
      exists,
      true,
      exists ? '✓ Set' : '✗ Missing (REQUIRED)'
    );
  } else {
    if (!exists) {
      log(`⚠️  ${name}`, 'yellow');
      console.log(`   ℹ️  Optional - not configured`);
    } else {
      logTest(`${name}`, true, '✓ Set (optional)');
    }
  }
  
  return exists;
}

// Test Supabase connection
async function testSupabase() {
  logSection('SUPABASE INTEGRATION');
  
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    recordTest('Supabase Configuration', false, true, 'Missing URL or Anon Key');
    return;
  }
  
  try {
    const supabase = createClient(url, key);
    
    // Test connection by querying a table
    const { error } = await supabase
      .from('User')
      .select('count')
      .limit(1);
    
    if (error && error.message.includes('relation')) {
      // Table might not exist yet - try users (lowercase)
      const { error: error2 } = await supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (error2) {
        recordTest('Supabase Connection', false, true, error2.message);
      } else {
        recordTest('Supabase Connection', true, true, 'Connected successfully (using "users" table)');
      }
    } else if (error) {
      recordTest('Supabase Connection', false, true, error.message);
    } else {
      recordTest('Supabase Connection', true, true, 'Connected successfully');
    }
    
    // Test auth
    const { error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      recordTest('Supabase Auth', false, false, sessionError.message);
    } else {
      recordTest('Supabase Auth', true, true, 'Auth module initialized');
    }
    
  } catch (err) {
    recordTest('Supabase Connection', false, true, err.message);
  }
}

// Test API endpoints
async function testApiEndpoints() {
  logSection('API ENDPOINTS');
  
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:5173';
  
  log(`Testing against: ${baseUrl}`, 'blue');
  
  // Test email endpoint (should require authentication)
  try {
    const emailRes = await fetch(`${baseUrl}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Test',
      }),
    });
    
    // We expect either 200 (dev mode) or 401/403 (auth required)
    const isValid = [200, 401, 403].includes(emailRes.status);
    recordTest(
      'Email API Endpoint',
      isValid,
      false,
      `Status: ${emailRes.status} - ${isValid ? 'Responding' : 'Unexpected'}`
    );
  } catch (err) {
    recordTest('Email API Endpoint', false, false, err.message);
  }
  
  // Test Telegram verify endpoint
  try {
    const telegramRes = await fetch(`${baseUrl}/api/auth/telegram/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    
    const isValid = [400, 500].includes(telegramRes.status); // Should reject invalid data
    recordTest(
      'Telegram Verify Endpoint',
      isValid,
      false,
      `Status: ${telegramRes.status} - ${isValid ? 'Responding' : 'Unexpected'}`
    );
  } catch (err) {
    recordTest('Telegram Verify Endpoint', false, false, err.message);
  }
}

// Check OAuth configuration
function checkOAuthConfig() {
  logSection('OAUTH PROVIDERS');
  
  log('ℹ️  OAuth providers require Supabase dashboard configuration', 'blue');
  log('ℹ️  See docs/OAUTH_SETUP.md for setup instructions', 'blue');
  
  // Google OAuth
  log('\nGoogle OAuth:', 'yellow');
  log('  Frontend: Implemented in src/pages/Auth.jsx');
  log('  Status: Requires Supabase configuration');
  log('  Action: Enable in Supabase Dashboard → Auth → Providers → Google');
  
  // Telegram
  log('\nTelegram Auth:', 'yellow');
  const telegramBot = checkEnvVar('VITE_TELEGRAM_BOT_USERNAME', false);
  const telegramToken = checkEnvVar('TELEGRAM_BOT_TOKEN', false);
  log('  Widget: Implemented in src/components/auth/TelegramLogin.jsx');
  log('  Verify: Implemented in api/auth/telegram/verify.js');
  log('  Status: ' + (telegramBot && telegramToken ? 'Ready' : 'Needs configuration'));
  
  // GitHub OAuth
  log('\nGitHub OAuth:', 'yellow');
  log('  Frontend: Not implemented');
  log('  Status: Available but not configured');
  log('  Action: See docs/OAUTH_SETUP.md for implementation guide');
}

// Check integrations
function checkIntegrations() {
  logSection('THIRD-PARTY INTEGRATIONS');
  
  // Shopify
  log('\nShopify:', 'yellow');
  const shopifyDomain = checkEnvVar('SHOPIFY_SHOP_DOMAIN', false);
  const shopifyToken = checkEnvVar('SHOPIFY_STOREFRONT_ACCESS_TOKEN', false);
  if (shopifyDomain && shopifyToken) {
    log('  ✓ Configured for product sync');
  } else {
    log('  ℹ️  Not configured (optional)');
  }
  
  // Stripe
  log('\nStripe Payments:', 'yellow');
  const stripePub = checkEnvVar('VITE_STRIPE_PUBLISHABLE_KEY', false);
  const stripeSecret = checkEnvVar('STRIPE_SECRET_KEY', false);
  if (stripePub && stripeSecret) {
    log('  ✓ Configured for payments');
  } else {
    log('  ℹ️  Not configured (optional)');
  }
  
  // Resend (Email)
  log('\nResend Email:', 'yellow');
  const resendKey = checkEnvVar('RESEND_API_KEY', false);
  if (resendKey) {
    log('  ✓ Configured for email delivery');
  } else {
    log('  ℹ️  Not configured - emails will be logged to console');
  }
  
  // Google Maps
  log('\nGoogle Maps (Routing):', 'yellow');
  const mapsKey = checkEnvVar('GOOGLE_MAPS_API_KEY', false);
  if (mapsKey) {
    log('  ✓ Configured for routing & ETAs');
  } else {
    log('  ℹ️  Not configured (optional)');
  }
  
  // OpenAI
  log('\nOpenAI:', 'yellow');
  const openaiKey = checkEnvVar('OPENAI_API_KEY', false);
  if (openaiKey) {
    log('  ✓ Configured for AI features');
  } else {
    log('  ℹ️  Not configured (optional)');
  }
}

// Check security configuration
function checkSecurity() {
  logSection('SECURITY CONFIGURATION');
  
  // Cron secrets
  log('\nCron Job Protection:', 'yellow');
  checkEnvVar('OUTBOX_CRON_SECRET', false);
  checkEnvVar('RATE_LIMIT_CLEANUP_SECRET', false);
  checkEnvVar('EVENT_SCRAPER_CRON_SECRET', false);
  
  if (!process.env.OUTBOX_CRON_SECRET) {
    log('  ⚠️  RECOMMENDED: Set cron secrets to protect scheduled tasks', 'yellow');
  }
  
  // Service role key
  log('\nSupabase Service Role:', 'yellow');
  const serviceKey = checkEnvVar('SUPABASE_SERVICE_ROLE_KEY', false);
  if (serviceKey) {
    log('  ✓ Configured (required for admin operations)');
    log('  ⚠️  NEVER expose this key to the client!', 'yellow');
  } else {
    log('  ⚠️  Missing - some server operations will fail', 'yellow');
  }
  
  // Webhook secrets
  log('\nWebhook Security:', 'yellow');
  checkEnvVar('SHOPIFY_WEBHOOK_SECRET', false);
  checkEnvVar('STRIPE_WEBHOOK_SECRET', false);
}

// Print summary
function printSummary() {
  logSection('VALIDATION SUMMARY');
  
  const total = results.passed + results.failed + results.warnings;
  
  log(`\nTests Run: ${total}`, 'blue');
  log(`✅ Passed: ${results.passed}`, 'green');
  log(`❌ Failed: ${results.failed}`, 'red');
  log(`⚠️  Warnings: ${results.warnings}`, 'yellow');
  
  if (results.failed > 0) {
    log('\n❌ CRITICAL ISSUES FOUND', 'red');
    log('The following required items are missing:', 'red');
    results.tests
      .filter(t => !t.passed && t.critical)
      .forEach(t => log(`  • ${t.name}`, 'red'));
    
    log('\nAction Required:', 'yellow');
    log('1. Check environment variables in .env.local or Vercel');
    log('2. See docs/ENVIRONMENT_SETUP.md for configuration guide');
    log('3. Run this script again after configuration');
  } else if (results.warnings > 0) {
    log('\n⚠️  OPTIONAL CONFIGURATIONS MISSING', 'yellow');
    log('The application will work but some features may be limited.', 'yellow');
    log('See docs/ENVIRONMENT_SETUP.md for optional integrations.');
  } else {
    log('\n✅ ALL CHECKS PASSED', 'green');
    log('The application is properly configured!', 'green');
  }
  
  // Next steps
  log('\nNext Steps:', 'cyan');
  log('1. Review docs/OAUTH_SETUP.md for OAuth provider setup');
  log('2. Configure optional integrations as needed');
  log('3. Run `npm run dev` to start development server');
  log('4. Run `npm run test` to execute unit tests');
  log('5. Run `npm run build` to verify production build');
  
  // Exit code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Main execution
async function main() {
  log('🔍 HOTMESS Integration Validation', 'cyan');
  log('Checking system configuration and integrations...\n', 'blue');
  
  // Check required environment variables
  logSection('REQUIRED ENVIRONMENT VARIABLES');
  checkEnvVar('VITE_SUPABASE_URL', true);
  checkEnvVar('VITE_SUPABASE_ANON_KEY', true);
  
  // Test Supabase
  await testSupabase();
  
  // Check OAuth
  checkOAuthConfig();
  
  // Check integrations
  checkIntegrations();
  
  // Check security
  checkSecurity();
  
  // Test API endpoints (if we're in a running environment)
  if (process.env.VERCEL_URL || process.env.VITE_DEV_SERVER_URL) {
    await testApiEndpoints();
  } else {
    log('\nℹ️  Skipping API endpoint tests (not in running environment)', 'blue');
    log('Run `npm run dev` first to test API endpoints', 'blue');
  }
  
  // Print summary
  printSummary();
}

// Run
main().catch(err => {
  log(`\n❌ Validation failed with error:`, 'red');
  console.error(err);
  process.exit(1);
});
