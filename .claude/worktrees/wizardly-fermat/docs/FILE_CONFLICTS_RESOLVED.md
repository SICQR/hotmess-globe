# File Conflicts Resolution Documentation

This document explains the resolution of apparent file duplicates in the codebase and documents files that may seem like duplicates but serve different purposes.

## Duplicates Removed ✅

### 1. RightNowGrid Components
**Removed Files:**
- `src/components/discovery/RightNowGrid.jsx` (157 lines)
- `src/components/social/RightNowGrid.tsx` (145 lines)

**Reason:** Neither version was imported anywhere in the codebase. These appear to be obsolete implementations that were replaced by other components.

### 2. PersistentRadioPlayer
**Removed File:**
- `src/components/shell/PersistentRadioPlayer.tsx` (142 lines)

**Kept File:**
- `src/components/shell/PersistentRadioPlayer.jsx` (253 lines)

**Reason:** The `.jsx` version is more complete with:
- Full RadioContext integration via `useRadio()` hook
- LIVE stream support (`LIVE_STREAM_URL`)
- Complete drawer UI with backdrop and animations
- Autoplay functionality
- Quick links navigation
- Track playlist management

### 3. CreatorDashboard
**Removed File:**
- `src/pages/creator/CreatorDashboard.jsx` (72 lines) - minimal version

**Kept File:**
- `src/pages/CreatorDashboard.jsx` (485 lines)

**Reason:** The main version is actively used in routes (`src/routes/bizRoutes.jsx` and `src/pages.config.js`) and provides comprehensive functionality including earnings tracking, uploads management, and settings.

---

## Files That Are NOT Duplicates ✅

These files may appear similar but serve distinct purposes:

### 1. Stripe Webhook Endpoints

#### `/api/stripe/webhook` (`api/stripe/webhook.js` - 231 lines)
**Purpose:** Handles official Stripe platform webhook events
- **Events:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.paid`, `payment_intent.succeeded`, `payment_intent.payment_failed`
- **Use Case:** Subscription management, invoice tracking, payment verification
- **Configured:** This is the official webhook URL registered in Stripe dashboard

#### `/api/webhook/stripe` (`api/webhook/stripe.js` - 163 lines)
**Purpose:** Handles custom payment processing for specific product types
- **Event Types:** `ticket_purchase`, `product_purchase`, `business_credits`
- **Use Case:** MessMarket products, event tickets, business amplification credits
- **Context:** Application-specific payment flows

**Why Both Needed:** Stripe sends webhooks to `/api/stripe/webhook`, while custom payment flows internally dispatch to `/api/webhook/stripe` for specialized handling.

---

### 2. Profile API Endpoints

#### `/api/profile` (`api/profile.js`)
**Purpose:** Single profile lookup
- **Method:** GET
- **Query Params:** `email` or `uid` (auth_user_id)
- **Returns:** Single profile object or 404
- **Use Case:** Profile page, user details lookup

#### `/api/profiles` (`api/profiles.js`)
**Purpose:** Paginated profile list
- **Method:** GET
- **Query Params:** `cursor`, `limit`, gender filters
- **Returns:** Array of profiles with pagination metadata
- **Use Case:** Discovery grid, profile browsing, search results

**Why Both Needed:** Different API patterns for single vs collection resources (RESTful design).

---

### 3. Notification Dispatch Endpoints

#### `/api/notifications/dispatch` (`api/notifications/dispatch.js` - 115 lines)
**Purpose:** Scheduled notification dispatch (cron job)
- **Auth:** Secret-based (`OUTBOX_CRON_SECRET` or `CRON_SECRET`)
- **Trigger:** Vercel cron header or manual with secret
- **Use Case:** Automated scheduled notifications

#### `/api/admin/notifications/dispatch` (`api/admin/notifications/dispatch.js` - 105 lines)
**Purpose:** Admin-triggered manual notification dispatch
- **Auth:** Bearer token + rate limiting
- **Requires:** Authenticated user with admin role
- **Use Case:** Manual notification sends from admin dashboard

**Why Both Needed:** Different access patterns - automated cron vs authenticated admin control with rate limiting.

---

## Verification Checklist

After removing duplicates, verify:
- ✅ Linter passes (`npm run lint`)
- ✅ Build succeeds (`npm run build`)
- ✅ Tests pass (`npm run test:run`)
- ✅ Code review completed
- ✅ Security scan completed

---

## Future Guidance

When encountering similar file names:
1. Check import statements with `grep -r "import.*FileName"`
2. Compare file sizes and implementations
3. Look for subtle naming differences (profile vs profiles, webhook paths)
4. Verify API endpoint usage patterns
5. Document the distinction if both are needed

Last Updated: 2026-02-14
