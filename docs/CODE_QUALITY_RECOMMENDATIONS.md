# Code Quality & Technical Recommendations

## 📋 Overview

This document provides actionable recommendations for improving code quality, maintainability, and developer experience for the HOTMESS platform.

## 🔧 Immediate Actions (High Priority)

### 1. Complete Console Logging Migration
**Status**: In Progress (35% complete)
**Effort**: 4-6 hours
**Priority**: High

#### What's Done:
- ✅ Structured logger created (`src/utils/logger.js`)
- ✅ Critical auth files updated (AuthContext, ErrorBoundary, Events page)
- ✅ Automatic sensitive data redaction

#### Remaining Work:
Replace ~95 remaining `console.log`, `console.warn` statements with the structured logger.

#### Pattern to Follow:
```javascript
// Before:
console.log('User logged in:', userData);
console.error('API call failed:', error);

// After:
import logger from '@/utils/logger';
logger.info('User logged in', { userId: userData.id });
logger.error('API call failed', { error: error.message, endpoint: '/api/users' });
```

#### Bulk Replace Command:
```bash
# Find all console statements
grep -r "console\." src/ --include="*.jsx" --include="*.js" -l

# Auto-fix with ESLint (when rule is added)
npm run lint:fix
```

### 2. Remove Unused Imports
**Status**: Not Started
**Effort**: 1-2 hours
**Priority**: Medium

#### Current State:
- 40+ unused imports across the codebase
- Increases bundle size
- Creates noise in code

#### Solution:
```bash
# Auto-fix with ESLint
npm run lint:fix
```

The `eslint-plugin-unused-imports` is already configured. Running `lint:fix` will automatically remove unused imports.

### 3. Create useCurrentUser Hook
**Status**: Not Started
**Effort**: 4 hours
**Priority**: High

#### Problem:
User fetching logic duplicated across 20+ page components:
```javascript
// Pattern repeated everywhere:
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

#### Solution:
Create `src/hooks/useCurrentUser.js`:
```javascript
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import logger from '@/utils/logger';

export function useCurrentUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          setUser(null);
          return;
        }
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (err) {
        logger.error('Failed to fetch user', { error: err.message });
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  return { user, loading, error };
}
```

#### Usage:
```javascript
import { useCurrentUser } from '@/hooks/useCurrentUser';

function MyPage() {
  const { user, loading, error } = useCurrentUser();

  if (loading) return <Loader />;
  if (error) return <Error />;
  if (!user) return <LoginPrompt />;

  return <div>Welcome, {user.username}!</div>;
}
```

## 🎨 Code Quality Improvements (Medium Priority)

### 4. Refactor Large Components
**Status**: Not Started
**Effort**: 16-24 hours
**Priority**: Medium

#### Components Exceeding 500 Lines:
- `src/pages/EditProfile.jsx` (~600 lines)
- `src/pages/Profile.jsx` (~550 lines)
- `src/pages/Checkout.jsx` (~500 lines)

#### Benefits of Refactoring:
- Easier to test
- Better code reusability
- Improved maintainability
- Reduced cognitive load

#### Refactoring Strategy for EditProfile:
Break into smaller components:
```
EditProfile.jsx (main component, ~100 lines)
├── ProfilePhotoSection.jsx
├── BasicInfoForm.jsx
├── LocationSection.jsx
├── InterestsSection.jsx
├── SocialLinksSection.jsx
└── PrivacySettingsSection.jsx
```

### 5. Extract Magic Numbers to Constants
**Status**: Not Started
**Effort**: 3-4 hours
**Priority**: Low

#### Current State:
Magic numbers scattered throughout codebase:
- Polling intervals (3000, 5000, 10000 ms)
- Pagination limits (10, 20, 50 items)
- Timeouts (30000 ms)
- Size limits (5 MB, 10 MB)

#### Solution:
Create `src/utils/constants.js`:
```javascript
// Timing Constants
export const TIMING = {
  POLLING_INTERVAL: 5000,
  DEBOUNCE_DELAY: 300,
  TIMEOUT_DEFAULT: 30000,
  ANIMATION_DURATION: 200,
};

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  INITIAL_PAGE: 1,
};

// File Upload Limits
export const FILE_LIMITS = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5 MB
  MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50 MB
  MAX_AUDIO_SIZE: 10 * 1024 * 1024, // 10 MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm'],
};

