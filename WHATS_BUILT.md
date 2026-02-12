# What's Built

**Last Updated**: January 30, 2026  
**Status**: Inventory of existing code

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Pages | 89 | Most exist, varying completion |
| Components | 180+ | Core library built |
| API Endpoints | 70+ | Most functional |
| Hooks | 20 | Core state management |
| Database Tables | 40+ | Schema complete |

---

## PAGES (89 total)

### Core Navigation ✅
| Page | Route | Status |
|------|-------|--------|
| Home | `/` | ✅ Built — Globe hero, mode selection |
| Pulse | `/pulse` | ✅ Built — Map-based discovery |
| More | `/more` | ✅ Built — Navigation hub |
| Welcome | `/welcome` | ✅ Built — Premium onboarding |

### Radio & Music ✅
| Page | Route | Status |
|------|-------|--------|
| Music | `/music` | ✅ Built — Music hub |
| Radio | `/music/live` | ✅ Built — Live player |
| RadioSchedule | `/music/shows` | ✅ Built — Show schedule |
| MusicRelease | `/music/releases/:slug` | ✅ Built — Release pages |
| WakeTheMess | `/music/shows/wake-the-mess` | ✅ Built — Show page |
| DialADaddy | `/music/shows/dial-a-daddy` | ✅ Built — Show page |
| HandNHand | `/music/shows/hand-n-hand` | ✅ Built — Show page |
| RadioFeatures | `/RadioFeatures` | 🔴 Stub |

### Events & Beacons ✅
| Page | Route | Status |
|------|-------|--------|
| Events | `/events` | ✅ Built — Event grid |
| BeaconDetail | `/events/:id` | ✅ Built — Event detail |
| Beacons | `/Beacons` | ✅ Built — All beacons |
| CreateBeacon | `/CreateBeacon` | ✅ Built — Create event |
| EditBeacon | `/EditBeacon` | ✅ Built — Edit event |
| MyEvents | `/MyEvents` | ✅ Built — User's events |
| Calendar | `/calendar` | 🟡 Partial |
| Scan | `/scan` | 🟡 Partial — QR scanner |

### GHOSTED (Social & Discovery) 🟡
| Page | Route | Status |
|------|-------|--------|
| Social (→ GHOSTED) | `/social` | ✅ Built — Profile grid |
| Messages | `/social/inbox` | ✅ Built — Chat threads |
| ProfilesGrid | `/profiles` | ✅ Built — Discovery grid |
| Connect | `/connect` | 🟡 Partial — Legacy view |
| Chat | `/Chat` | ✅ Built — Direct chat |

### Profile & Account ✅
| Page | Route | Status |
|------|-------|--------|
| Profile | `/Profile` | ✅ Built — Own profile |
| EditProfile | `/EditProfile` | ✅ Built — Edit profile |
| ProfileSetup | `/ProfileSetup` | 🟡 Partial |
| Settings | `/settings` | ✅ Built — Privacy, notifications |
| AccountDeletion | `/account/delete` | ✅ Built — GDPR |
| DataExport | `/account/export` | ✅ Built — GDPR |
| AccountConsents | `/account/consents` | ✅ Built |
| MembershipUpgrade | `/membership` | ✅ Built — Tier comparison |

### Auth ✅
| Page | Route | Status |
|------|-------|--------|
| Auth | `/auth` | ✅ Built — Sign in/up |
| Login | `/Login` | ✅ Built — Legacy redirect |
| AgeGate | `/age` | ✅ Built — 18+ verification |
| OnboardingGate | `/onboarding` | ✅ Built — Onboarding router |
| Onboarding | `/Onboarding` | ✅ Built |

### Commerce ✅
| Page | Route | Status |
|------|-------|--------|
| Shop | `/market` | ✅ Built — Shopify storefront |
| ShopCollection | `/market/:collection` | ✅ Built |
| ShopProduct | `/market/p/:handle` | ✅ Built |
| Marketplace | `/market/creators` | ✅ Built — P2P marketplace |
| ProductDetail | `/market/creators/p/:id` | ✅ Built |
| CreatorsCart | `/market/creators/cart` | ✅ Built |
| CreatorsCheckout | `/market/creators/checkout` | ✅ Built |
| ShopCart | `/cart` | ✅ Built |
| CheckoutStart | `/checkout/start` | ✅ Built |
| Checkout | `/checkout` | 🟡 Partial |
| OrderHistory | `/orders` | ✅ Built |
| SellerDashboard | `/SellerDashboard` | 🟡 Partial |
| Hnhmess | `/hnhmess` | ✅ Built — HNH MESS product |

