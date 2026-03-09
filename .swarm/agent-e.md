# Agent E — SOS System

**Bugs:** #9
**Status:** RUNNING

---

## #9 SOS long-press → overlay → PIN dismiss
- [ ] Audit SOSButton.tsx: long-press handler fires triggerSOS() after 2s
- [ ] Audit SOSContext.tsx: sosActive state, triggerSOS() / clearSOS()
- [ ] Audit SOSOverlay.tsx: renders at z-200, PIN entry present
- [ ] Verify fake call 2-phase (ringing → connected)
- [ ] Verify "Exit & clear data" resets state
- [ ] Fix any broken wiring

**Finding:**
**Commit:**

---

## #9b SOS data writes (secondary check)
- [ ] Confirm location_shares INSERT uses correct table name
- [ ] Confirm right_now_status write targets TABLE (not profiles JSONB)
- [ ] Confirm emergency contacts notified (notifyContacts fires push)

**Finding:**
**Commit:**

---

## Summary
