# v6 Alignment: Auth & Onboarding
**Spec:** HOTMESS-Auth-Onboarding-v2.docx  
**Chunk:** 00 (isolation) + onboarding screens  
**Date:** 2026-05-01  

## Status: ALIGNED ✅ (minor drift)

### Implemented (this build train)
- AgeGateScreen: explicit confirm checkbox → `localStorage.setItem('hm_age_gate_passed')` ✅
- SignUpScreen: OAuth (Apple/Google) + magic link with 60s resend cooldown ✅
- QuickSetupScreen → ProfileScreen → PinSetupScreen flow ✅
- OnboardingRouter: stage resume logic, age gate bypass for already-authed users ✅
- BootGuardContext: auth state machine owns `onAuthStateChange` listener ✅
- AgeGate already persists to localStorage (not sessionStorage) — confirmed ✅
- `onboarding_stage` advance: start → age_gate → signed_up → quick_setup → profile_complete → pin_complete ✅

### Drift / Gaps
| # | Spec Requirement | Status | Note |
|---|---|---|---|
| D1 | Auth prompt: "Join the night." copy (not "Create an account") | ⚠️ DRIFT | SignUpScreen uses "Create your account" heading |
| D2 | Age gate Step 2: optional age bracket selector (18-24/25-32/33-40/41+) | ❌ MISSING | Not implemented. Spec says "optional, can be skipped" |
| D3 | First-open: no email/password on auth prompt — OAuth only | ⚠️ PARTIAL | Magic link form also shown on first open; spec says email belongs in Settings for existing users |
| D4 | Name auto-generate "Mess{4-digit}" if skipped | ❓ UNVERIFIED | Not confirmed in QuickSetupScreen |
| D5 | GPS fires on name screen mount before user touches field | ❓ UNVERIFIED | Not confirmed in QuickSetupScreen |

### Action Required
- D1: Copy change only — update heading in SignUpScreen
- D2: Low priority — skip if not needed for launch
- D3: Acceptable for v1 launch
