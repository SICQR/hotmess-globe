# HOTMESS — Feature Inventory
**Generated:** 2026-02-26
**Source:** Codebase analysis + Figma FigJam + GitHub issues + Supabase schema + local project recovery

Legend: ✅ Complete | ⚠️ Partial | ❌ Not built | 🗄️ DB only (no UI)

---

## AUTH & ONBOARDING

| Feature | Status | Location | Notes |
|---------|--------|---------|-------|
| Supabase email auth | ✅ | `AuthContext.jsx` | Magic link + email/password |
| Google OAuth | ✅ | `AuthContext.jsx` | Sign in with Google |
| Telegram login | ✅ | `TelegramLogin.jsx` + `api/auth/telegram/verify.js` | Primary auth |
| Boot FSM | ✅ | `BootGuardContext.jsx` | 6-state machine |
| Age gate (18+) | ✅ | `AgeGate.tsx` + `interrupts/AgeGate.tsx` | localStorage bypass |
| Onboarding (6 steps) | ✅ | `OnboardingGate.jsx` | Step 6 = community attestation |
| Community attestation | ✅ | Migration `20260226000070` | `profiles.community_attested_at` |
| PIN lock overlay | ✅ | `PinLockContext.jsx` | Z-1000, biometric stub |
| 2FA setup | ⚠️ | `TwoFactorSetup.jsx` | UI only, no backend |
| Face verification | ⚠️ | `FaceVerification.jsx` | Placeholder |
| About / Legal pages | ❌ | N/A | **No /about, /legal, /accessibility routes** |
| GDPR cookie banner | ❌ | N/A | **Required for UK/EU, CookieBanner.tsx in old copy** |

---

## SOCIAL DISCOVERY (GHOSTED MODE)

| Feature | Status | Location | Notes |
|---------|--------|---------|-------|
| 3-col proximity grid | ✅ | `GhostedMode.tsx` | Infinite scroll, online dot |
| Profile viewing | ✅ | `Profile.jsx`, `L2ProfileSheet` | Deep link via `?uid=` |
| Online indicators | ✅ | `ProfileCard.tsx` | Green dot + last seen |
| Taps (likes) | ✅ | `useTaps.ts`, `taps` table | Optimistic updates |
| Woofs (super-like) | ✅ | Same as above | tap_type = 'woof' |
| Right Now toggle | ✅ | `useRightNowBeacon.js`, `NowSignalContext` | Lime beacon |
| Looking For tags | ✅ | Profile grid display | Up to 3 tags |
| Persona switching | ✅ | `PersonaContext.jsx` | 5 personas, long-press avatar |
| Bookmarks / favorites | ✅ | `user_favorites` table | Save profiles/events |
| Block users | ✅ | `L2BlockedSheet.jsx` | profiles_blocked table |
| Report users | ✅ | `ReportButton.jsx` | Moderation queue |
| Profile matching / scoring | ⚠️ | `useMatchProfiles.ts` | Score logic exists, AI partial |
| AI matchmaker UI | ⚠️ | `AIMatchmaker.jsx` | Scoring engine, no full UI |
| Creator card variant | ❌ | N/A | **Figma design exists, not built** |
| Hookup card variant | ❌ | N/A | **Figma design, not built** |
| Auto skin switch (geo) | ❌ | N/A | **Figma design, not built** |
| Travel persona skin | ❌ | N/A | **Figma design, not built** |
| Squads UI | 🗄️ | `squads`, `squad_members` tables | **DB live, no UI** |

---

## MESSAGING & REAL-TIME

| Feature | Status | Location | Notes |
|---------|--------|---------|-------|
| 1-on-1 chat | ✅ | `ChatThread.jsx`, `messages` table | Full featured |
| Chat threads list | ✅ | `chat_threads` table | unread_count JSONB |
| Typing indicator | ✅ | `useTypingIndicator.ts` | Realtime broadcast, 0 DB writes |
| Read receipts | ✅ | Chat timestamps | Basic implementation |
| Push notifications | ✅ | `usePushNotifications.ts`, Web Push | Browser + mobile |
| Unread badge | ✅ | `useUnreadCount.ts`, `OSBottomNav` | Realtime subscription |
| Incoming call banner | ✅ | `IncomingCallBanner.tsx` | Z-180, 30s auto-dismiss |
| Persona-bound chat | ❌ | N/A | **Figma spec: messages not scoped to persona** |
| Group chat | ⚠️ | `GroupChatManager.jsx` | UI exists, no backend |
| Voice notes | ❌ | `VoiceNote.jsx` | Stub only |
| Message reactions | ⚠️ | Chat bubble UI | Basic emoji, not fully integrated |

---

## GLOBE & SPATIAL (PULSE MODE)

