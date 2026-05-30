/**
 * purchases.ts — In-App Purchase bridge
 *
 * iOS/Android: RevenueCat Capacitor SDK
 * Web:         Stripe Checkout (existing flow)
 *
 * Usage:
 *   import { initializePurchases, purchaseMembership, purchaseBoost, getCustomerInfo } from '@/lib/purchases';
 */

import { isNative } from '@/lib/native';

// ── RevenueCat entitlement → DB tier mapping ─────────────────────────────────
export const ENTITLEMENT_TO_TIER: Record<string, string> = {
  hotmess: 'hotmess',
  connected: 'connected',
  promoter: 'promoter',
  venue: 'venue',
};

// ── Boost product identifiers ────────────────────────────────────────────────
export const BOOST_PRODUCT_IDS: Record<string, string> = {
  globe_glow:          'com.hotmess.boost.globe_glow',
  profile_bump:        'com.hotmess.boost.profile_bump',
  vibe_blast:          'com.hotmess.boost.vibe_blast',
  incognito_week:      'com.hotmess.boost.incognito_week',
  extra_beacon_drop:   'com.hotmess.boost.extra_beacon_drop',
  highlighted_message: 'com.hotmess.boost.highlighted_message',
};

// ── Types ────────────────────────────────────────────────────────────────────
export interface CustomerInfo {
  activeTier: string | null;  // current membership tier or null
  activeBoosts: string[];     // active boost product IDs
  originalAppUserId: string;
}

export interface PurchaseResult {
  success: boolean;
  tier?: string;
  boostKey?: string;
  error?: string;
  cancelled?: boolean;
}

// ── Initialize ───────────────────────────────────────────────────────────────
/**
 * Call once on app startup after the user is authenticated.
 * Safe to call on web — no-ops gracefully.
 */
export async function initializePurchases(userId: string): Promise<void> {
  if (!isNative()) return;

  try {
    const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
    const apiKey = import.meta.env.VITE_REVENUECAT_API_KEY_IOS;
    if (!apiKey) {
      console.warn('[purchases] VITE_REVENUECAT_API_KEY_IOS not set — IAP disabled');
      return;
    }
    await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR });
    await Purchases.configure({ apiKey, appUserID: userId });
  } catch (err) {
    console.error('[purchases] Failed to initialize RevenueCat:', err);
  }
}

// ── Get customer info ─────────────────────────────────────────────────────────
/**
 * Returns the current user's active entitlements.
 * On web returns null — tier comes from Supabase memberships table.
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!isNative()) return null;

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.getCustomerInfo();

    const activeEntitlements = Object.keys(customerInfo.entitlements.active ?? {});
    const activeTier = activeEntitlements
      .map((e) => ENTITLEMENT_TO_TIER[e])
      .filter(Boolean)[0] ?? null;

    return {
      activeTier,
      activeBoosts: [], // boosts are consumables — track via DB
      originalAppUserId: customerInfo.originalAppUserId,
    };
  } catch (err) {
    console.error('[purchases] getCustomerInfo failed:', err);
    return null;
  }
}

// ── Purchase membership ───────────────────────────────────────────────────────
/**
 * Presents the RevenueCat paywall on native.
 * On web, redirects to Stripe Checkout.
 */
export async function purchaseMembership(
  tier: 'hotmess' | 'connected' | 'promoter' | 'venue',
  accessToken: string
): Promise<PurchaseResult> {
  // Web: use existing Stripe checkout flow
  if (!isNative()) {
    return purchaseMembershipStripe(tier, accessToken);
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { offerings } = await Purchases.getOfferings();
    const current = offerings?.current;
    if (!current) return { success: false, error: 'No offerings available' };

    const pkg = current.availablePackages.find(
      (p) => p.product.identifier.toLowerCase().includes(tier)
    );
    if (!pkg) return { success: false, error: `Package for tier "${tier}" not found` };

    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    const purchased = Object.keys(customerInfo.entitlements.active ?? {}).includes(tier);

    return { success: purchased, tier: purchased ? tier : undefined };
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === 'PURCHASE_CANCELLED') return { success: false, cancelled: true };
    return { success: false, error: e?.message ?? 'Purchase failed' };
  }
}

// ── Purchase boost ────────────────────────────────────────────────────────────
/**
 * Purchases a consumable boost on native.
 * On web, redirects to Stripe Checkout.
 */
export async function purchaseBoost(
  boostKey: string,
  accessToken: string
): Promise<PurchaseResult> {
  if (!isNative()) {
    return purchaseBoostStripe(boostKey, accessToken);
  }

  const productId = BOOST_PRODUCT_IDS[boostKey];
  if (!productId) return { success: false, error: `Unknown boost: ${boostKey}` };

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { offerings } = await Purchases.getOfferings();

    // Find the boost product across all offerings.
    // RevenueCat module is `any` via shim — cast the per-offering value so
    // .availablePackages is reachable without losing the rest of the type.
    const allPackages = Object.values(offerings?.all ?? {}).flatMap(
      (o: { availablePackages?: Array<{ product: { identifier: string } }> }) => o.availablePackages ?? []
    );
    const pkg = allPackages.find((p) => p.product.identifier === productId);
    if (!pkg) return { success: false, error: `Boost product "${productId}" not in offerings` };

    await Purchases.purchasePackage({ aPackage: pkg });
    return { success: true, boostKey };
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === 'PURCHASE_CANCELLED') return { success: false, cancelled: true };
    return { success: false, error: e?.message ?? 'Purchase failed' };
  }
}

// ── Restore purchases ─────────────────────────────────────────────────────────
export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!isNative()) return null;
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor');
    const { customerInfo } = await Purchases.restorePurchases();
    const activeEntitlements = Object.keys(customerInfo.entitlements.active ?? {});
    const activeTier = activeEntitlements
      .map((e) => ENTITLEMENT_TO_TIER[e])
      .filter(Boolean)[0] ?? null;
    return { activeTier, activeBoosts: [], originalAppUserId: customerInfo.originalAppUserId };
  } catch (err) {
    console.error('[purchases] restorePurchases failed:', err);
    return null;
  }
}

// ── Stripe fallbacks (web) ────────────────────────────────────────────────────
async function purchaseMembershipStripe(
  tier: string,
  accessToken: string
): Promise<PurchaseResult> {
  try {
    const res = await fetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ tier }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
      return { success: true };
    }
    return { success: false, error: data.error ?? 'Checkout session failed' };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

async function purchaseBoostStripe(
  boostKey: string,
  accessToken: string
): Promise<PurchaseResult> {
  try {
    const res = await fetch('/api/stripe/create-boost-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ boostKey }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
      return { success: true };
    }
    return { success: false, error: data.error ?? 'Boost checkout failed' };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
