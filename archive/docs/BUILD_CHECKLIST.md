# HOTMESS Globe - Build Checklist

> **Last Updated:** 2026-01-30
> **Status:** Foundation Complete, Implementation Ready

---

## ✅ Foundation (COMPLETE)

### Database Migrations (Run these in order)
- [x] `20260130000000_ai_knowledge_tables.sql` - AI knowledge base & conversations
- [x] `20260130000001_adult_content_system.sql` - Content ratings & moderation
- [x] `20260130000002_event_beacon_pricing.sql` - Beacon tiers & pricing
- [x] `20260130000003_persona_system.sql` - Multi-profile personas
- [x] `20260130000004_creator_economy.sql` - Subscriptions, PPV, tips

### Shared Hooks (Ready to use)
- [x] `useUserContext.js` - User state, tier, limits, preferences
- [x] `useRevenue.js` - Upsell triggers, usage tracking
- [x] `useGamification.js` - XP, streaks, achievements, challenges
- [x] `useSafety.js` - Check-ins, panic, trusted contacts
- [x] `useProfiles.js` - Persona management

---

## 🔨 Phase 1: AI Core

### Files to Create
- [ ] `api/ai/chat.js` - Main AI chat endpoint
- [ ] `api/ai/_tools.js` - Function calling definitions
- [ ] `api/ai/_system-prompt.js` - System prompt builder (update existing)
- [ ] `api/ai/_rag.js` - RAG retrieval (update existing)
- [ ] `supabase/seed/gay-world-knowledge.sql` - Venue/terminology seed data

### Components to Update
- [ ] `src/components/ai/GlobalAssistant.jsx` - Wire to new API

### Implementation Notes
```
- OpenAI GPT-4 with function calling
- Crisis detection with immediate helpline response
- RAG against platform_knowledge + gay_world_knowledge
- Context-aware quick questions by page
- Tool calls: searchProducts, findEvents, getRadioSchedule, etc.
```

---

## 🔨 Phase 2: Smart Features

### Safety Check-ins
- [ ] `api/safety/check-ins.js` - Cron job (every 15 min)
- [ ] `api/safety/respond.js` - Handle check-in responses
- [ ] `src/components/safety/SafetyCheckinModal.jsx` - Check-in UI

### Wingman Panel
- [ ] `api/ai/wingman.js` - Generate conversation starters
- [ ] `src/components/messaging/WingmanPanel.jsx` - UI with 3 openers

### Profile Optimizer
- [ ] `api/ai/profile-analysis.js` - Analyze profile issues
- [ ] `src/components/profile/ProfileOptimizer.jsx` - Optimization UI

### Scene Scout
- [ ] `api/ai/scene-scout.js` - Personalized nightlife recommendations
- [ ] `src/components/discovery/SceneScout.jsx` - Scene scout UI

### Implementation Notes
```
Wingman:
- Find common ground (interests, music, events)
- 3 openers: Specific, Flirty, Question
- Max 15 words each
- No clichés

Scene Scout:
- Score venues by: music match, tribe match, HOTMESS activity
- Return top 3 picks with narrative
- Show how many HOTMESS users heading there
```

---

## 🔨 Phase 3: Content Enhancement

### Radio
- [ ] `src/components/radio/RadioShowCard.jsx` - Enhanced with hero images
- [ ] Update `radioUtils.jsx` - Add heroImage, promoVideo, stingerAudio fields

### Marketing
- [ ] `src/components/marketing/RealTalkHero.jsx` - Honest tags showcase

### Implementation Notes
```
RadioShowCard:
- Hero image with gradient overlay
- Video overlay on hover (if available)
- Stinger audio button
- Fallback to gradient if no image

RealTalkHero:
- Feature tags: cali sober, PrEP, U=U, consent-first
- "Set Your Tags" CTA
```

---

## 🔨 Phase 4: Marketplace Enhancement

### Adult Content
- [ ] `src/components/marketplace/AgeVerificationGate.jsx` - Age gate modal
- [ ] Update `ProductForm.jsx` - Add content_rating field
- [ ] Update product cards - Show rating badge

### Event Beacons
- [ ] `src/pages/biz/PromoterDashboard.jsx` - Beacon management
- [ ] `src/components/beacons/BeaconPurchaseModal.jsx` - Purchase flow
- [ ] `api/beacons/purchase.js` - Stripe checkout for beacons

