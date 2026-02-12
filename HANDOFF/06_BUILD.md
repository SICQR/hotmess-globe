# HOTMESS — Build Order

What to build, in what order. No ambiguity.

---

## MVP Scope

**Build these. Nothing else until these work.**

| # | Feature | Priority |
|---|---------|----------|
| 1 | Radio | The heartbeat |
| 2 | Tonight (Beacons/Events) | What's happening |
| 3 | Globe | Where's the energy |
| 4 | Care | Visible exits |
| 5 | Commerce | Funding |
| 6 | GHOSTED | Social (secondary) |
| 7 | Auth | Gated access |

---

## Phase 1: Foundation (Week 1)

### 1.1 Fix CI/CD ✅
- [x] Fix lint errors
- [x] Verify build passes
- [x] Verify typecheck passes
- [ ] Close stale PRs
- [ ] Deploy clean main to Vercel

### 1.2 Radio Homepage
Current: Globe is hero, radio is secondary
Target: Radio is hero, globe shows energy

**Tasks:**
- [ ] Radio player prominent above fold
- [ ] "What's on now" visible immediately
- [ ] Show schedule accessible
- [ ] Music playing when you arrive (autoplay on interaction)

**Components to use:**
- `ConvictPlayer.jsx` (exists, works)
- `RadioShowCard.jsx` (exists)

### 1.3 Navigation
Current: HOME • PULSE • EVENTS • MARKET • SOCIAL • MUSIC • MORE
Target: RADIO • TONIGHT • GHOSTED • SHOP • MORE

**Tasks:**
- [ ] Update `BottomNav.jsx`
- [ ] Rename routes
- [ ] Update icons

---

## Phase 2: Tonight & Beacons (Week 2)

### 2.1 Tonight Page
What's happening now. Beacons, events, energy.

**Tasks:**
- [ ] List tonight's beacons
- [ ] List tonight's events
- [ ] Globe showing energy (integrate existing globe)
- [ ] RSVP flow working

**Components to use:**
- `GlobeHero.jsx` (exists)
- `EventCard.jsx` (exists)
- `BeaconComposer.jsx` (exists)
- `EventRSVP.jsx` (exists)

### 2.2 Beacon System
Time-limited presence signals.

**Principles:**
- Beacons expire (time-limited)
- No exact locations
- Opt-in only
- Comforting even without response

**Tasks:**
- [ ] Create beacon flow working
- [ ] Beacon appears on globe
- [ ] Beacon expires automatically
- [ ] Travel time to beacon

---

## Phase 3: Care (Week 2)

### 3.1 Care Hub
Visible exits and landings.

**Tasks:**
- [ ] Care page accessible from every screen (1 tap)
- [ ] Aftercare resources
- [ ] "You good?" check-in prompts
- [ ] Late night detector
- [ ] SOS/panic button

**Components to use:**
- `PanicButton.jsx` (exists)
- `SafetyCheckinModal.jsx` (exists)
- `AftercareNudge.jsx` (exists)
- `FakeCallGenerator.jsx` (exists)

### 3.2 Care States
- [ ] Prompt after intensity (long session, late night)
- [ ] Prompt after messaging
- [ ] Always accessible, never buried

---

## Phase 4: Commerce (Week 3)

### 4.1 Shop
Merch, drops, funding.

**Tasks:**
- [ ] Shopify products display
- [ ] Add to cart
- [ ] Checkout flow (Shopify hosted)
- [ ] Order confirmation

**Components to use:**
- `ProductCard.jsx` (exists)
- `ShopCartDrawer.jsx` (exists)
- Shopify Storefront API (integrated)

### 4.2 Stripe Subscriptions
Premium tiers.

**Tasks:**
- [ ] Wire MembershipUpgrade to Stripe Checkout
- [ ] Handle webhook for subscription changes
- [ ] Show tier status in profile
- [ ] Gate premium features

**Pricing:**
| Tier | Price |
|------|-------|
| Free | £0 |
| HOTMESS+ | £4.99/mo |
| HOTMESS PRO | £14.99/mo |

---

## Phase 5: GHOSTED (Week 3-4)

### 5.1 Discovery Grid
Opt-in, contextual, not the lead.

**Tasks:**
- [ ] Profile grid working
- [ ] Filters working (basic)
- [ ] Match probability (subtle, not prominent)
- [ ] Right Now indicator
- [ ] Invisibility mode

**Components to use:**
- `ProfilesGrid.tsx` (exists)
- `ProfileCard.tsx` (exists)
- `MatchBar.tsx` (exists)
- `RightNowIndicator.jsx` (exists)

### 5.2 Messaging
Chat threads, voice notes.

**Tasks:**
- [ ] Thread list
- [ ] Send/receive messages
- [ ] Voice notes working
- [ ] Consent cue before first message

**Components to use:**
- `ChatThread.jsx` (exists)
- `ThreadList.jsx` (exists)
- `VoiceNote.jsx` (exists)

### 5.3 GHOSTED Principles
- [ ] No ranking by "hotness"
- [ ] No unread anxiety
- [ ] Invisibility without shame
- [ ] Exit always available
- [ ] Care link visible

---

## Phase 6: Polish (Week 4)

### 6.1 Consistency
- [ ] All buttons use design system
- [ ] All cards consistent
- [ ] Loading skeletons everywhere
- [ ] Error boundaries on all pages

### 6.2 Mobile
- [ ] Test every page on mobile
- [ ] Fix any layout breaks
- [ ] Touch targets 44px minimum

### 6.3 PWA
- [ ] Install prompt
- [ ] Offline fallback
- [ ] Push notifications (basic)

---

## Post-MVP (Later)

These wait until MVP is solid:

| Feature | Notes |
|---------|-------|
| Creator economy | Subscriptions, PPV, tips |
| Ticket resale | Marketplace |
| Video calls | Daily.co integration |
| AI features | Wingman, Scene Scout |
| Gamification | XP, leaderboards |
| Squad/groups | Group chat |
| Business tools | Promoter dashboard |
| Advanced filters | Saved filters |

---

## Success Criteria

**MVP is done when:**

- [ ] Radio plays on homepage
- [ ] Can see tonight's beacons
- [ ] Can RSVP to event
- [ ] Globe shows energy
- [ ] Can browse and buy from shop
- [ ] Subscriptions work (Stripe)
- [ ] Can sign up and create profile
- [ ] GHOSTED grid works
- [ ] Can message someone
- [ ] Care accessible from everywhere
- [ ] Safety button works
- [ ] Deploys without errors

---

## Acceptance Rules

**A feature is NOT done unless:**
- Exit exists
- Pause exists
- Care link exists
- Silence is neutral

**Code is NOT done unless:**
- Lint passes
- TypeCheck passes
- Build succeeds
- Tests pass (if applicable)

---

*Build Radio first. Everything else orbits it.*