### Tickets 🟡
| Page | Route | Status |
|------|-------|--------|
| Tickets | `/tickets` | 🟡 Partial |
| TicketDetail | `/tickets/:id` | 🟡 Partial |
| TicketChat | `/tickets/chat/:threadId` | 🟡 Partial |
| TicketMarketplace | `/TicketMarketplace` | 🔴 Stub |

### Safety & Care ✅
| Page | Route | Status |
|------|-------|--------|
| Safety | `/safety` | ✅ Built — Safety hub |
| Care | `/Care` | ✅ Built — Aftercare, resources |

### Community & Gamification 🟡
| Page | Route | Status |
|------|-------|--------|
| Community | `/community` | ✅ Built — Posts, feed |
| Leaderboard | `/leaderboard` | 🟡 Partial |
| Challenges | `/Challenges` | 🟡 Partial |
| Stats | `/Stats` | 🟡 Partial |
| InviteFriends | `/InviteFriends` | 🟡 Partial |
| SquadChat | `/SquadChat` | 🔴 Stub |
| Feed | `/Feed` | 🟡 Partial |
| Bookmarks | `/Bookmarks` | ✅ Built |

### Business Tools 🟡
| Page | Route | Status |
|------|-------|--------|
| BusinessDashboard | `/biz` | 🟡 Partial |
| BusinessAnalytics | `/biz/analytics` | 🟡 Partial |
| BusinessOnboarding | `/biz/onboarding` | 🟡 Partial |
| BusinessGlobe | `/business/globe` | 🟡 Partial |
| BusinessAmplify | `/business/amplify` | 🔴 Stub |
| BusinessInsights | `/business/insights` | 🔴 Stub |
| PromoterDashboard | `/biz/promoter` | 🟡 Partial |
| VenueManagement | `/biz/venue` | 🟡 Partial |

### Creator Tools 🟡
| Page | Route | Status |
|------|-------|--------|
| CreatorDashboard | `/creator` | 🟡 Partial |
| OrganizerDashboard | `/OrganizerDashboard` | 🟡 Partial |
| RecordManager | `/RecordManager` | 🔴 Stub |

### Admin 🟡
| Page | Route | Status |
|------|-------|--------|
| AdminDashboard | `/AdminDashboard` | 🟡 Partial |
| CadencePanel | `/admin/cadence` | 🟡 Partial |
| CityReadiness | `/admin/cities` | 🟡 Partial |
| PromoteToAdmin | `/PromoteToAdmin` | ✅ Built |

### Legal ✅
| Page | Route | Status |
|------|-------|--------|
| Privacy | `/legal/privacy` | ✅ Built |
| Terms | `/legal/terms` | ✅ Built |
| PrivacyHub | `/legal/privacy-hub` | ✅ Built |
| CommunityGuidelines | `/guidelines` | ✅ Built |
| Contact | `/contact` | ✅ Built |
| HelpCenter | `/help` | 🟡 Partial |
| Pricing | `/Pricing` | 🟡 Partial |

### Globe & Visualization ✅
| Page | Route | Status |
|------|-------|--------|
| Globe | `/Globe` | 🟡 Partial — Standalone globe |
| Directions | `/Directions` | ✅ Built |

### Demo & Showcase
| Page | Route | Status |
|------|-------|--------|
| SmartUIDemo | `/SmartUIDemo` | ✅ Built |
| LuxShowcase | `/LuxShowcase` | 🔴 Stub |
| Features | `/Features` | 🔴 Stub |

---

## COMPONENTS (180+)

### Globe (16 components) ✅
```
GlobeHero.jsx          — Main 3D globe visualization
EnhancedGlobe3D.jsx    — Three.js globe renderer
CityPulseBar.jsx       — City energy indicator
CityDataOverlay.jsx    — City stats overlay
LiveFeed.jsx           — Real-time activity feed
ActivityStream.jsx     — Activity log
BeaconPreviewPanel.jsx — Beacon hover preview
GlobeControls.jsx      — Globe interaction controls
GlobeSearch.jsx        — Search on globe
LocalBeaconsView.jsx   — Nearby beacons
NearbyGrid.jsx         — Nearby users grid
WorldPulse.jsx         — Global activity pulse
```

### Radio (4 components) ✅
```
ConvictPlayer.jsx      — Main radio player
RadioShowCard.jsx      — Show card display
radioUtils.jsx         — Radio utilities
radioSchedule.json.jsx — Schedule data
```

