# v6 Alignment: HNH Mess GTM
**Spec:** HOTMESS-HNHMess-GTM-LOCKED.docx  
**Chunk:** 16  
**Date:** 2026-05-01  

## Status: ALIGNED ✅

### Implemented (Chunk 16)
- HNHProximityCard: flag-gated v6_hnh_mess_gtm, venue check, stock indicator ✅
- HNHRadioCard: Dial-A-Daddy pattern match, radio attribution ✅
- Stripe checkout: hnh_mess type with daily cap (MAX_HNH_DAILY_ORDERS, default 20) ✅
- Attribution metadata: source, venue_id, beacon_id, radio_show_id in Stripe session ✅
- Webhook: hnh_purchase event to analytics_events with full attribution ✅
- 429 on daily cap exceeded ✅

### Drift / Gaps
| # | Spec Requirement | Status | Note |
|---|---|---|---|
| D1 | Shopify env vars: SHOPIFY_SHOP_DOMAIN + SHOPIFY_API_STOREFRONT_ACCESS_TOKEN | ❌ BLOCKER | Spec: "Market Shop shows nothing until these are added. Fix before any venue night." |
| D2 | "Prepared" signal — commerce integration (user with HNH purchase shows subtle globe signal) | ❌ MISSING | Not implemented in this chunk |
| D3 | Fulfilment contact: Dean Davies dean.davies.sw2@gmail.com | ℹ️ | Operational only, not code |

### Action Required
- D1: `vercel env add SHOPIFY_SHOP_DOMAIN production` + `SHOPIFY_API_STOREFRONT_ACCESS_TOKEN` — must do before first venue night
