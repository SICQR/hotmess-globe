# v6 Alignment: AA System (Active Ambient)
**Spec:** HOTMESS-AA-System.docx  
**Chunk:** 03  
**Date:** 2026-05-01  

## Status: ALIGNED ✅

### Implemented (Chunk 03)
- AA glow ring on Ghosted cards for users with v6_aa_system flag on ✅
- Signal priority stack: Safety > Meet > Event > SharedListening > Radio > Market ✅
- HOMEMODE_MAX_SIGNALS = 2 cap ✅
- Freshness guards on all signal types ✅
- Signal builders: radio, shared listening, density nudge, drop signal ✅
- `radioIntensityFromDensity()` — 1.0/1.2/1.5 based on live count ✅

### Drift / Gaps
| # | Spec Requirement | Status | Note |
|---|---|---|---|
| D1 | AA glow pulsing animation (exact timing from spec §AA-3) | ⚠️ UNVERIFIED | Confirm animation duration/easing matches spec |
| D2 | HOMEMODE_MAX_SIGNALS = 2 enforcement | ✅ | rankSignals() caps at 2 |

### Action Required
- None blocking launch
