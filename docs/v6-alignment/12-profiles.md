# v6 Alignment: Profiles & Personas
**Spec:** HOTMESS-Profiles-Personas-v2.docx  
**Chunk:** N/A (pre-existing)  
**Date:** 2026-05-01  

## Status: PARTIAL ⚠️ (READY_LIMITED state missing)

### Already Implemented
- Profile.jsx (1270 lines): own + other-user + seller view modes ✅
- EditProfile.jsx (1139 lines): full profile editing ✅
- PersonaSwitcher.jsx (348 lines): multiple personas, personas table ✅
- Geo-fence auto-switch: switch_persona() RPC, lastFencePersonaRef ✅
- Match probability: 8-dimension scoring, OpenAI embeddings, /api/match-probability ✅
- GDPR-safe profile API: strips sensitive fields for other-user views ✅

### Drift / Gaps
| # | Spec Requirement | Status | Note |
|---|---|---|---|
| D1 | READY_LIMITED state: hide bio/looking_for/vibe/pronouns etc until after first Boo | ❌ MISSING | Spec §9. EditProfile shows all fields immediately. |
| D2 | Progressive completion: fields unlock after first Boo | ❌ MISSING | No `received_boo` gate on EditProfile field visibility |
| D3 | Persona silent switch label: "Weekend"/"Travel" in muted gold in profile header | ⚠️ UNVERIFIED | PersonaSwitcher.jsx exists but header label not confirmed |
| D4 | RecordManager.jsx placeholder (6 lines) | ❌ MISSING | No admin UI for label management. Spec notes this. |
| D5 | OPENAI_API_KEY required for embeddings; without it semantic dimension = 0 | ⚠️ | Known. Confirm env var is set in production. |
| D6 | Profile.jsx at 1270 lines — split recommended | ℹ️ | Tech debt. Not a launch blocker. |

### Action Required (pre-launch)
- D1/D2: In EditProfile.jsx — add `useFirst` gate that checks `profiles.received_first_boo` (or equivalent) before showing extended fields. DB: add `received_first_boo boolean DEFAULT false` if not present.
