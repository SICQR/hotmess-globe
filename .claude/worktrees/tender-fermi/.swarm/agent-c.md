# Agent C — Market · Beacon FAB

**Bugs:** #10, #11
**Status:** RUNNING

---

## #10 Marketplace — Shop/Preloved products load
- [x] Audit MarketMode.tsx for data-fetch errors
- [x] Check /api/shopify/* handlers exist and are wired in vite.config.js
- [x] Check preloved_listings query
- [x] Fix any broken imports or fetch calls

**Finding:**
1. MarketMode imported from `@/lib/data` but file is at `@/lib/data/market` (FIXED)
2. handleProductTap was passing `{ productId, source }` but L2ShopSheet expects `{ product, source }` (FIXED)

**Commit:** aeb46a8 - fix(market): correct data import path + pass full product to sheet

---

## #11 Beacon creation FAB on /pulse
- [x] Locate BeaconFAB in PulseMode.tsx
- [x] Confirm openSheet('beacon', { mode: 'create' }) fires
- [x] Audit L2BeaconSheet multi-step BeaconCreator component
- [x] Fix any broken wiring

**Finding:**
All wiring is correct. PulseMode calls openSheet('beacon', { mode: 'create' }), L2BeaconSheet is registered, BeaconCreator works:
1. Step 1: Type selector (party, meetup, event, cruising, safety)
2. Step 2: Title, description, duration, visibility, intensity
3. Step 3: Location (auto-fetch geolocation) + confirm & drop
4. INSERT to "Beacon" table (PascalCase) with correct columns: kind, type, owner_email, lat, lng, starts_at, end_at, intensity, title, description, venue_address, metadata
5. Viewer mode works via BeaconViewer when beaconId is provided

No issues found. System is working as designed.

**Commit:** n/a (no code changes needed)

---

## Summary