### Events (12 components) ✅
```
EventCard.jsx          — Event card display
EventsMapView.jsx      — Map with events
EventRSVP.jsx          — RSVP component
AIEventRecommendations.jsx — AI suggestions
EventInsights.jsx      — Event analytics
EventReminders.jsx     — Reminder notifications
EventTicket.jsx        — Ticket display
EventWaitlist.jsx      — Waitlist management
TicketScanner.jsx      — QR scanner
PersonalizedRecommendations.jsx
RecommendationEngine.jsx
RelatedEvents.jsx
```

### Beacons (4 components) ✅
```
BeaconComposer.jsx     — Create/edit beacon
BeaconActions.jsx      — Beacon interactions
CommentsSection.jsx    — Comments on beacons
```

### Safety (8 components) ✅
```
PanicButton.jsx        — Emergency panic button
SafetyCheckinModal.jsx — Check-in modal
FakeCallGenerator.jsx  — Fake call feature
LiveLocationShare.jsx  — Share location
AftercareNudge.jsx     — Aftercare prompts
CheckInTimerCustomizer.jsx
EmergencyMessageEditor.jsx
```

### Discovery (17 components) ✅
```
DiscoveryCard.jsx      — User card
DiscoveryFilters.jsx   — Filter controls
FiltersDrawer.jsx      — Filter drawer
RightNowGrid.jsx       — "Right Now" users
RightNowIndicator.jsx  — Status indicator
RightNowModal.jsx      — Status modal
AIMatchmaker.jsx       — AI matching
AIMatchExplanation.jsx — Match explanation
CompatibilityBadge.jsx — Compatibility display
SceneScout.jsx         — Scene recommendations
TagSelector.jsx        — Interest tags
PeopleYouMayKnow.jsx   — Suggestions
queryBuilder.jsx       — Filter logic
```

### GHOSTED / Profiles Grid (18 components) ✅
```
ProfilesGrid.tsx       — Main grid (→ GHOSTED grid)
ProfileCard.tsx        — Profile card
SmartProfileCard.tsx   — Enhanced card
BentoGrid.tsx          — Bento layout
MatchBar.tsx           — Match score display
MatchFilter.tsx        — Match filtering
SortSelector.tsx       — Sort options
TelegramPanel.tsx      — Telegram link
useMatchProfiles.ts    — Match scoring hook
useInfiniteProfiles.ts — Infinite scroll
matchInsights.ts       — Match analysis
```

### Profile (15 components) ✅
```
ProfileHeader.jsx      — Profile header
ProfileStats.jsx       — Stats display
MediaGallery.jsx       — Photo gallery
PersonaSwitcher.jsx    — Switch personas
PersonaCard.jsx        — Persona display
ProfileOptimizer.jsx   — AI optimization
ProfileWingman.jsx     — AI suggestions
ProfileCompleteness.jsx — Progress indicator
QuickActions.jsx       — Quick action buttons
MutualConnections.jsx  — Shared connections
BadgeDisplay.jsx       — Achievement badges
PremiumProfileView.jsx
StandardProfileView.jsx
CreatorProfileView.jsx
SellerProfileView.jsx
```

### Messaging (9 components) ✅
```
ChatThread.jsx         — Chat conversation
ThreadList.jsx         — Message threads
VoiceNote.jsx          — Voice messages
WingmanPanel.jsx       — AI conversation help
TypingIndicator.jsx    — Typing status
MediaViewer.jsx        — Media display
NewMessageModal.jsx    — New message
NotificationBadge.jsx  — Unread count
GroupChatManager.jsx   — Group chats
```

### Commerce (12 components) ✅
```
ProductCard.jsx        — Product display
ShopCartDrawer.jsx     — Cart drawer
UnifiedCartDrawer.jsx  — Combined cart
FeeDisplay.jsx         — Fee breakdown
CommerceGate.jsx       — Commerce auth
MakeOfferModal.jsx     — P2P offers
OffersList.jsx         — Offer management
MarketplaceReviewModal.jsx
AIRecommendations.jsx  — Product suggestions
DropBeacons.jsx        — Product drops
ShopCollections.jsx    — Collections display
AgeVerificationGate.jsx
```