| Feature | Status | Location | Notes |
|---------|--------|---------|-------|
| 3D globe (Three.js) | ✅ | `UnifiedGlobe.tsx` | Only renders on /pulse |
| Beacon rendering | ✅ | `GlobeBeacons.tsx` | Color-coded by type |
| City zoom animation | ✅ | `zoomChoreography.js` | London, Berlin, NYC, LA |
| WorldPulse realtime | ✅ | `WorldPulseContext.jsx` | Supabase subscriptions |
| City Pulse Bar | ✅ | `CityPulseBar.jsx` | Quick navigation |
| Beacon detail view | ✅ | `BeaconDetail.jsx` | Full event with RSVP |
| Beacon comments | ✅ | `CommentsSection.jsx` | Discussion threads |
| Beacon creation | ✅ | `L2BeaconSheet.jsx` | 3-step flow |
| Right Now indicator | ✅ | `RightNowIndicator.jsx` | Lime beacon for live presence |
| Globe 2D fallback | ⚠️ | `GlobeFallback.jsx` | Mobile fallback, limited |
| AR beacon discovery | ❌ | Placeholder | Camera-based, not started |
| Performance monitor | ✅ | `GlobePerformanceMonitor.jsx` | FPS monitoring |

---

## EVENTS

| Feature | Status | Location | Notes |
|---------|--------|---------|-------|
| Event listings | ✅ | `EventsMode.tsx` | Browse + filter |
| Event RSVP | ✅ | `EventRSVP.jsx` | Attendance tracking |
| Event calendar | ✅ | `Calendar.jsx`, `PulseCalendar.tsx` | Date navigation |
| Event reminders | ✅ | `EventReminders.jsx` | Notification reminders |
| Event scraper (auto-import) | ✅ | `api/events/scrape.js`, `api/events/cron.js` | Daily at 3am |
| Event QR / check-in | ✅ | `api/scan/check-in.js`, `QRCodeGenerator.jsx` | QR scanning |
| Event insights | ⚠️ | `EventInsights.jsx` | Analytics stub |
| Event waitlist | ⚠️ | `EventWaitlist.jsx` | UI placeholder |
| Event creation | ✅ | `L2CreateEventSheet.jsx` | Full creation flow |
| User check-in history | 🗄️ | `user_checkins` table | **DB live, no UI** |
| Venue Kings | 🗄️ | `venue_kings` table | **DB live, no UI** |

---

## SAFETY

| Feature | Status | Location | Notes |
|---------|--------|---------|-------|
| SOS button (long-press) | ✅ | `SOSButton.jsx`, `SOSContext.tsx` | 600ms trigger |
| SOS overlay | ✅ | `SOSOverlay.tsx` | Z-200, red theme |
| Live location share | ✅ | `LiveLocationShare.jsx` | Emergency contacts |
| Fake call generator | ✅ | `FakeCallGenerator.jsx` | Simulates incoming call |
| Emergency contacts | ✅ | `L2EmergencyContactSheet.jsx`, `emergency_contacts` table | CRUD |
| Check-in timer | ✅ | `SafetyCheckinModal.jsx` | Custom interval |
| Aftercare nudge | ✅ | `AftercareNudge.jsx` | Post-event wellness |
| Report system | ✅ | `ReportButton.jsx` | Flag content/users |
| Block system | ✅ | `BlockButton.jsx`, `profiles_blocked` table | Block users |
| Full-screen fake call overlay | ⚠️ | `FakeCallGenerator.jsx` | **Figma has Z-200 interrupt screen, not built** |
| Trusted contacts | 🗄️ | `trusted_contacts` table | **DB live, no UI** |

---

## COMMERCE (MARKET MODE)

| Feature | Status | Location | Notes |
|---------|--------|---------|-------|
| Shopify storefront | ✅ | `api/shopify/*.js` | Full headless integration |
| Product grid | ✅ | `Shop.jsx`, `ProductCard.jsx` | Browse Shopify products |
| Cart system | ✅ | `ShopCartContext.jsx`, `L2CartSheet.jsx` | localStorage persist |
| Checkout | ✅ | `L2CheckoutSheet.jsx` | Shopify redirect |
| P2P marketplace | ✅ | `preloved_listings` table | User-to-user listings |
| Seller dashboard | ✅ | `SellerDashboard.jsx` | Sales analytics |
| Seller onboarding | ✅ | `SellerOnboarding.jsx` | Stripe Connect |
| Payouts | ✅ | `seller_payouts` table, `PayoutManager.jsx` | pending/requested/paid |
| Vault (order history) | ✅ | `VaultMode.tsx`, `L2VaultSheet.jsx` | Orders + passes + QR |
| Order QR codes | ✅ | `QRCodeGenerator.jsx` | Delivery/pickup |
| Unified cart | ✅ | `UnifiedCartDrawer.jsx` | Multi-source cart |
| Stripe payments | ✅ | `api/stripe/*.js` | Checkout + webhooks |
| Make offer / negotiate | ⚠️ | `MakeOfferModal.jsx` | Stub |
| AI product recommendations | ⚠️ | `AIRecommendations.jsx` | Partial |
| Creator subscriptions UI | 🗄️ | `creator_subscriptions` table | **DB live, Stripe wired, NO UI** |
| Amplification pricing UI | 🗄️ | `get_amplification_price()` RPC | **RPC live, NO UI** |
| City heat / business tools | 🗄️ | `calculate_business_heat()` RPC | **RPC live, NO UI** |

---

## RADIO (MUSIC MODE)

