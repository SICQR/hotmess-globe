# v6 Alignment: Globe & Beacons
**Spec:** HOTMESS-Globe-Beacons-v2-FINAL.docx  
**Chunk:** N/A (pre-existing, Chunk 14 proximity failure added globe intensity layer)  
**Date:** 2026-05-01  

## Status: PARTIAL ⚠️ (PulseMode blocked)

### Implemented
- EnhancedGlobe3D.jsx (2089 lines): Three.js r128, custom touch, no OrbitControls ✅
- Beacons: drop, scan (QR/NFC), check-in, redeem fully operational ✅
- GlobeContext: session-local state, Realtime beacon INSERT → pulse animation ✅
- Canvas constraints: top 36px + safe-area, bottom 83px (no nav overlap) ✅
- k-anonymity >= 20, time jitter 3-7min, privacy-first visual language ✅
- Chunk 14: globeIntensity() table — EN_ROUTE/ARRIVAL/MEETPOINT/MET intensities ✅

### Drift / Gaps
| # | Spec Requirement | Status | Note |
|---|---|---|---|
| D1 | PulseMode: full features (not "Coming Soon" teaser) | ❌ MISSING | Spec says "deliberately scaled back for sprint" — scaffolding done, ship when ready |
| D2 | Beacon duration selector: 1h / 4h / 24h | ❌ MISSING | Hardcoded to 4h. Spec: "add if variable expiry needed" |
| D3 | Drop spec: Drop beacon activates on live Drop, intensity 0.5 | ❌ MISSING | HNH Mess GTM (Chunk 16) done; Drop beacon integration not implemented |
| D4 | L0 globe visible before auth resolves (cold open) | ⚠️ UNVERIFIED | Spec: globe must be visible and alive while auth loads. Verify in F5M flow. |

### Action Required
- D1: Not a blocker — spec explicitly says ship when ready
- D3: Needed before Drops feature launches (not in current build train scope)