### UI Components (30+) ✅
```
button.jsx             — 20+ button variants
card.jsx               — Card component
dialog.jsx             — Modal dialogs
sheet.jsx              — Slide-out panels
tabs.jsx               — Tab navigation
accordion.jsx          — Expandable sections
alert.jsx              — Alerts
alert-dialog.jsx       — Confirmation dialogs
drawer.jsx             — Drawer component
hover-card.jsx         — Hover cards
input.jsx              — Form inputs
label.jsx              — Form labels
pagination.jsx         — Pagination
scroll-area.jsx        — Scroll container
tooltip.jsx            — Tooltips
VirtualList.jsx        — Virtualized scroll
skeleton.jsx           — Loading states
sonner.jsx             — Toast notifications
OSCard.jsx             — OS-style card
PageHeader.jsx         — Page headers
StatsCard.jsx          — Statistics display
ActionBar.jsx          — Action buttons
ConfirmDialog.jsx      — Confirmations
CircularProgress.jsx   — Progress indicator
AnimatedCard.jsx       — Animated cards
chart.jsx              — Charts
```

### Admin (12 components) 🟡
```
AnalyticsDashboard.jsx
UserManagement.jsx
ContentModeration.jsx
ModerationQueue.jsx
EventManagement.jsx
EventScraperControl.jsx
ShopifyManager.jsx
RecordManager.tsx
BulkUserInvite.jsx
CurationQueue.jsx
SupportTicketManagement.jsx
UserVerification.jsx
```

### Navigation ✅
```
BottomNav.jsx          — Bottom tab bar
ScrollProgress.tsx     — Scroll indicator
```

### Lux/Premium (8 components) ✅
```
LuxBanner.jsx          — Premium banner
LuxCarousel.jsx        — Premium carousel
LuxVideo.jsx           — Video player
CountdownTimer.jsx     — Countdown
LiveCounter.jsx        — Live count
PageTransition.jsx     — Page transitions
AdSlot.jsx             — Ad placement
```

### Other
```
ErrorBoundary.jsx      — Error handling
LazyPageLoader.jsx     — Lazy loading
MediaUploader.jsx      — Upload component
SoundCloudEmbed.jsx    — Audio embed
VideoCallRoom.jsx      — Video calls
TutorialTooltip.jsx    — Onboarding tips
MembershipBadge.jsx    — Tier badges
```

---

## API ENDPOINTS (70+)

### Auth ✅
```
api/auth/telegram/verify.js    — Telegram OAuth
```

### Profiles ✅
```
api/profile.js                 — Get/update profile
api/profiles.js                — Discovery grid
api/nearby.js                  — Nearby users
```

### Match Probability ✅
```
api/match-probability/index.js — Get match scores
api/match-probability/embeddings.js — Generate embeddings
api/match-probability/_scoring.js — Scoring logic
```

### Presence ✅
```
api/presence/update.js         — Update presence
api/globe/pulse.js             — Globe pulse data
```

### Events ✅
```
api/events/cron.js             — Event scraper cron
api/events/scrape.js           — Scrape events
api/events/diag.js             — Diagnostics
```

### Safety ✅
```
api/safety/check-ins.js        — Safety check-ins
api/safety/respond.js          — Check-in responses
api/scan/check-in.js           — QR check-in
api/scan/redeem.js             — Ticket redemption
```

### Commerce ✅
```
api/shopify/featured.js        — Featured products
api/shopify/collection.js      — Collection
api/shopify/collections.js     — All collections
api/shopify/product.js         — Product detail
api/shopify/cart.js            — Cart operations
api/shopify/sync.js            — Sync products
api/shopify/import.js          — Import products
api/shopify/webhooks.js        — Shopify webhooks
```

### Payments 🟡
```
api/payments/create.js         — Create payment
api/stripe/create-checkout-session.js — Stripe checkout
api/stripe/webhook.js          — Stripe webhooks
api/stripe/cancel-subscription.js — Cancel sub
api/premium/subscribe.js       — Subscribe
api/premium/unlock.js          — Unlock content
api/subscriptions/me.js        — My subscription
```

### AI 🟡
```
api/ai/chat.js                 — AI chat
api/ai/wingman.js              — Conversation starters
api/ai/profile-analysis.js     — Profile analysis
api/ai/scene-scout.js          — Scene recommendations
api/ai/_rag.js                 — RAG retrieval
api/ai/_system-prompt.js       — System prompts
api/ai/_tools.js               — Function calling
```

### Notifications ✅
```
api/notifications/dispatch.js  — Send notifications
api/notifications/preferences.js — User prefs
api/notifications/process.js   — Process queue
api/notifications/settings.js  — Settings
api/email/send.js              — Send email
api/email/notify.js            — Email notifications
```

### SoundCloud 🟡
```
api/soundcloud/authorize.js    — OAuth start
api/soundcloud/callback.js     — OAuth callback
api/soundcloud/status.js       — Connection status
api/soundcloud/upload.js       — Upload track
api/soundcloud/disconnect.js   — Disconnect
api/soundcloud/public-profile.js
api/soundcloud/public-tracks.js
```

