# Incomplete Features & Known Limitations

## 📋 Overview

This document tracks incomplete features, placeholder implementations, and mock data that need to be completed before full production deployment.

## ✅ Recently Completed Features

### Profile Type System (Completed 2026-01-26)
All specialized profile views have been implemented:
- **Standard Profile** - Default user profile view
- **Seller Profile** - Marketplace seller with product listings
- **Creator Profile** - Music artists with releases, SoundCloud integration, and shows
- **Organizer Profile** - Event organizers with stats, venue partnerships, and event history
- **Premium Profile** - Subscription-based content with unlock mechanism

### Premium Content System (Completed 2026-01-26)
Full premium content monetization is now implemented:
- Premium photo/video uploads with blur preview
- Individual content unlocking with XP payment
- Monthly subscription system for creators
- XP transactions audit logging
- Platform fee support (configurable)

### XP Purchasing (Completed 2026-01-26)
- XP purchase packages via Stripe checkout
- Stripe webhook for automatic XP crediting
- Feature flag enabled by default

### Discovery Filters (Completed 2026-01-26)
Advanced filtering is now fully implemented:
- Age range slider (18-99+)
- Distance radius (1km to unlimited)
- Profile type filters
- Online/offline status
- Verification status
- "Looking for" tags
- Sort by distance/activity/newest

### Multi-Tier Premium Subscriptions (Completed 2026-01-26)
Full subscription tier system implemented:
- Three tiers: Basic, Premium, VIP with configurable pricing
- Tier-specific perks configuration per creator
- Tier selection UI with comparison view
- Upgrade/downgrade subscription flow
- Tier badges and indicators
- Database: `subscription_tier_prices` and `subscription_tier_perks` fields on User table

### Creator Collaboration Tools (Completed 2026-01-26)
Complete collaboration request system:
- Collaboration request types: general, event, music, feature, collab_track
- API endpoints: `api/collaborations/` for create, list, accept/decline
- Collaboration inbox UI component
- Request status tracking (pending, accepted, declined, cancelled)
- Collaboration history tracking
- Database: `collaboration_requests` and `collaborations` tables

### Organizer Analytics Dashboard (Completed 2026-01-26)
Comprehensive analytics dashboard for event organizers:
- Key metrics: events, views, RSVPs, check-ins, unique attendees
- Timeline charts for RSVPs and check-ins over time
- Top events, venues, and category breakdown
- Activity insights with peak hours
- Date range filtering (7d, 30d, 90d, all time)
- CSV export functionality
- Route: `/organizer/analytics` and `/dashboard/analytics`
- Database: `organizer_analytics_snapshots` table for daily aggregates

### Advanced Distance-Based Recommendations (Completed 2026-01-26)
Enhanced recommendation scoring with distance weighting:
- Distance-weighted scoring (0-30 points based on proximity)
- Combined scoring: distance + interest + activity + completeness + compatibility
- Travel time integration ready
- API: `api/recommendations/` for ML-powered recommendations
- Frontend: Updated DiscoveryCard with match percentage display
- Hooks: `useRecommendations` and `useRecordInteraction`

### AI-Powered Profile Matching (Completed 2026-01-26)
Machine learning-based preference learning:
- Interaction tracking: view, like, message, meet, block, skip, save
- Preference learning from interaction history with time decay
- ML scoring based on learned profile types, interests, archetypes
- Auto-refresh of learned preferences
- AI Matches component for personalized recommendations
- Database: `user_interactions`, `match_scores`, `user_preferences_learned` tables

---

## 🚧 Incomplete Features

### 1. SoundCloud OAuth Integration
**Status**: 🟡 Implemented in `api/soundcloud/*` (legacy placeholders still exist under `functions/`)
**Priority**: High
**Effort**: 24 hours

