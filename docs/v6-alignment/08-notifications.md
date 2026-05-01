# v6 Alignment: Notifications
**Spec:** HOTMESS-Notifications-v1.docx  
**Chunk:** 17a  
**Date:** 2026-05-01  

## Status: ALIGNED ✅

### Implemented (Chunk 17a)
- Stale signal drop: Movement/Arrival/Moment >15s → status=dropped, dropped_stale=true ✅
- Daily push cap: 3 per user per day ✅
- Quiet hours: 00:00–09:00 local → downgrade to in_app ✅
- Safety bypass: sos/get_out/land_time_miss skip all caps ✅
- Priority ordering: push_priority ASC before processing ✅
- cron_runs table: visibility on dispatch + process jobs ✅
- notification_outbox: signal_type, dropped_stale, push_priority columns added ✅

### Drift / Gaps
| # | Spec Requirement | Status | Note |
|---|---|---|---|
| D1 | push_priority values: Movement=1, Arrival=2, Intent=3, Moment=4, System=5 | ✅ | Implemented in process.js |
| D2 | Mutual stall nudge ("Still happening?") | ❓ UNVERIFIED | DEGRADED_COPY.mutualStall exists in failureSystem.ts but no notification trigger |

### Action Required
- None blocking launch