### Telegram Bot
- [ ] `api/telegram/bot.js` - Telegraf webhook handler
- [ ] `api/telegram/send.js` - Process telegram_notification_queue
- [ ] Bot commands: /start, /status, /notifications, /help

### Implementation Notes
```
Beacon Pricing:
- Standard: £25/40/60 (3/6/9 hrs) - Map only
- Featured: £50/80/120 - Map + Homepage
- Spotlight: £75/120/180 - Map + Homepage + Push

Telegram Automations:
- Product drops
- Order updates
- Event reminders
- Right Now matches
```

---

## 🔨 Phase 5: Discovery Enhancement

### GPS Smart Cards
- [ ] `src/features/profilesGrid/GPSSmartCard.tsx` - Enhanced profile card
- [ ] Update `ProfileCard.tsx` - Integrate GPS features

### Implementation Notes
```
GPSSmartCard features:
- Real-time distance badge
- Travel times (walk/bike/drive/uber)
- In-card action buttons
- AI match score + explanation
- Dynamic sizing by relevance
- Deep links to Google Maps / Uber
```

---

## 🔨 Phase 6: Major Features

### Persona System
- [ ] `src/components/profile/PersonaSwitcher.jsx` - Header dropdown
- [ ] `src/pages/PersonaManagement.jsx` - Manage all personas
- [ ] `src/components/profile/PersonaEditor.jsx` - Edit persona

### Video Calls
- [ ] `api/video/create-room.js` - Create Daily.co room
- [ ] `api/video/end-call.js` - End call, log duration
- [ ] `src/components/video/VideoCallRoom.jsx` - Main call UI
- [ ] `src/components/video/VideoCallControls.jsx` - Mute, camera, effects
- [ ] `src/components/video/VideoCallInvite.jsx` - Send/receive invites

### Creator Economy
- [ ] `src/pages/CreatorDashboard.jsx` - Creator home
- [ ] `src/components/creator/SubscriptionButton.jsx` - Subscribe CTA
- [ ] `src/components/creator/PPVContentCard.jsx` - Locked content card
- [ ] `src/components/creator/TipButton.jsx` - Send tip
- [ ] `api/creator/subscribe.js` - Create subscription
- [ ] `api/creator/purchase-ppv.js` - Unlock PPV content
- [ ] `api/creator/tip.js` - Send tip

### Implementation Notes
```
Personas:
- Types: main, travel, weekend, custom
- Inherit fields from main profile
- Auto-expire travel personas
- Only one active at a time

Video:
- Use Daily.co (simpler than raw WebRTC)
- Background blur option
- Easy exit button (safety)
- Post-call feedback prompt

Creator Economy:
- 80% to creator, 20% platform fee
- Subscription: £4.99-19.99/mo
- PPV: Individual unlock
- Tips: One-time payments
```

---

## 📋 Environment Variables Needed

```env
# AI
OPENAI_API_KEY=sk-...

# Telegram
TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...

# Video (Daily.co)
DAILY_API_KEY=...

# Already have
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
```

---

## 🏃 Execution Order

1. **Run migrations** → `supabase db push` or apply in dashboard
2. **Phase 1** (AI Core) → Foundation for all AI features
3. **Phase 2** (Hooks are done, build APIs + UIs)
4. **Phase 3** (Content) → Independent, quick wins
5. **Phase 4** (Marketplace) → Revenue features
6. **Phase 5** (Discovery) → GPS cards
7. **Phase 6** (Major) → Complex features last

---

## 🎯 Quick Wins (Do These First)

1. [ ] Run all migrations
2. [ ] Add `OPENAI_API_KEY` to env
3. [ ] Create `api/ai/chat.js` (enables all AI features)
4. [ ] Create `SafetyCheckinModal.jsx` (safety is core)
5. [ ] Create `RadioShowCard.jsx` (visual impact)

---

## 📁 Files Created Today

```
supabase/migrations/
├── 20260130000000_ai_knowledge_tables.sql
├── 20260130000001_adult_content_system.sql
├── 20260130000002_event_beacon_pricing.sql
├── 20260130000003_persona_system.sql
└── 20260130000004_creator_economy.sql

src/hooks/
├── useUserContext.js
├── useRevenue.js
├── useGamification.js
├── useSafety.js
└── useProfiles.js
```

---

**Ready to iterate. Start with migrations, then work through phases.**
