# v6 Spec Alignment Index
**Build Train:** feat/v6-spec-build  
**Sweep Date:** 2026-05-01  
**Chunks complete:** 00–17c  

## Summary

| Report | Spec | Status | Pre-launch Blocker |
|---|---|---|---|
| 01-auth-onboarding | Auth & Onboarding v2 | ✅ ALIGNED (minor) | No |
| 02-globe-beacons | Globe & Beacons v2 | ⚠️ PARTIAL | No (PulseMode deferred) |
| 03-aa-system | AA System | ✅ ALIGNED | No |
| 04-proximity-meet | Proximity Meet | ✅ ALIGNED | No |
| 05-proximity-failure | Proximity Failure System | ✅ ALIGNED | No |
| 06-sound-of-night | Sound of the Night | ✅ ALIGNED | No |
| 07-chat-messaging | Chat & Messaging | ❌ PARTIAL | Yes (Match Auto-Action, Meet Trigger) |
| 08-notifications | Notifications v1 | ✅ ALIGNED | No |
| 09-legal-gdpr | Legal & GDPR | ✅ ALIGNED | Yes (IWF CSAM) |
| 10-hnh-mess | HNH Mess GTM | ✅ ALIGNED | Yes (Shopify env vars) |
| 11-radio | Radio v2 | ⚠️ PARTIAL | Yes (MiniPlayer bug, dual audio) |
| 12-profiles | Profiles & Personas | ⚠️ PARTIAL | Yes (READY_LIMITED state) |
| 13-market-commerce | Market & Commerce | ⚠️ PARTIAL | Yes (Shopify env vars) |
| 14-first-five-minutes | First 5 Minutes | ⚠️ PARTIAL | Verify before launch |

## Pre-Launch Blockers (summary)

| # | Item | Owner | Effort |
|---|---|---|---|
| B1 | IWF CSAM hash-matching integration | External vendor | 2-4 weeks |
| B2 | Shopify env vars in Vercel (SHOPIFY_SHOP_DOMAIN + SHOPIFY_API_STOREFRONT_ACCESS_TOKEN) | Phil (5 min) | Trivial |
| B3 | RadioMiniPlayer: remove /more gate — show on all routes | Claude | ~15 min |
| B4 | Radio.jsx: refactor to use RadioContext (kill dual audio) | Claude | ~30 min |
| B5 | Chat: Match Auto-Action (prefetch at 1.2s post-match) | Claude | ~1 hour |
| B6 | Chat: Meet Trigger card auto-surface on proximity/venue match | Claude | ~2 hours |
| B7 | Profiles: READY_LIMITED — hide extended fields until first Boo | Claude | ~1 hour |

## Non-blockers (post-launch)
- Age bracket selector in age gate (Step 2)
- Consent revocation UI in Settings
- Drop editorial commerce feature
- Stripe Connect for Preloved payouts
- Duration selector for beacons (1h/4h/24h)
