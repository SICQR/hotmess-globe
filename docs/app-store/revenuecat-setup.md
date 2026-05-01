# RevenueCat Setup Guide — HOTMESS iOS/Android

> One-time setup Phil completes in RevenueCat dashboard + App Store Connect.  
> Last updated: 2026-05-01

---

## Prerequisites

- [ ] App Store Connect app created (Bundle ID: `com.hotmess.app`)
- [ ] In-App Purchases configured in App Store Connect (see below)
- [ ] RevenueCat account at https://app.revenuecat.com

---

## Step 1 — Create App Store In-App Purchases

In App Store Connect → Your App → In-App Purchases → Create:

### Subscription Group: "HOTMESS Membership"

| Product ID | Reference Name | Type | Price |
|------------|---------------|------|-------|
| `com.hotmess.membership.hotmess.annual` | HOTMESS Annual | Auto-Renewable | ~£XX/yr |
| `com.hotmess.membership.connected.annual` | Connected Annual | Auto-Renewable | ~£XX/yr |
| `com.hotmess.membership.promoter.annual` | Promoter Annual | Auto-Renewable | ~£XX/yr |
| `com.hotmess.membership.venue.annual` | Venue Annual | Auto-Renewable | ~£XX/yr |

### Consumable Boosts

| Product ID | Reference Name | Type |
|------------|---------------|------|
| `com.hotmess.boost.globe_glow` | Globe Glow | Consumable |
| `com.hotmess.boost.profile_bump` | Profile Bump | Consumable |
| `com.hotmess.boost.vibe_blast` | Vibe Blast | Consumable |
| `com.hotmess.boost.incognito_week` | Incognito Week | Non-Consumable |
| `com.hotmess.boost.extra_beacon_drop` | Extra Beacon Drop | Consumable |
| `com.hotmess.boost.highlighted_message` | Highlighted Message | Consumable |

---

## Step 2 — RevenueCat Dashboard Setup

1. Go to https://app.revenuecat.com → Create New Project → **HOTMESS**

2. **Add App** → iOS → Bundle ID: `com.hotmess.app`  
   Copy the **iOS API Key** (starts with `appl_`) — you'll need it in Step 4.

3. **Products** → Add each product ID from Step 1

4. **Entitlements** → Create:
   | Identifier | Display Name | Products Attached |
   |------------|-------------|-------------------|
   | `hotmess` | HOTMESS | `com.hotmess.membership.hotmess.annual` |
   | `connected` | Connected | `com.hotmess.membership.connected.annual` |
   | `promoter` | Promoter | `com.hotmess.membership.promoter.annual` |
   | `venue` | Venue | `com.hotmess.membership.venue.annual` |

5. **Offerings** → Create offering: `default`  
   Add packages for each membership tier and each boost product.

6. **Webhooks** → Add webhook:
   - URL: `https://hotmessldn.com/api/webhooks/revenuecat`
   - Events: All events (or at minimum: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE, PRODUCT_CHANGE)
   - Copy the **Webhook Shared Secret**

---

## Step 3 — Vercel Environment Variables

Set these in Vercel Dashboard → Project Settings → Environment Variables:

| Key | Value | Environment |
|-----|-------|-------------|
| `REVENUECAT_API_KEY_IOS` | `appl_xxxx...` (from RC dashboard) | Production |
| `REVENUECAT_API_KEY_ANDROID` | `goog_xxxx...` (when Android added) | Production |
| `REVENUECAT_WEBHOOK_SECRET` | (from RC webhook config) | Production |
| `VITE_REVENUECAT_API_KEY_IOS` | Same as above | Production |

> ⚠️ `VITE_REVENUECAT_API_KEY_IOS` is exposed to the client (Capacitor native context).
> This is safe — RevenueCat iOS API keys are intended to be public-facing.
> **Never expose `REVENUECAT_WEBHOOK_SECRET` with a `VITE_` prefix.**

After setting env vars, trigger a redeploy:
```bash
git commit --allow-empty -m "chore: redeploy after RC env vars" && git push origin main
```

---

## Step 4 — iOS App Configuration

The Capacitor config already has `handleApplicationNotifications: false` set
(required for RevenueCat to handle StoreKit notifications).

After `npx cap add ios` and `cd mobile && npm install`:
```bash
# RevenueCat is installed as a Capacitor plugin — no extra native steps needed.
cd mobile && npx cap sync ios
```

---

## Step 5 — Test Sandbox Purchases

1. In App Store Connect → Users & Access → Sandbox Testers → Add tester
2. On a physical iOS device, sign out of App Store → sign back in as sandbox tester
3. Open the HOTMESS app in Xcode (debug build)
4. Trigger a membership purchase flow
5. Verify webhook fires: check Vercel function logs at
   `https://vercel.com/phils-projects-59e621aa/hotmess-globe` → Functions tab → `/api/webhooks/revenuecat`
6. Verify `memberships` table updated in Supabase:
```sql
SELECT user_id, tier, status, payment_provider, ends_at
FROM memberships
WHERE payment_provider = 'revenuecat'
ORDER BY updated_at DESC
LIMIT 5;
```

---

## Architecture Summary

```
iOS App (Capacitor)
  └── @revenuecat/purchases-capacitor
       └── src/lib/purchases.ts  ← purchaseMembership() / purchaseBoost()
            ├── native path → RevenueCat SDK → Apple StoreKit
            └── web fallback → /api/stripe/create-checkout-session

RevenueCat
  └── webhook → POST /api/webhooks/revenuecat
                └── updates memberships table (tier, status, ends_at)
                    (same table used by Stripe webhook — consistent state)

Web browser
  └── Stripe Checkout (unchanged — existing flow)
```

---

## Files Changed in C7

| File | Change |
|------|--------|
| `mobile/package.json` | Added `@revenuecat/purchases-capacitor` |
| `src/lib/purchases.ts` | New — RevenueCat + Stripe IAP bridge |
| `api/webhooks/revenuecat.js` | New — webhook handler |
| `vercel.json` | Added REVENUECAT env stubs |
| `vite.config.js` | Added local dev route for webhook |
| `docs/app-store/revenuecat-setup.md` | This file |
