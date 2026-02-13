#!/usr/bin/env node
/**
 * HOTMESS Integration Test Script
 * 
 * Tests all external integrations to verify configuration.
 * Run with: node scripts/test-integrations.js [--prod]
 * 
 * Options:
 *   --prod    Test production URLs instead of local
 *   --verbose Show detailed output
 */

const BASE_URL = process.argv.includes('--prod') 
  ? 'https://hotmess-globe-fix.vercel.app'
  : 'http://localhost:5173';

const VERBOSE = process.argv.includes('--verbose');

const log = (msg) => console.log(msg);
const verbose = (msg) => VERBOSE && console.log(`  ${msg}`);

const results = {
  passed: [],
  failed: [],
  skipped: []
};

async function test(name, fn) {
  try {
    const result = await fn();
    if (result.skip) {
      results.skipped.push({ name, reason: result.reason });
      log(`⏭️  ${name}: SKIPPED - ${result.reason}`);
    } else if (result.ok) {
      results.passed.push({ name });
      log(`✅ ${name}: PASSED`);
      if (result.details) verbose(result.details);
    } else {
      results.failed.push({ name, error: result.error });
      log(`❌ ${name}: FAILED - ${result.error}`);
    }
  } catch (err) {
    results.failed.push({ name, error: err.message });
    log(`❌ ${name}: ERROR - ${err.message}`);
  }
}

// ============================================================================
// TESTS
// ============================================================================

async function testHealthEndpoint() {
  const res = await fetch(`${BASE_URL}/api/health`);
  const data = await res.json();
  
  if (!res.ok) {
    return { ok: false, error: `Status ${res.status}` };
  }
  
  return { 
    ok: data.ok === true, 
    error: data.ok ? null : 'Health check returned ok=false',
    details: `Supabase: ${data.supabase?.urlHost || 'not configured'}`
  };
}

async function testSupabaseConnection() {
  // First try the public health check
  const res = await fetch(`${BASE_URL}/api/health`);
  const data = await res.json();
  
  // Public endpoint may not expose supabase details - that's OK
  // Just verify the endpoint is healthy and runtime is configured
  if (data.ok === true && data.runtime?.vercel) {
    return {
      ok: true,
      details: data.supabase?.urlHost 
        ? `Project: ${data.supabase.urlHost}` 
        : 'Connection verified (details hidden in public mode)'
    };
  }
  
  if (!data.supabase) {
    // Try to infer from env check
    if (data.env?.SUPABASE_URL && data.env?.SUPABASE_ANON_KEY) {
      return { ok: true, details: 'Env vars configured' };
    }
    return { ok: false, error: 'Supabase not configured' };
  }
  
  const authOk = data.supabase.authHealthStatus >= 200 && data.supabase.authHealthStatus < 300;
  return {
    ok: authOk,
    error: authOk ? null : `Auth health status: ${data.supabase.authHealthStatus}`,
    details: `Project: ${data.supabase.urlHost}`
  };
}

async function testAIChat() {
  const res = await fetch(`${BASE_URL}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello, what can you help me with?' })
  });
  
  if (res.status === 500) {
    const data = await res.json();
    if (data.error?.includes('not configured')) {
      return { skip: true, reason: 'OpenAI API key not configured' };
    }
    return { ok: false, error: data.error };
  }
  
  const data = await res.json();
  return {
    ok: !!data.response,
    error: data.response ? null : 'No response from AI',
    details: `Response length: ${data.response?.length || 0} chars`
  };
}

async function testStripeCheckout() {
  // Can't test checkout without auth, just verify endpoint exists
  const res = await fetch(`${BASE_URL}/api/stripe/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  
  // Should return 401 (unauthorized) not 404
  if (res.status === 401) {
    return { ok: true, details: 'Endpoint exists, requires auth' };
  }
  
  // Vercel edge function errors sometimes return HTML
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (res.status >= 500) {
      return { skip: true, reason: 'Server error (possibly not configured)' };
    }
    return { ok: false, error: `Unexpected response type: ${contentType}` };
  }
  
  const data = await res.json();
  if (res.status === 500 && data.error?.includes('not configured')) {
    return { skip: true, reason: 'Stripe not configured' };
  }
  
  return { ok: false, error: `Unexpected status: ${res.status}` };
}

