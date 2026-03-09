# Agent D — Chat Flow · Profile Mode

**Bugs:** #5, #6
**Status:** RUNNING

---

## #5 Chat flow after L2ProfileSheet fix
- [ ] Trace openSheet('chat') call path from L2ProfileSheet
- [ ] Confirm sheetPolicy allows chat from profile sheet stack
- [ ] Verify L2ChatSheet receives correct threadId/userId props
- [ ] Fix any broken prop passing

**Finding:**
**Commit:**

---

## #6 Profile mode — Edit profile, photo upload, persona switcher
- [ ] Audit ProfileMode.tsx for broken sections
- [ ] Check photo upload: does it call Supabase storage correctly?
- [ ] Check persona switcher: does long-press avatar open PersonaSwitcherSheet?
- [ ] Check manage-personas navigation from switcher
- [ ] Fix any broken wiring

**Finding:**
**Commit:**

---

## Summary