| Feature | Status | Location | Notes |
|---------|--------|---------|-------|
| Live stream playback | ✅ | `ConvictPlayer.jsx`, `RadioContext.tsx` | RadioKing stream |
| Persistent mini-player | ✅ | `RadioMiniPlayer.tsx` | Fixed bar above nav |
| Show schedule | ✅ | `RadioSchedule.jsx`, `radioSchedule.json` | 3 shows |
| Show pages | ✅ | `WakeTheMess.jsx`, `DialADaddy.jsx`, `HandNHand.jsx` | |
| Waveform animation | ✅ | `radio-waveform.css` | 4-bar CSS animation |
| Now/Next card | ❌ | N/A | **In hotmess-overview, not in main** |
| Stream quality selector | ❌ | N/A | **In hotmess-overview, not in main** |
| Sound consent modal | ❌ | N/A | **Required for browser autoplay policy** |
| Show reminder nudge | ❌ | N/A | **In hotmess-overview, not in main** |
| SoundCloud OAuth | ⚠️ | `api/soundcloud/*.js` | Auth flow partial, upload stub |
| Music upload (RAW CONVICT) | ⚠️ | `api/soundcloud/upload.js` | Gated by `VITE_MUSIC_UPLOAD_EMAILS` |

---

## GAMIFICATION

| Feature | Status | Location | Notes |
|---------|--------|---------|-------|
| XP system | 🗄️ | `profiles.xp`, `orders.total_xp` | DB only, UI removed by design |
| Achievements | 🗄️ | `achievements` table, `AchievementProgress.jsx` | **DB live, component exists but not surfaced** |
| Daily check-in | ✅ | `DailyCheckin.jsx` | Login bonus |
| Streaks | ✅ | `StreakCounter.jsx` | Consecutive engagement |
| Leaderboard | ⚠️ | `Leaderboard.jsx` | UI only, no data binding |
| Challenges | ⚠️ | `Challenges.jsx` | Stub |
| Level up modal | ✅ | `LevelUpModal.jsx` | Celebration animation |
| Venue kings leaderboard | 🗄️ | `venue_kings` table | **DB live, no UI** |
| Sweat coins | 🗄️ | `sweat_coins` table | **DB live, purpose unclear** |

---

## COMMUNITY & SOCIAL FEED

| Feature | Status | Location | Notes |
|---------|--------|---------|-------|
| Community posts feed | 🗄️ | `community_posts` table | **DB live, no UI in HomeMode** |
| Community post creation | 🗄️ | Same table | **No create UI** |
| Creator subscriptions | 🗄️ | `creator_subscriptions` table | **DB live, no UI** |
| Collaboration requests | 🗄️ | `collaboration_requests` table | **DB live, no UI** |
| User highlights | 🗄️ | `user_highlights` table | **DB live, no UI** |
| Squads | 🗄️ | `squads`, `squad_members` tables | **DB live, no UI** |

---

## ADMIN & MODERATION

| Feature | Status | Location | Notes |
|---------|--------|---------|-------|
| Admin dashboard | ✅ | `AdminDashboard.jsx`, `L2AdminSheet.tsx` | Overview |
| User management | ✅ | `UserManagement.jsx` | Lookup + actions |
| Content moderation | ✅ | `ContentModeration.jsx`, `ModerationQueue.jsx` | Flag review |
| Event curation | ✅ | `EventCurationQueue.jsx` | Approve/reject scraped |
| Event scraper control | ✅ | `EventScraperControl.jsx` | Manage jobs |
| Analytics dashboard | ✅ | `AnalyticsDashboard.jsx` | Usage metrics |
| Bulk user invite | ✅ | `BulkUserInvite.jsx` | Batch creation |
| Safety switch (kill switch) | ✅ | `api/admin/safety-switch.js` | Disable cities/categories |
| Admin verification middleware | ✅ | `api/admin/_verify.js` | Bearer token + is_admin check |
| City amplification admin | 🗄️ | `get_amplification_price()` | **RPC live, no admin UI** |
| Cadence escalation control | ✅ | `api/admin/ops/cadence-*.js` | Live |

---

## PWA & PLATFORM

| Feature | Status | Location | Notes |
|---------|--------|---------|-------|
| Service worker | ✅ | `public/sw.js` | Offline caching |
| Install prompt (A2HS) | ✅ | `InstallPrompt.jsx` | Add to Home Screen |
| Web push subscriptions | ✅ | `push_subscriptions` table | VAPID keys configured |
| iPhone splash screens | ✅ | `public/` | Multiple resolutions |
| GPS presence | ✅ | `api/presence/update.js` | 200m threshold, 60s interval |
| GDPR data export | ✅ | `api/gdpr/request.js` | User data download |
| Offline sync queue | ⚠️ | `useOfflineSync.js` | Partial |
| Offline message queue | ⚠️ | `offlineQueue.jsx` | Message queueing |

---

## FEATURE COUNTS

| Status | Count |
|--------|-------|
| ✅ Complete | 84 |
| ⚠️ Partial | 19 |
| ❌ Not built (gap) | 14 |
| 🗄️ DB only, no UI | 14 |
| **Total tracked** | **131** |
