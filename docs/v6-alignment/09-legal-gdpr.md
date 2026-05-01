# v6 Alignment: Legal & GDPR
**Spec:** HOTMESS-Legal-Compliance-v1-FINAL.docx  
**Chunk:** 17b  
**Date:** 2026-05-01  

## Status: ALIGNED ✅ (one hard blocker documented)

### Implemented (Chunk 17b)
- age_verification_log table: method, verified_at, ip_hash, ua_hash, 12mo retention ✅
- safety_alerts table: alert_type, location_data JSONB, location_stripped_at ✅
- RLS on both tables ✅
- data-retention cron: daily 02:00 UTC ✅
  - meet_sessions: DELETE > 48h ✅
  - messages: DELETE > 30d ✅
  - age_verification_log: DELETE > 12mo ✅
  - taps: DELETE > 90d ✅
  - safety_alerts: strip location at 7d, delete at 90d ✅
- SAR export endpoint: GET /api/gdpr/export (GDPR Art. 15) ✅
- gdpr_requests audit log on SAR ✅
- AgeGate: localStorage (not sessionStorage) — confirmed ✅

### Drift / Gaps
| # | Spec Requirement | Status | Note |
|---|---|---|---|
| D1 | IWF CSAM hash-matching | ❌ HARD BLOCKER | External vendor integration required. Cannot launch to public UK without this. |
| D2 | Proactive age verification for new users (beyond age gate checkbox) | ⚠️ | Spec notes checkbox is legal gate v1; formal ID check is a future enhancement |
| D3 | Consent withdrawal UI in Settings | ⚠️ MISSING | gdpr_consents table exists; no UI for users to withdraw consent types |

### Action Required
- D1: Must engage IWF vendor before public UK launch. Estimated 2-4 week integration.
- D3: Add consent management page in Settings before public launch
