# GitHub Issues to Create for PR #6 Deferred Work

This document outlines the GitHub issues that should be created once PR #6 is merged, based on the deferred and incomplete work documented in PR #6's comprehensive documentation.

---

## Issue Template Instructions

For each issue below:
1. Copy the title
2. Copy the body content
3. Create issue at: https://github.com/SICQR/hotmess-globe/issues/new
4. Apply appropriate labels (noted in each issue)
5. Assign to appropriate team member if known

---

## HIGH PRIORITY ISSUES

### Issue 1: Complete Console Logging Migration to Structured Logger

**Title**: Complete console logging migration to structured logger

**Labels**: `enhancement`, `code-quality`, `high-priority`

**Body**:
```markdown
## Description
Migrate remaining ~95 `console.log`, `console.warn`, and `console.error` statements to use the structured logger (`src/utils/logger.js`) that was created in PR #6.

## Current Status
- ✅ Structured logger created with automatic sensitive data redaction
- ✅ Applied to 4 critical files: AuthContext, ErrorBoundary, Events, RecordManager
- ⚠️ ~95 console statements remain across the codebase

## Benefits
- Environment-aware logging (errors only in production)
- Automatic sensitive data redaction (passwords, tokens, keys)
- Structured context for better debugging
- Consistent logging patterns across codebase

## Implementation Pattern
```javascript
// Before:
console.log('User logged in:', userData);
console.error('API call failed:', error);

// After:
import logger from '@/utils/logger';
logger.info('User logged in', { userId: userData.id });
logger.error('API call failed', { error: error.message, endpoint: '/api/users' });
```

## Finding Remaining Console Statements
```bash
grep -r "console\." src/ --include="*.jsx" --include="*.js" --include="*.tsx" --include="*.ts" -n
```

## Estimated Effort
4-6 hours

## Documentation
- Pattern: CODE_QUALITY_RECOMMENDATIONS.md #1
- Logger implementation: src/utils/logger.js
```

---

### Issue 2: Create useCurrentUser Hook to Eliminate Duplicate Logic

**Title**: Create useCurrentUser custom hook to eliminate duplicate user-fetching logic

**Labels**: `enhancement`, `code-quality`, `refactoring`, `high-priority`

**Body**:
```markdown
## Description
Create a `useCurrentUser` custom hook to eliminate duplicate user-fetching logic that appears across 20+ page components.

## Problem
The same user-fetching pattern is repeated in many components:
```javascript
useEffect(() => {
  const fetchUser = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return;
      const user = await base44.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };
  fetchUser();
}, []);
```

## Solution
Create `src/hooks/useCurrentUser.js` that returns `{ user, loading, error }`.

## Benefits
- DRY principle (Don't Repeat Yourself)
- Consistent error handling
- Easier to test
- Single source of truth for auth state
- Reduced code duplication

## Implementation
Full implementation pattern provided in CODE_QUALITY_RECOMMENDATIONS.md #3

## Affected Components
20+ page components use this pattern (estimate)

## Estimated Effort
4 hours

## Documentation
- Implementation guide: CODE_QUALITY_RECOMMENDATIONS.md #3
- Usage examples included
```

---

### Issue 3: Complete SoundCloud OAuth Integration

**Title**: Complete SoundCloud OAuth integration for audio upload functionality

**Labels**: `enhancement`, `feature`, `integration`, `high-priority`

**Body**:
```markdown
## Description
Complete the SoundCloud OAuth integration and upload functionality. Currently, `functions/pushToSoundCloud.ts` contains placeholder code with mock responses.

## Current State
```typescript
// functions/pushToSoundCloud.ts:18-22
// Note: SoundCloud API requires OAuth and a client_id
// This is a placeholder for the integration flow
// For now, return a mock success response
// In production, this would use SoundCloud's upload API
```

## Requirements
- SoundCloud Pro account (for API access)
- OAuth application registration with SoundCloud
- Client ID and Client Secret
- Redirect URI configuration

## Implementation Checklist
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

## Testing Requirements
1. OAuth flow (authorization)
2. Token refresh
3. File upload (various formats)
4. Error scenarios (network, API limits)
5. Large file handling
6. Concurrent uploads

## Estimated Effort
24 hours

## Documentation
- Complete implementation guide: INCOMPLETE_FEATURES.md #1
- SoundCloud API docs: https://developers.soundcloud.com/docs/api
```

---

### Issue 4: Implement QR Scanner and Ticket Validation

**Title**: Implement QR scanner and ticket validation functionality

**Labels**: `enhancement`, `feature`, `high-priority`

