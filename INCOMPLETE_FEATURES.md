# Incomplete Features & Known Limitations

## 📋 Overview

This document tracks incomplete features, placeholder implementations, and mock data that need to be completed before full production deployment.

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

```typescript
// functions/pushToSoundCloud.ts:18-22
// Note: SoundCloud API requires OAuth and a client_id
// This is a placeholder for the integration flow
// For now, return a mock success response
// In production, this would use SoundCloud's upload API
```

#### What's Still Missing / Needs Hardening:
1. **Production credential setup**
   - Confirm OAuth app + redirect URIs for the production domain
   - Ensure token storage tables/policies exist in Supabase
2. **Operational UI polish**
   - Clear “connected / expires / refresh” status in UI
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

#### Testing:
```bash
# After implementation, test:
1. OAuth flow (authorization)
2. Token refresh
3. File upload (various formats)
4. Error scenarios (network, API limits)
5. Large file handling
6. Concurrent uploads
```

#### References:
- [SoundCloud API Documentation](https://developers.soundcloud.com/docs/api)
- [OAuth 2.0 Guide](https://developers.soundcloud.com/docs/api/guide#authentication)

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
1. **QR Code Scanner**
   - ✅ Beacon scan UI supports camera scanning + manual entry
   - ⏳ Additional formats beyond the current implementation (if required)

2. **Ticket Validation**
   - ✅ Backend validation + signature verification
   - ✅ Duplicate redemption prevention (`event_rsvps.checked_in`)
   - ⏳ UI wiring polish (scanner UX, scan history, reporting)

3. **Beacon Check-in**
   - Location-based check-in
   - Beacon QR code scanning
   - Reward/points distribution

4. **UI/UX**
   - Scanner camera view
   - Success/error feedback
   - Offline support
   - Scan history

#### Implemented (Beacon scan/check-in)
- Camera scan + manual entry flow
- Server-side check-in endpoint (`POST /api/scan/check-in`) with idempotency protection
- Success/error feedback

#### Implementation Checklist:
- [x] Add QR scanner library dependency
- [x] Implement camera permissions handling
- [x] Create beacon QR scanner UI
- [x] Implement duplicate scan prevention (idempotency)
- [x] Add check-in recording endpoint
- [ ] Build ticket validation backend endpoint (separate from beacon check-in)
- [ ] Create scan history UI
- [ ] Add offline support (queue scans)
- [ ] Implement ticket error handling (invalid/expired/duplicate)
- [ ] Test on various devices (iOS, Android)
- [ ] Ensure accessibility features (manual entry, fallbacks)
- [ ] Document ticket scanning + validation flow

#### Notes
- Beacon check-in and event ticket validation are related but not identical flows; keep them separate so ticket rules (signature verification, event ownership, redemption limits) don’t complicate beacon XP check-ins.

---

### 3. Mock Data in Production Code
**Status**: 🟡 Partially Replaced (randomized values removed where possible)
**Priority**: Medium
**Effort**: 8 hours

#### Location 1: City Data Overlay
**File**: `src/components/globe/CityDataOverlay.jsx`

```javascript
// Mock real-time data generator
const generateMockData = () => ({
  activeUsers: Math.floor(Math.random() * 1000),
  events: Math.floor(Math.random() * 50),
  vibeScore: Math.floor(Math.random() * 100),
});
```

**Issue**: Historically used simulated weather/transit/temp; now derives heat + counts from beacons/check-ins, but still lacks real weather/transit APIs.

**Solution**:
- Optional: create backend endpoint for city statistics (aggregate in SQL)
- Optional: integrate real weather/transit APIs (server-side) and cache results

```javascript
// Recommended implementation
const { data: cityData } = useQuery({
  queryKey: ['city-stats', cityId],
  queryFn: () => base44.functions.getCityStatistics({ cityId }),
  refetchInterval: 30000, // Refresh every 30 seconds
  staleTime: 10000,
});
```

#### Location 2: Connect Page - Distance Calculation
**File**: `src/pages/Connect.jsx`

**Issue**: Mock distance values instead of real geolocation calculations.

**Solution**:
- Implement proper Haversine distance calculation
- Use user's actual geolocation
- Add distance sorting
- Cache calculated distances

```javascript
// Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
```

#### Location 3: Query Builder Filters
**File**: `src/components/discovery/queryBuilder.jsx`

**Issue**: Mock filtering logic that doesn't actually filter results.

**Solution**:
- Implement actual filter application
- Add backend filtering support
- Optimize filter combinations
- Add filter persistence

---

### 4. Premium Content Placeholders
**Status**: ⚠️ Placeholder "XXX" Text
**Priority**: Low
**Effort**: 16 hours

#### Location:
- `src/components/profile/MediaGallery.jsx`
- `src/components/discovery/DiscoveryCard.jsx`
- `src/pages/EditProfile.jsx`

#### Current State:
"XXX" placeholder for premium/locked content blur effect.

#### What's Needed:
1. **Premium Content Upload**
   - Separate upload flow for premium content
   - Content flagging mechanism
   - Preview image generation

2. **Content Protection**
   - Blur/lock overlay implementation
   - Payment verification
   - Unlock mechanism

3. **Monetization**
   - Pricing structure
   - Payment processing
   - Revenue sharing (if applicable)
   - Subscription tiers

4. **UI/UX**
   - Premium badge/indicator
   - Preview quality control
   - Unlock animation
   - Purchase flow

#### Implementation Checklist:
- [ ] Define premium content types
- [ ] Create upload flow for premium content
- [ ] Implement content protection (watermarks, blur)
- [ ] Build unlock/purchase mechanism
- [ ] Add payment integration
- [ ] Create subscription tiers (if applicable)
- [ ] Implement preview generation
- [ ] Add premium indicators to UI
- [ ] Test unlock flow
- [ ] Add analytics for premium content

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

4. **Data Processing**
   - Duplicate detection
   - Data enrichment
   - Geocoding
   - Image optimization

#### Implementation Checklist:
- [ ] Set up scheduled function (cron job)
- [ ] Implement scraper error handling
- [ ] Add logging and monitoring
- [ ] Create admin control panel
- [ ] Implement duplicate detection
- [ ] Add data validation
- [ ] Set up error notifications
- [ ] Add manual trigger capability
- [ ] Implement rate limiting for scraping
- [ ] Document scraper sources and configuration

---

## 🧪 Features Marked "Coming Soon" in UI

### 1. Discovery Filters
**Location**: `src/components/discovery/DiscoveryFilters.jsx` (lines 44-46)
```javascript
// More filters coming soon
```

**Needed Filters**:
- Age range
- Gender preferences
- Distance radius
- Interests/tags
- Online/offline status
- Verification status

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
**Issue**: No rate limiting implemented
**Impact**: Risk of API abuse and excessive costs
**Solution**: Implement rate limiting (see CODE_QUALITY_RECOMMENDATIONS.md #18)

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

### Browser Compatibility
**Issue**: Not tested on older browsers
**Impact**: Potential issues on older devices
**Solution**: Add polyfills, test on older browsers, add compatibility warnings

---

## 📋 Implementation Priority

### Critical (Complete Before Launch):
1. ✅ Security vulnerabilities (DONE)
2. QR Scanner/Ticket Validation (if ticketing is core feature)
3. Mock data replacement (real API integration)

### High (Complete Within 1 Month):
1. SoundCloud OAuth integration (if music features are important)
2. Event scraper backend integration
3. Rate limiting implementation

### Medium (Complete Within 2-3 Months):
1. Premium content features
2. Advanced discovery filters
3. Offline support
4. Real-time improvements

### Low (Nice to Have):
1. Additional filters and search features
2. Enhanced scraping capabilities
3. Advanced analytics

---

## 🔄 Feature Completion Tracking

| Feature | Status | Priority | Est. Effort | Assigned To | Target Date |
|---------|--------|----------|-------------|-------------|-------------|
| Security Vulnerabilities | ✅ Done | Critical | 8h | Completed | 2026-01-03 |
| SoundCloud OAuth | ⚠️ Placeholder | High | 24h | - | TBD |
| QR Scanner | ⚠️ Not Started | High | 12h | - | TBD |
| Mock Data Replacement | ⚠️ Partial | Medium | 8h | - | TBD |
| Premium Content | ⚠️ Placeholder | Low | 16h | - | TBD |
| Event Scraper Backend | ⚠️ Partial | Medium | 12h | - | TBD |
| Discovery Filters | ⚠️ Basic Only | Medium | 8h | - | TBD |
| Rate Limiting | ❌ Not Started | High | 8h | - | TBD |
| Offline Support | ❌ Not Started | Medium | 20h | - | TBD |

---

## 📞 Questions & Support

For questions about incomplete features or to volunteer for implementation:
- Create an issue: [GitHub Issues](https://github.com/SICQR/hotmess-globe/issues)
- Join discussions: [GitHub Discussions](https://github.com/SICQR/hotmess-globe/discussions)

---

**Last Updated**: 2026-01-03
**Maintained By**: Development Team