### Routing ✅
```
api/routing/directions.js      — Get directions
api/routing/etas.js            — Get ETAs
api/travel-time.js             — Travel time
```

### Admin 🟡
```
api/admin/safety-switch.js     — Safety controls
api/admin/cleanup/rate-limits.js — Cleanup
api/admin/notifications/dispatch.js
api/admin/ops/cadence-apply.js
api/admin/ops/cadence-suggest.js
```

### Tickets 🟡
```
api/tickets/qr.js              — Generate QR
api/tickets/_utils.js          — Ticket utilities
```

### Telegram 🟡
```
api/telegram/bot.js            — Bot webhook
api/telegram/send.js           — Send message
```

### Video 🟡
```
api/video/create-room.js       — Daily.co room
```

### Other ✅
```
api/health.js                  — Health check
api/daily-checkin.js           — Daily check-in
api/gdpr/request.js            — GDPR request
api/time/now.js                — Server time
api/viewer-location.js         — Viewer location
api/_rateLimit.js              — Rate limiting
```

---

## HOOKS (20)

```javascript
useUserContext.js       — User state, tier, limits ✅
useRevenue.js           — Upsell triggers ✅
useGamification.js      — XP, streaks, achievements ✅
useSafety.js            — Check-ins, panic, contacts ✅
useProfiles.js          — Persona management ✅
useProducts.js          — Product queries ✅
useTickets.js           — Ticket queries ✅
useBusiness.js          — Business features 🟡
useCreator.js           — Creator features 🟡
useOfflineSync.js       — Offline support 🟡
usePushNotifications.jsx — Push notifications 🟡
useTranslation.js       — i18n 🟡
useUserRoles.js         — Role checking ✅
useLiveViewerLocation.js — Live location ✅
useRealtimeNearbyInvalidation.js — Realtime ✅
use-mobile.jsx          — Mobile detection ✅
use-server-now.jsx      — Server time ✅
useCursorGlow.ts        — Cursor effects ✅
```

---

## DATABASE (Supabase)

### Tables ✅
```
users                  — User accounts
user_profiles          — Extended profile data
user_tags              — Interest tags
user_follows           — Follow relationships
user_blocks            — Block list
right_now_status       — "Right Now" availability

message_threads        — Chat threads
messages               — Chat messages
message_reads          — Read receipts

beacons                — Events/signals
event_rsvps            — RSVPs
beacon_checkins        — Check-ins

products               — P2P marketplace
orders                 — Orders
order_items            — Line items
ticket_listings        — Ticket resale

achievements           — Available achievements
user_achievements      — Earned achievements
challenges             — Challenges
challenge_participants — Entries
squads                 — Groups
squad_members          — Membership

safety_checkins        — Welfare checks
trusted_contacts       — Emergency contacts
reports                — User reports

subscriptions          — Premium subscriptions
creator_subscriptions  — Creator subs
```

---

## STATUS LEGEND

- ✅ **Built** — Functional, may need polish
- 🟡 **Partial** — Core exists, incomplete
- 🔴 **Stub** — Route exists, empty/placeholder

---

## WHAT WORKS END-TO-END

| Flow | Status |
|------|--------|
| Sign up / Sign in | ✅ |
| Create profile with photos | ✅ |
| Browse discovery grid | ✅ |
| View user profiles | ✅ |
| Send messages | ✅ |
| Create/edit beacon | ✅ |
| RSVP to event | ✅ |
| Radio player streams | ✅ |
| Browse Shopify products | ✅ |
| Add to cart | ✅ |
| Panic button | ✅ |
| Block/report user | ✅ |
| PWA install | ✅ |

## WHAT'S BROKEN OR INCOMPLETE

| Flow | Issue |
|------|-------|
| Payment checkout | Not wired to Stripe |
| Subscription upgrade | UI exists, payment not connected |
| Ticket purchase | Payment not wired |
| Creator subscriptions | DB ready, no UI |
| Video calls | Daily.co not fully integrated |
| AI features | Endpoints exist, not wired to UI |
| SoundCloud upload | OAuth incomplete |
| Push notifications | Infrastructure ready, not enforced |
| Offline mode | Hook exists, not implemented |

---

**Bottom line**: The foundation is solid. ~70% of pages and components exist. The gaps are primarily:
1. Payment flows (Stripe integration)
2. AI features (wiring to UI)
3. Creator economy (UI not built)
4. Polish and consistency