#### Location:
- `api/soundcloud/authorize.js`, `api/soundcloud/callback.js`, `api/soundcloud/status.js`, `api/soundcloud/upload.js`, `api/soundcloud/disconnect.js`
- UI: `src/components/admin/RecordManager.tsx`
- Legacy/deprecated stubs: `functions/pushToSoundCloud.ts` (do not extend)

#### Current State:
Server-side SoundCloud OAuth + upload endpoints exist under `api/soundcloud/*`.
Some older code under `functions/` still contains placeholder logic and should be treated as deprecated.

#### What's Still Missing / Needs Hardening:
1. **Production credential setup**
   - Confirm OAuth app + redirect URIs for the production domain
   - Ensure token storage tables/policies exist in Supabase
2. **Operational UI polish**
   - Clear "connected / expires / refresh" status in UI
   - Better error surfacing + retry messaging
3. **Observability**
   - Optional: persist upload attempts + outcomes for admin audit

#### Requirements:
- SoundCloud Pro account (API access)
- OAuth application registration
- Client ID and Client Secret
- Redirect URI configuration

#### Implementation Checklist:
- [ ] Register SoundCloud OAuth application
- [ ] Implement OAuth 2.0 flow (authorization code grant)
- [ ] Create secure token storage mechanism
- [ ] Implement SoundCloud API client
- [ ] Create upload endpoint in backend
- [ ] Add progress tracking for uploads
- [ ] Implement error handling and retry logic
- [ ] Update RecordManager UI to show real status
- [ ] Add upload validation (file type, size, format)
- [ ] Test with real SoundCloud API
- [ ] Document API usage and limits

---

### 2. QR Scanner / Ticket Validation
**Status**: ✅ Implemented (Beacon scan/check-in + signed ticket QR + admin redemption)
**Priority**: High
**Effort**: 12 hours

#### Location:
- Beacon scanning UI: `src/pages/Scan.jsx`
- Beacon check-in API: `api/scan/check-in.js`
- Ticket QR issuance: `api/tickets/qr.js`
- Ticket redemption (admin-only): `api/scan/redeem.js`
- Ticket verification helpers: `api/tickets/_utils.js`

#### Current State:
Beacon QR scanning is implemented (camera + manual entry) and calls a server-side check-in endpoint.
Event ticket flows support:
- signed ticket generation for a user RSVP (`GET /api/tickets/qr?rsvp_id=...`)
- admin-only redemption / check-in with idempotency (`POST /api/scan/redeem`)

#### What's Missing:
1. **UI/UX Polish**
   - Scanner camera view improvements
   - Scan history view
   - Offline support (queue scans)

---

### 3. Mock Data in Production Code
**Status**: ✅ Mostly Resolved
**Priority**: Medium
**Effort**: Completed

#### Resolved:
- ✅ Distance calculations now use Haversine formula in `/api/profiles.js`
- ✅ Discovery filters properly apply to results
- ✅ Real-time distance sorting implemented

#### Remaining (Low Priority):
- City statistics could use real weather/transit APIs (optional enhancement)

---

### 4. Premium Content Placeholders
**Status**: ✅ COMPLETED
**Priority**: Completed
**Effort**: Completed

All premium content features have been implemented:
- ✅ Premium content upload flow
- ✅ Content flagging mechanism (is_premium flag)
- ✅ Blur/lock overlay implementation
- ✅ Payment verification via XP
- ✅ Unlock mechanism with XP transactions
- ✅ Premium badge/indicator
- ✅ Subscription tiers (basic, premium, vip)
- ✅ Database schema (premium_unlocks, subscriptions, xp_transactions)
- ✅ API endpoints (/api/premium/unlock, /api/premium/subscribe)

---

### 5. Event Scraper Backend Integration
**Status**: ⚠️ Not Fully Integrated
**Priority**: Medium
**Effort**: 12 hours

#### Location:
- `src/components/admin/EventScraperControl.jsx`
- `functions/scrapeEvents.ts`
- `functions/scheduleEventScraper.ts`

