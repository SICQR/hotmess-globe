# v6 Alignment: Sound of the Night
**Spec:** HOTMESS-SoundOfTheNight-LOCKED.docx  
**Chunk:** 15  
**Date:** 2026-05-01  

## Status: ALIGNED ✅ (minor DB note)

### Implemented (Chunk 15)
- night_pulse_realtime: MATERIALIZED VIEW, 5-min pg_cron refresh CONCURRENTLY ✅
- CityPhase: QUIET/WARMING/RISING/PEAK/OVERDRIVE (heat_score 0-100) ✅
- PulseModeWidget: flag-gated v6_sound_of_the_night, reads matview ✅
- §9D: returns null if all zeroes (no synthetic energy) ✅
- §9B: stale matview >10min → zeroes heat/count ✅
- Radio WAVE: animated bars, speed tied to intensity ✅
- DROP badge from night_pulse_realtime.drop_active ✅
- RadioContext patched: density amplification via radioIntensityFromDensity() ✅
- beacons.radio_show_id FK column added ✅

### Drift / Gaps
| # | Spec Requirement | Status | Note |
|---|---|---|---|
| D1 | night_pulse_realtime uses heat_bins_city_summary (not globe_heat_tiles) | ✅ | globe_heat_tiles doesn't exist in DB; used correct table |
| D2 | city field in radio signals hardcoded to "london" | ⚠️ KNOWN | Spec acknowledges this as a placeholder. Fix: derive from user profile. |

### Action Required
- D2: Acceptable for London-only v1 launch
