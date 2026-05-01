# v6 Alignment: Radio
**Spec:** HOTMESS-Radio-v2.docx  
**Chunk:** 15 (density amplification added)  
**Date:** 2026-05-01  

## Status: PARTIAL ⚠️ (2 known bugs from spec)

### Already Implemented (pre-existing + Chunk 15)
- RadioContext.tsx: persistent single audio element, never unmounts ✅
- Stream URL: listen.radioking.com/radio/736103/stream/802454 with cache buster ✅
- Sound consent: hm_sound_consent_v1 localStorage, SoundConsentModal ✅
- Radio signals: emitRadioSignal() throttled 5min, writes to radio_signals ✅
- Listener heartbeat: 60s upsert to radio_listeners ✅
- pauseForSheet() / resumeFromSheet() integration ✅
- Chunk 15: density amplification — radioIntensityFromDensity() wired to emitRadioSignal() ✅

### Drift / Gaps
| # | Spec Requirement | Status | Note |
|---|---|---|---|
| D1 | RadioMiniPlayer visible on ALL routes (not just /more) | ❌ BUG | Spec explicitly calls this out: "gated to /more — this is wrong" |
| D2 | Radio.jsx: must use RadioContext audio element (not its own) | ❌ BUG | Spec: "two audio instances exist simultaneously" — Radio.jsx must be refactored |
| D3 | City field derived from user profile (not hardcoded "london") | ⚠️ KNOWN | Acceptable for London-only v1 |
| D4 | Consent revocation UI in Settings | ⚠️ MISSING | hm_sound_consent_v1 set forever, no revoke path |

### Action Required (pre-launch)
- D1: In RadioMiniPlayer.tsx — remove `/more` pathname guard. Render when isPlaying && !hidden on all routes.
- D2: In Radio.jsx — remove local audio element; consume RadioContext's play/pause/isPlaying instead.