// API Configuration
export const API = {
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  REQUEST_TIMEOUT: 30000,
};
```

### 6. Add TypeScript Gradually
**Status**: Not Started
**Effort**: Ongoing
**Priority**: Low

#### Current State:
- Mix of `.jsx`, `.js`, and `.tsx` files
- JSConfig for type checking
- No strict typing

#### Recommendation:
Gradually migrate to TypeScript:
1. Rename new files to `.tsx` or `.ts`
2. Add types to utility functions first
3. Add types to hooks
4. Add types to components
5. Enable strict mode incrementally

#### Example:
```typescript
// Before (profile.js)
export function formatUserProfile(user) {
  return {
    name: user.name,
    avatar: user.avatar_url,
    bio: user.bio || '',
  };
}

// After (profile.ts)
interface User {
  name: string;
  avatar_url: string;
  bio?: string;
}

interface FormattedProfile {
  name: string;
  avatar: string;
  bio: string;
}

export function formatUserProfile(user: User): FormattedProfile {
  return {
    name: user.name,
    avatar: user.avatar_url,
    bio: user.bio || '',
  };
}
```

## 🧪 Testing Recommendations (High Priority)

### 7. Set Up Test Infrastructure
**Status**: Not Started
**Effort**: 40-60 hours
**Priority**: High

#### Recommended Stack:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jsdom @vitest/ui
```

#### Create `vitest.config.js`:
```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{js,jsx,ts,tsx}',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

#### Priority Tests to Write:
1. **Utility Functions** (easiest to test)
   - `src/utils/logger.js`
   - `src/utils/dateUtils.js`
   - `src/utils/formatters.js`

2. **Custom Hooks**
   - `useCurrentUser` (once created)
   - `useGeolocation`

3. **Critical Components**
   - `ErrorBoundary`
   - `AuthContext`
   - `Checkout` flow

4. **Backend Functions**
   - Authentication functions
   - Payment processing
   - Data validation

#### Example Test:
```javascript
// src/utils/logger.test.js
import { describe, it, expect, vi } from 'vitest';
import logger from './logger';

describe('Logger', () => {
  it('redacts sensitive information', () => {
    const consoleSpy = vi.spyOn(console, 'error');
    logger.error('Auth failed', { password: 'secret123', token: 'abc' });
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[REDACTED]')
    );
  });

  it('only logs errors in production', () => {
    // Test production behavior
  });
});
```

## 📦 Performance Optimization (Medium Priority)

### 8. Implement Code Splitting
**Status**: Not Started
**Effort**: 8 hours
**Priority**: Medium

#### Current State:
- Single 3+ MB bundle
- All routes loaded upfront
- Poor initial load performance

#### Solution:
Implement route-based code splitting:

```javascript
// Before
import Events from './pages/Events';
import Profile from './pages/Profile';

// After
const Events = lazy(() => import('./pages/Events'));
const Profile = lazy(() => import('./pages/Profile'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/events" element={<Events />} />
        <Route path="/profile/:id" element={<Profile />} />
      </Routes>
    </Suspense>
  );
}
```

#### Expected Impact:
- Initial bundle: 3+ MB → ~500 KB
- Faster time to interactive
- Better Core Web Vitals scores

### 9. Optimize Three.js Imports
**Status**: Not Started
**Effort**: 2 hours
**Priority**: Medium

#### Problem:
Importing entire Three.js library when only few modules needed.

#### Solution:
```javascript
// Before
import * as THREE from 'three';

// After
import { Scene, PerspectiveCamera, WebGLRenderer } from 'three';
```

### 10. Implement Image Optimization
**Status**: Not Started
**Effort**: 4 hours
**Priority**: Medium

#### Recommendations:
1. Use WebP format with JPEG fallback
2. Implement lazy loading for images
3. Add loading="lazy" to img tags
4. Use responsive images with srcset
5. Consider a CDN (Cloudinary, Imgix)

```jsx
// Before
<img src={user.avatar} alt={user.name} />

// After
<img
  src={user.avatar}
  srcSet={`${user.avatar}?w=400 400w, ${user.avatar}?w=800 800w`}
  sizes="(max-width: 768px) 400px, 800px"
  alt={user.name}
  loading="lazy"
/>
```

## ♿ Accessibility Improvements (Medium Priority)

### 11. Accessibility Audit
**Status**: Not Started
**Effort**: 16 hours
**Priority**: Medium

#### Key Areas to Address:

1. **Keyboard Navigation**
   - Ensure all interactive elements are keyboard accessible
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

#### Tools to Use:
```bash
# Install accessibility testing tools
npm install -D @axe-core/react eslint-plugin-jsx-a11y
```

#### Example Fixes:
```jsx
// Before
<button onClick={handleClick}>
  <Icon />
</button>

// After
<button onClick={handleClick} aria-label="Open menu">
  <Icon aria-hidden="true" />