**Body**:
```markdown
## Description
Implement QR code scanning and ticket validation functionality. Currently shows "Coming Soon" placeholders in:
- `src/pages/Scan.jsx` (line 127)
- `src/components/events/TicketScanner.jsx` (line 53)

## Current State
```javascript
<div className="text-center text-white/40">
  Scan QR Code (Coming Soon)
</div>
```

## Requirements
1. **QR Code Scanner**
   - Camera access and permissions
   - QR code detection and parsing
   - Multi-format support (QR, Data Matrix, etc.)

2. **Ticket Validation**
   - Backend validation endpoint
   - Ticket authenticity verification
   - Duplicate scan prevention
   - Check-in recording

3. **Beacon Check-in**
   - Location-based check-in
   - Beacon QR code scanning
   - Reward/points distribution

4. **UI/UX**
   - Scanner camera view
   - Success/error feedback
   - Offline support
   - Scan history

## Recommended Library
```bash
npm install html5-qrcode
# or
npm install @zxing/library
```

## Implementation Checklist
- [ ] Add QR scanner library dependency
- [ ] Implement camera permissions handling
- [ ] Create QR scanner component
- [ ] Build ticket validation backend endpoint
- [ ] Implement duplicate scan prevention
- [ ] Add check-in recording to database
- [ ] Create scan history UI
- [ ] Add offline support (queue scans)
- [ ] Implement error handling (invalid tickets, expired, etc.)
- [ ] Test on various devices (iOS, Android)
- [ ] Add accessibility features (manual entry)
- [ ] Document scanning flow

## Estimated Effort
12 hours

## Documentation
- Complete implementation guide: INCOMPLETE_FEATURES.md #2
- Example code provided in documentation
```

---

## MEDIUM PRIORITY ISSUES

### Issue 5: Replace Mock Data with Real API Calls

**Title**: Replace mock data with real API calls in production code

**Labels**: `enhancement`, `code-quality`, `medium-priority`

**Body**:
```markdown
## Description
Replace mock data generators with real API calls in production code.

## Affected Locations

### 1. City Data Overlay (`src/components/globe/CityDataOverlay.jsx:7`)
**Issue**: Using randomly generated fake data instead of real API calls
```javascript
const generateMockData = () => ({
  activeUsers: Math.floor(Math.random() * 1000),
  events: Math.floor(Math.random() * 50),
  vibeScore: Math.floor(Math.random() * 100),
});
```

**Solution**: Create backend endpoint for city statistics, implement caching

### 2. Connect Page - Distance Calculation (`src/pages/Connect.jsx`)
**Issue**: Mock distance values instead of real geolocation calculations

**Solution**: Implement Haversine distance formula, use actual user geolocation

### 3. Query Builder Filters (`src/components/discovery/queryBuilder.jsx`)
**Issue**: Mock filtering logic that doesn't actually filter results

**Solution**: Implement actual filter application with backend support

## Implementation Details
Full solutions and code examples provided in INCOMPLETE_FEATURES.md #3

## Estimated Effort
8 hours

## Documentation
- Complete solutions: INCOMPLETE_FEATURES.md #3
- Haversine formula example included
```

---

### Issue 6: Implement Content Security Policy (CSP)

**Title**: Implement Content Security Policy headers

**Labels**: `security`, `enhancement`, `medium-priority`

**Body**:
```markdown
## Description
Implement Content Security Policy (CSP) headers to enhance application security and protect against XSS attacks.

## Current Status
⚠️ CSP not yet implemented (documented in SECURITY.md #7)

## Recommended CSP Headers
```javascript
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://your-api.base44.app;
```

## Implementation
Add to `vite.config.js` as documented in SECURITY.md

## Benefits
- Prevents XSS attacks
- Restricts resource loading
- Adds additional security layer
- Industry best practice

## Estimated Effort
6 hours

## Documentation
- Implementation pattern: SECURITY.md #7
- Configuration example provided
```

---

### Issue 7: Implement Rate Limiting on API Endpoints

**Title**: Implement rate limiting on backend API endpoints

**Labels**: `security`, `enhancement`, `medium-priority`

**Body**:
```markdown
## Description
Implement rate limiting on backend functions to prevent API abuse and excessive costs.

## Current Status
❌ No rate limiting implemented

## Impact
- Risk of API abuse
- Potential excessive costs
- DoS vulnerability

## Implementation Pattern
Full pattern documented in CODE_QUALITY_RECOMMENDATIONS.md #18

```javascript
import { RateLimiter } from '@/utils/rateLimiter';

const limiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

export default async function handler(req, res) {
  if (!limiter.check(req.ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }
  // ... rest of handler
}
```

## Estimated Effort
8 hours

## Documentation
- Implementation pattern: CODE_QUALITY_RECOMMENDATIONS.md #18
```

---

## LOW PRIORITY ISSUES

### Issue 8: Implement Code Splitting for Performance Optimization

**Title**: Implement route-based code splitting to reduce initial bundle size

**Labels**: `performance`, `enhancement`, `low-priority`

**Body**:
```markdown
## Description
Implement code splitting to reduce initial bundle size from 3+ MB to ~500 KB.

## Current State
- Single 3+ MB bundle
- All routes loaded upfront
- Poor initial load performance

## Solution
Implement route-based code splitting using React.lazy() and Suspense

## Expected Impact
- Initial bundle: 3+ MB → ~500 KB
- Faster time to interactive
- Better Core Web Vitals scores

## Estimated Effort
8 hours

## Documentation
- Complete implementation guide: CODE_QUALITY_RECOMMENDATIONS.md #8
- Code examples provided
```

---

### Issue 9: Set Up Error Tracking with Sentry

**Title**: Implement Sentry error tracking integration

**Labels**: `monitoring`, `enhancement`, `low-priority`

**Body**:
```markdown
## Description
Complete Sentry integration for error tracking and monitoring. Currently partially commented out in ErrorBoundary component.

## Current Status
```javascript
// TODO: Send to error tracking service (Sentry)
// Sentry.captureException(error, { extra: errorInfo });
```

## Benefits
- Centralized error tracking
- Real-time error notifications
- Stack trace capture
- User context and breadcrumbs
- Performance monitoring

## Implementation
Full implementation guide provided in CODE_QUALITY_RECOMMENDATIONS.md #15

## Estimated Effort
4 hours

## Documentation
- Implementation guide: CODE_QUALITY_RECOMMENDATIONS.md #15
- Integration code provided
```

---

### Issue 10: Conduct Accessibility Audit and Implement Improvements

**Title**: Conduct accessibility audit and implement WCAG compliance improvements

**Labels**: `accessibility`, `enhancement`, `low-priority`

**Body**:
```markdown
## Description
Conduct comprehensive accessibility audit and implement improvements for WCAG AA compliance.

## Key Areas to Address

1. **Keyboard Navigation**
   - Ensure all interactive elements accessible via keyboard
   - Implement proper focus management
   - Add skip navigation links

2. **ARIA Labels**
   - Add aria-label to icon-only buttons
   - Use aria-labelledby for complex components
   - Implement aria-live regions for dynamic content

3. **Color Contrast**
   - Ensure WCAG AA compliance (4.5:1 ratio)
   - Test with color blindness simulators
   - Provide high contrast theme option

4. **Screen Reader Support**
   - Test with NVDA/JAWS/VoiceOver
   - Add proper heading hierarchy
   - Provide text alternatives for images

## Tools to Use
```bash
npm install -D @axe-core/react eslint-plugin-jsx-a11y
```

## Estimated Effort
16 hours

## Documentation
- Full checklist: CODE_QUALITY_RECOMMENDATIONS.md #11
- Implementation examples provided
```

---

## SUMMARY

### Total Issues to Create: 10

**High Priority** (4 issues):
1. Console logging migration
2. useCurrentUser hook
3. SoundCloud OAuth integration
4. QR scanner implementation

**Medium Priority** (3 issues):
5. Replace mock data
6. Content Security Policy
7. Rate limiting

**Low Priority** (3 issues):
8. Code splitting
9. Sentry error tracking
10. Accessibility audit

### Total Estimated Effort: ~106 hours

**Immediate** (Week 1-2): 16-18 hours (Issues #1, #2, #9)  
**Short Term** (Month 1): 52 hours (Issues #3, #4, #5, #6, #7)  
**Medium Term** (Month 2-3): 24 hours (Issue #8)  
**Long Term** (Month 3+): 16 hours (Issue #10)

---

## How to Use This Document

1. **Create all issues**: Use the templates above to create GitHub issues
2. **Apply labels**: Use the labels specified for each issue
3. **Prioritize**: Follow the priority order (High → Medium → Low)
4. **Assign**: Assign issues to appropriate team members
5. **Track**: Use GitHub project boards to track progress
6. **Reference**: Each issue references the detailed documentation in PR #6

---

**Generated**: 2026-01-03  
**Source**: PR #6 comprehensive documentation analysis  
**Coordinator**: GitHub Copilot Coding Agent
