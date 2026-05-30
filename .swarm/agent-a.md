# Agent A — Intention Bar · Notifications · Profile Completion

**Bugs:** #4, #7, #12
**Status:** COMPLETED

---

## #4 Intention bar → right_now_status TABLE write
✅ **VERIFIED CORRECT**

**Implementation:**
- IntentionBar component (HomeMode.tsx:126-165) renders 3 intent buttons (hookup/hang/explore)
- handleIntentSelect() at line 793 toggles state and shows RightNowModal
- RightNowModal.jsx (line 56-70) correctly uses `.upsert()` on right_now_status TABLE with `user_email` as key
- Query at line 804-809 correctly reads `intent` column from table (confirmed in schema: 20260104033500_create_right_now_status.sql)
- Flow: user clicks button → modal shows → user submits → writes to DB with correct intent value

**Commit:** No changes needed - already correct

---

## #7 Notifications bell → L2NotificationInboxSheet
✅ **VERIFIED CORRECT**

**Implementation:**
- HomeMode header line 969: `openSheet('notification-inbox' as Parameters<typeof openSheet>[0], {})`
- SheetRouter.jsx line 41 & 154: `L2NotificationInboxSheet` imported and registered as `'notification-inbox'`
- sheetSystem.ts line 245-251: `notification-inbox` registered in SHEET_REGISTRY with full=true (no auth required for viewing)
- Bell icon shows unread badge via useUnreadCount() hook (line 974-976)
- Policy check: no restrictions on opening notification-inbox from HomeMode header

**Commit:** No changes needed - already correct

---

## #12 Profile completion Edit link navigation
✅ **VERIFIED CORRECT**

**Implementation:**
- HomeMode section 11 (line 1140-1144): Profile card with Edit link
- SH component (line 98-118): onLink prop called onClick, renders amber button
- Line 1142: `onLink={() => navigate('/profile')}` goes to ProfileMode
- ProfileCard component (line 622-670): onClick also navigates to /profile
- useProfileCompletion() hook correctly calculates completion % and next step
- displayName, avatarUrl correctly read from profile data
- Card shows completion bar (amber until 100%, then green) and "Next: ..." text

**Commit:** No changes needed - already correct

---

## Summary
All three features verified as correctly implemented:
- Intention bar properly writes to right_now_status TABLE via RightNowModal
- Notifications bell opens L2NotificationInboxSheet with unread badge support
- Profile completion card shows real data and Edit link navigates to /profile

Code review completed: npm run lint ✅ (no errors), npm run typecheck ✅ (no errors)