#### Current State:
Event scraper exists but requires backend scheduling and monitoring.

#### What's Missing:
1. **Scheduled Execution**
   - Cron job or scheduled function
   - Configurable scraping frequency
   - Time zone handling

2. **Monitoring & Alerts**
   - Scraping success/failure tracking
   - Error notifications
   - Data quality checks

3. **Admin Controls**
   - Start/stop scraping
   - Configure sources
   - View scraping logs
   - Manual trigger

---

## 🧪 Features Marked "Coming Soon" in UI

### ~~1. Discovery Filters~~ ✅ COMPLETED
Advanced filters are now fully implemented including:
- Age range slider
- Distance radius
- Profile type filters
- Online/offline status
- Verification status
- "Looking for" tags
- Sort options

### 2. Advanced Search
**Status**: Basic search only
**Needed**:
- Multi-field search
- Filters combination
- Search history
- Saved searches

---

## ⚠️ Known Limitations

### API Rate Limits
**Issue**: Basic rate limiting implemented
**Impact**: May need enhancement for production scale
**Solution**: Monitor and adjust limits as needed

### Large File Uploads
**Issue**: No chunked upload support
**Impact**: Large files may timeout or fail
**Solution**: Implement chunked/resumable uploads with progress tracking

### Offline Support
**Issue**: No offline functionality
**Impact**: App unusable without internet
**Solution**: Implement service worker, cache API data, queue mutations

### Real-time Features
**Issue**: Polling used instead of WebSockets for some features
**Impact**: Increased server load and latency
**Solution**: Implement WebSocket connections for real-time updates

---

## 📋 Implementation Priority

### Critical (Complete Before Launch):
1. ✅ Security vulnerabilities (DONE)
2. ✅ QR Scanner/Ticket Validation (DONE)
3. ✅ Mock data replacement (DONE)
4. ✅ Premium content features (DONE)
5. ✅ Discovery filters (DONE)
6. ✅ XP purchasing (DONE)

### High (Complete Within 1 Month):
1. SoundCloud OAuth integration (if music features are important)
2. Event scraper backend integration
3. Rate limiting enhancements

### Medium (Complete Within 2-3 Months):
1. Offline support
2. Real-time improvements (WebSockets)
3. Advanced search

### Low (Nice to Have):
1. Enhanced scraping capabilities
2. Advanced analytics
3. Weather/transit API integrations

---

## 🔄 Feature Completion Tracking

| Feature | Status | Priority | Est. Effort | Assigned To | Target Date |
|---------|--------|----------|-------------|-------------|-------------|
| Security Vulnerabilities | ✅ Done | Critical | 8h | Completed | 2026-01-03 |
| Profile Type Views | ✅ Done | Critical | 16h | Completed | 2026-01-26 |
| Premium Content System | ✅ Done | High | 16h | Completed | 2026-01-26 |
| XP Purchasing | ✅ Done | High | 8h | Completed | 2026-01-26 |
| Discovery Filters | ✅ Done | Medium | 8h | Completed | 2026-01-26 |
| Distance Calculation | ✅ Done | Medium | 4h | Completed | 2026-01-26 |
| SoundCloud OAuth | ⚠️ Partial | High | 24h | - | TBD |
| QR Scanner | ✅ Done | High | 12h | Completed | 2026-01-15 |
| Event Scraper Backend | ⚠️ Partial | Medium | 12h | - | TBD |
| Offline Support | ❌ Not Started | Medium | 20h | - | TBD |

---

## 📞 Questions & Support

For questions about incomplete features or to volunteer for implementation:
- Create an issue: [GitHub Issues](https://github.com/SICQR/hotmess-globe/issues)
- Join discussions: [GitHub Discussions](https://github.com/SICQR/hotmess-globe/discussions)

---

**Last Updated**: 2026-01-26
**Maintained By**: Development Team
