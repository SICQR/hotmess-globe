# v6 Alignment: Market & Commerce
**Spec:** HOTMESS-Market-Commerce-Rules.docx  
**Chunk:** 16 (HNH Mess only)  
**Date:** 2026-05-01  

## Status: PARTIAL ⚠️

### Implemented
- HNH Mess: Stripe checkout, daily cap, attribution ✅ (Chunk 16)
- Preloved: market_listings table, checkout flow ✅ (pre-existing)
- 10% commission structure in DB/webhook ✅

### Drift / Gaps
| # | Spec Requirement | Status | Note |
|---|---|---|---|
| D1 | Shopify env vars not set in Vercel (SHOP_DOMAIN + STOREFRONT_TOKEN) | ❌ BLOCKER | Market Shop shows nothing. Must fix before any venue night. |
| D2 | Drops feature: editorial commerce with countdown, story, scarcity | ❌ NOT BUILT | Not in v6 build train scope |
| D3 | Stripe Connect for seller payouts (48h after delivery) | ❌ NOT BUILT | Stripe Connect not configured. Preloved payouts are manual. |
| D4 | Dispute resolution flow in ops panel | ❌ NOT BUILT | 14-day window policy exists in spec; no UI |
| D5 | "Prepared" globe signal for HNH purchasers | ❌ NOT BUILT | See HNH alignment report |

### Action Required (pre-launch blocker)
- D1: Phil to add Shopify env vars to Vercel immediately
