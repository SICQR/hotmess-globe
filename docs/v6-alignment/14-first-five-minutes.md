# v6 Alignment: First 5 Minutes
**Spec:** HOTMESS-First5Minutes-LOCKED.docx  
**Chunk:** v6_first_five_minutes flag (pre-existing F5M flow)  
**Date:** 2026-05-01  

## Status: PARTIAL ⚠️

### Implemented (pre-existing)
- First5MinutesFlow intercept in OnboardingRouter when f5mEnabled ✅
- Cold open: globe visible (L0 layer) ✅
- AgeGate + SignUp + QuickSetup flow ✅
- Sound consent modal ✅

### Drift / Gaps
| # | Spec Requirement | Status | Note |
|---|---|---|---|
| D1 | Cold open: live count "67 men live right now" on globe at 3s | ⚠️ UNVERIFIED | right_now_status COUNT query on BootGuard LOADING state — not confirmed in current build |
| D2 | Auth prompt slide-up at 5s (or when COUNT resolved, whichever later) | ⚠️ UNVERIFIED | Timing not confirmed in BootGuardContext |
| D3 | Globe visible and alive <300ms after launch | ⚠️ | Performance not benchmarked |
| D4 | Empty grid prevention: city-level fallback if no nearby users | ⚠️ UNVERIFIED | Spec: "empty grid = the night is dead. Never." |
| D5 | Ghosted grid priority: Live > Very close > Moving > Online > Offline | ⚠️ UNVERIFIED | Sort order not confirmed in profiles API |
| D6 | A/B: first 5 minutes funnel captured in analytics_events | ✅ | Chunk 17c instruments onboarding events |

### Action Required
- D1–D5: Verify in BootGuardContext + profiles API query ordering before launch