</button>
```

## 🤖 Automation & Developer Experience (Low Priority)

### 12. Set Up Dependabot/Renovate
**Status**: Not Started
**Effort**: 1 hour
**Priority**: Low

#### Why:
- Automated dependency updates
- Security patch notifications
- Reduces maintenance burden

#### Implementation:
Create `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
    open-pull-requests-limit: 10
    reviewers:
      - "your-team"
    labels:
      - "dependencies"
```

### 13. Add Pre-commit Hooks
**Status**: Not Started
**Effort**: 2 hours
**Priority**: Low

#### Install Husky + lint-staged:
```bash
npm install -D husky lint-staged
npx husky-init
```

#### Configure `.husky/pre-commit`:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

#### Configure `lint-staged` in package.json:
```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

### 14. Add Prettier for Code Formatting
**Status**: Not Started
**Effort**: 1 hour
**Priority**: Low

```bash
npm install -D prettier
```

Create `.prettierrc`:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "avoid"
}
```

## 📊 Monitoring & Observability (Medium Priority)

### 15. Implement Error Tracking (Sentry)
**Status**: Partially Implemented
**Effort**: 4 hours
**Priority**: High

#### Current State:
- ErrorBoundary has TODO comment for Sentry
- No centralized error tracking

#### Implementation:
```bash
npm install @sentry/react @sentry/vite-plugin
```

```javascript
// src/main.jsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD,
});
```

Update ErrorBoundary:
```javascript
componentDidCatch(error, errorInfo) {
  logger.error('ErrorBoundary caught error', { error: error.message });
  Sentry.captureException(error, { extra: errorInfo });
}
```

### 16. Add Analytics
**Status**: Not Started
**Effort**: 8 hours
**Priority**: Medium

#### Recommended Tools:
- **Plausible** (privacy-friendly, GDPR compliant)
- **PostHog** (open source, feature flags + analytics)
- **Google Analytics 4** (most features, but privacy concerns)

## 🔐 Additional Security Hardening (High Priority)

### 17. Implement Content Security Policy
**Status**: Not Started
**Effort**: 6 hours
**Priority**: High

Update `vite.config.js`:
```javascript
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'html-transform',
      transformIndexHtml(html) {
        return html.replace(
          '<head>',
          `<head>
            <meta http-equiv="Content-Security-Policy" content="
              default-src 'self';
              script-src 'self' 'unsafe-inline' 'unsafe-eval';
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: https:;
              font-src 'self' data:;
              connect-src 'self' https://your-api.base44.app;
            ">
          `
        );
      },
    },
  ],
});
```

### 18. Implement Rate Limiting
**Status**: Not Started
**Effort**: 8 hours
**Priority**: High

#### For Backend Functions:
```javascript
// Add to each function
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

## 📝 Documentation Improvements (Medium Priority)

### 19. Add JSDoc Comments
**Status**: Not Started
**Effort**: 16 hours
**Priority**: Medium

#### Pattern:
```javascript
/**
 * Formats user profile data for display
 * @param {Object} user - Raw user object from API
 * @param {string} user.id - User ID
 * @param {string} user.name - User's display name
 * @param {string} [user.bio] - User's bio (optional)
 * @returns {FormattedProfile} Formatted profile object
 * @example
 * const formatted = formatUserProfile(rawUser);
 * console.log(formatted.name); // "John Doe"
 */
export function formatUserProfile(user) {
  // ...
}
```

### 20. Create Component Documentation
**Status**: Not Started
**Effort**: 12 hours
**Priority**: Low

#### Use Storybook:
```bash
npm install -D @storybook/react @storybook/addon-essentials
npx storybook@latest init
```

## 📈 Summary & Priorities

### Immediate (Week 1-2):
1. ✅ Security vulnerabilities (DONE)
2. ✅ CI/CD setup (DONE)
3. ✅ Security documentation (DONE)
4. Console logging migration
5. Unused imports cleanup
6. Create useCurrentUser hook
7. Implement error tracking (Sentry)

### Short Term (Month 1):
8. Test infrastructure setup
9. Code splitting implementation
10. Large component refactoring
11. Content Security Policy
12. Rate limiting

### Medium Term (Month 2-3):
13. TypeScript migration (gradual)
14. Accessibility audit & fixes
15. Performance optimization
16. Bundle size reduction
17. Analytics implementation

### Long Term (Month 3+):
18. Comprehensive test coverage (>80%)
19. E2E testing with Playwright/Cypress
20. Full TypeScript migration
21. Performance monitoring
22. Advanced accessibility features

---

**Last Updated**: 2026-01-03
**Maintained By**: Development Team
