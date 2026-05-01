# v6 Alignment: Chat & Messaging
**Spec:** HOTMESS-Chat-Messaging-SEALED.docx  
**Chunk:** N/A (pre-existing system)  
**Date:** 2026-05-01  

## Status: PARTIAL ❌ (3 spec features not wired)

### Already Built (pre-existing)
- L2ChatSheet.jsx (1693 lines): text, photo, location, meetpoint, travel ✅
- ChatThread.jsx (810 lines): realtime, reactions, media viewer, mute, search ✅
- WingmanPanel.jsx (264 lines): AI openers via /api/ai/wingman ✅
- MeetpointCard.tsx: inline map + ETA countdown ✅
- TravelModal.jsx: share location as meetpoint ✅
- TypingIndicator.jsx (297 lines): full typing presence ✅

### Drift / Gaps
| # | Spec Requirement | Status | Note |
|---|---|---|---|
| D1 | Match Auto-Action: prefetch chat + Wingman at 1.2s post-match | ❌ MISSING | MatchOverlay shows 8s CTA but no silent prefetch. User sees blank composer. |
| D2 | Contextual starter chips (3 chips below composer, tap = instant send) | ❌ MISSING | WingmanPanel exists but as a separate panel, not auto-surface chips |
| D3 | Meet Trigger card: auto-surfaces when both users at same venue OR < 300m | ❌ MISSING | MeetpointCard built but not auto-triggered by proximity/venue match |
| D4 | Conversation momentum nudge (signal-based, no timers) | ❌ MISSING | Not implemented |
| D5 | first_message_sent analytics event | ⚠️ PARTIAL | Chunk 17c listed as server-side; needs wiring in message send handler |

### Action Required (pre-launch blockers)
- D1: Add to MatchOverlay — `setTimeout(() => prefetchChatThread(theirId); prefetchWingman(theirId), 1200)`
- D2: Add chip row above composer when `messageCount === 0`, auto-send on tap
- D3: Wire MeetpointCard auto-surface in ChatThread on right_now_status change + distance check
- D4: Lower priority — no spec §number enforcement, but spec calls it "important"
- D5: Instrument in message send handler