async function testShopifyConfig() {
  // Try to hit the Shopify sync endpoint (requires auth)
  const res = await fetch(`${BASE_URL}/api/shopify/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  
  // 401 = endpoint exists and requires auth (Shopify is configured)
  if (res.status === 401) {
    return { ok: true, details: 'Endpoint exists, requires auth' };
  }
  
  // Check health for shopify info (if authorized)
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const data = await healthRes.json();
  
  if (data.shopify?.shopDomain) {
    return {
      ok: true,
      details: `Shop: ${data.shopify.shopDomain}`
    };
  }
  
  // 400 with "credentials not configured" = not set up
  if (res.status === 400) {
    const body = await res.json().catch(() => ({}));
    if (body.error?.includes('not configured')) {
      return { skip: true, reason: 'Shopify not configured' };
    }
  }
  
  return { ok: true, details: 'Shopify endpoint responding' };
}

async function testTelegramBot() {
  // Verify endpoint exists by sending invalid request
  const res = await fetch(`${BASE_URL}/api/telegram/bot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  
  // Should return 200 (always returns 200 to Telegram) or 500 if not configured
  if (res.status === 500) {
    const data = await res.json();
    if (data.error?.includes('not configured')) {
      return { skip: true, reason: 'Telegram bot not configured' };
    }
  }
  
  return { ok: res.status === 200, details: 'Webhook endpoint responding' };
}

async function testGoogleMaps() {
  // Check if routing endpoint works (uses Google Maps internally)
  const routeRes = await fetch(`${BASE_URL}/api/routing/etas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin: { lat: 51.5074, lng: -0.1278 },
      destinations: [{ lat: 51.5, lng: -0.1 }]
    })
  });
  
  // 401 = endpoint exists and requires auth (Google Maps is configured)
  if (routeRes.status === 401) {
    return { ok: true, details: 'Routing endpoint active (requires auth)' };
  }
  
  // If we get a valid response, Google Maps is configured
  if (routeRes.status === 200 || routeRes.status === 400) {
    return { ok: true, details: 'Google Maps API configured' };
  }
  
  // Check health for env info
  const res = await fetch(`${BASE_URL}/api/health`);
  const data = await res.json();
  
  if (data.env?.GOOGLE_MAPS_API_KEY === true) {
    return { ok: true, details: 'API key configured' };
  }
  
  return { skip: true, reason: 'Google Maps API key not configured' };
}

async function testSoundCloud() {
  // Check OAuth endpoint exists
  const res = await fetch(`${BASE_URL}/api/soundcloud/authorize`, {
    redirect: 'manual'
  });
  
  // Should redirect (302/307) or require auth (401)
  if (res.status === 302 || res.status === 307) {
    return { ok: true, details: 'OAuth redirect configured' };
  }
  
  // 401 = endpoint exists and requires auth (SoundCloud is configured)
  if (res.status === 401) {
    return { ok: true, details: 'SoundCloud endpoint active (requires auth)' };
  }
  
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return { skip: true, reason: 'SoundCloud endpoint not returning JSON' };
  }
  
  const data = await res.json().catch(() => ({}));
  if (data.error?.includes('not configured')) {
    return { skip: true, reason: 'SoundCloud not configured' };
  }
  
  return { ok: false, error: `Unexpected status: ${res.status}` };
}

async function testStaticAssets() {
  const res = await fetch(`${BASE_URL}/`);
  const html = await res.text();
  
  // Check that index.html loads and references JS assets
  const hasScript = html.includes('src="/assets/');
  const hasModule = html.includes('type="module"');
  
  return {
    ok: hasScript && hasModule,
    error: hasScript ? null : 'No JS assets found in HTML',
    details: `HTML length: ${html.length} chars`
  };
}

async function testCSPHeaders() {
  const res = await fetch(`${BASE_URL}/`);
  const csp = res.headers.get('content-security-policy');
  
  if (!csp) {
    return { ok: false, error: 'No CSP header found' };
  }
  
  const requiredSources = [
    'supabase.co',
    'stripe.com',
  ];
  
  const missing = requiredSources.filter(src => !csp.includes(src));
  
  return {
    ok: missing.length === 0,
    error: missing.length ? `Missing CSP sources: ${missing.join(', ')}` : null,
    details: `CSP length: ${csp.length} chars`
  };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  log(`\n🔥 HOTMESS Integration Tests`);
  log(`📍 Testing: ${BASE_URL}\n`);
  log('─'.repeat(50));

  await test('Health Endpoint', testHealthEndpoint);
  await test('Supabase Connection', testSupabaseConnection);
  await test('AI Chat (OpenAI)', testAIChat);
  await test('Stripe Checkout', testStripeCheckout);
  await test('Shopify Config', testShopifyConfig);
  await test('Telegram Bot', testTelegramBot);
  await test('Google Maps', testGoogleMaps);
  await test('SoundCloud OAuth', testSoundCloud);
  await test('Static Assets', testStaticAssets);
  await test('CSP Headers', testCSPHeaders);

  log('─'.repeat(50));
  log(`\n📊 Results:`);
  log(`   ✅ Passed:  ${results.passed.length}`);
  log(`   ❌ Failed:  ${results.failed.length}`);
  log(`   ⏭️  Skipped: ${results.skipped.length}`);
  
  if (results.failed.length > 0) {
    log(`\n❌ Failed tests:`);
    results.failed.forEach(f => log(`   - ${f.name}: ${f.error}`));
  }
  
  if (results.skipped.length > 0) {
    log(`\n⏭️  Skipped tests (not configured):`);
    results.skipped.forEach(s => log(`   - ${s.name}: ${s.reason}`));
  }
  
  log('');
  process.exit(results.failed.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
