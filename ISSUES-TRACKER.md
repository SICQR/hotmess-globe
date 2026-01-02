# 📋 Trackable Issues - Hotmess Globe

**Last Updated**: 2026-01-02  
**Total Issues**: 25  
**Status Legend**: 🔴 Not Started | 🟡 In Progress | 🟢 Completed

---

## 🚨 Critical Priority (Do First)

### ISSUE-001: Critical NPM Security Vulnerabilities
- **Status**: 🔴 Not Started
- **Priority**: Critical
- **Type**: Security
- **Estimate**: 2 hours
- **Dependencies**: None
- **Description**: 6 npm vulnerabilities (2 high, 4 moderate) affecting dompurify, glob, mdast-util-to-hast, and quill packages
- **Acceptance Criteria**:
  - [ ] Run `npm audit` to confirm vulnerabilities
  - [ ] Execute `npm audit fix` for non-breaking changes
  - [ ] Execute `npm audit fix --force` for breaking changes
  - [ ] Test application after fixes
  - [ ] Verify `npm audit` shows 0 vulnerabilities
- **Files**: 
  - `package.json`
  - `package-lock.json`
- **Commands**:
  ```bash
  npm audit
  npm audit fix
  npm audit fix --force
  npm test # After fixes
  ```

### ISSUE-006: No CI/CD Pipeline
- **Status**: 🔴 Not Started
- **Priority**: Critical
- **Type**: Infrastructure
- **Estimate**: 8 hours
- **Dependencies**: ISSUE-008
- **Description**: No GitHub Actions workflows exist for automated building, testing, or deployment
- **Acceptance Criteria**:
  - [ ] Create `.github/workflows/ci.yml`
  - [ ] Implement build job
  - [ ] Implement lint job
  - [ ] Implement test job (when tests exist)
  - [ ] Implement security scanning job
  - [ ] Set up deployment workflow
  - [ ] Test pipeline on pull request
- **Files**:
  - `.github/workflows/ci.yml` (new)
  - `.github/workflows/deploy.yml` (new)
- **Notes**: Start with basic build and lint, expand as tests are added

### ISSUE-007: Missing Test Infrastructure
- **Status**: 🔴 Not Started
- **Priority**: Critical
- **Type**: Infrastructure
- **Estimate**: 40 hours
- **Dependencies**: ISSUE-008
- **Description**: Zero test coverage, no test framework installed or configured
- **Acceptance Criteria**:
  - [ ] Install Vitest and React Testing Library
  - [ ] Configure test setup file
  - [ ] Create test utilities and helpers
  - [ ] Write tests for ErrorBoundary component
  - [ ] Write tests for AuthContext
  - [ ] Write tests for Checkout flow
  - [ ] Write tests for at least 5 backend functions
  - [ ] Achieve minimum 30% code coverage
  - [ ] Add test script to package.json
  - [ ] Document testing approach in README
- **Files**:
  - `vitest.config.js` (new)
  - `src/test/setup.js` (new)
  - `src/**/*.test.jsx` (new, multiple)
  - `functions/**/*.test.ts` (new, multiple)
- **Packages to Install**:
  ```bash
  npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
  ```

### ISSUE-008: Dependencies Not Installed
- **Status**: 🔴 Not Started
- **Priority**: Critical
- **Type**: Infrastructure
- **Estimate**: 1 hour
- **Dependencies**: None
- **Description**: All node_modules are missing, project cannot build or run
- **Acceptance Criteria**:
  - [ ] Run `npm install` successfully
  - [ ] Verify all dependencies installed
  - [ ] Update README with installation instructions
  - [ ] Test `npm run dev` works
  - [ ] Test `npm run build` works
  - [ ] Document any peer dependency warnings
- **Files**:
  - `README.md`
- **Commands**:
  ```bash
  npm install
  npm run dev
  npm run build
  ```

---

## ⚠️ High Priority (Do Soon)

### ISSUE-002: Missing Error Tracking Integration
- **Status**: 🔴 Not Started
- **Priority**: High
- **Type**: Feature/Security
- **Estimate**: 4 hours
- **Dependencies**: None
- **Description**: ErrorBoundary has TODO comment for Sentry integration but not implemented
- **Acceptance Criteria**:
  - [ ] Set up Sentry account
  - [ ] Install Sentry SDK packages
  - [ ] Configure Sentry in application
  - [ ] Integrate Sentry in ErrorBoundary
  - [ ] Integrate Sentry in PageErrorBoundary
  - [ ] Test error reporting
  - [ ] Document Sentry setup in README
  - [ ] Add SENTRY_DSN to .env.example
- **Files**:
  - `src/components/error/ErrorBoundary.jsx`
  - `src/components/error/PageErrorBoundary.jsx`
  - `src/main.jsx`
  - `README.md`
  - `.env.example`
- **Packages**:
  ```bash
  npm install @sentry/react @sentry/vite-plugin
  ```

### ISSUE-004: Client-side API Key Exposure
- **Status**: 🔴 Not Started
- **Priority**: High
- **Type**: Security
- **Estimate**: 16 hours
- **Dependencies**: None
- **Description**: Sensitive API operations performed client-side exposing keys
- **Acceptance Criteria**:
  - [ ] Audit all VITE_ environment variables
  - [ ] Identify sensitive operations
  - [ ] Move sensitive operations to backend functions
  - [ ] Create proxy functions for Mapbox operations
  - [ ] Create proxy functions for Supabase admin operations
  - [ ] Test all affected features
  - [ ] Document security architecture
- **Files**:
  - Multiple frontend files using env vars
  - `functions/` (new proxy functions)
- **Notes**: Focus on admin operations and payment processing first

### ISSUE-013: Incomplete README
- **Status**: 🔴 Not Started
- **Priority**: High
- **Type**: Documentation
- **Estimate**: 4 hours
- **Dependencies**: ISSUE-008, ISSUE-015
- **Description**: README missing critical information like installation steps, build instructions, project overview
- **Acceptance Criteria**:
  - [ ] Add project description and overview
  - [ ] Add features list
  - [ ] Add complete installation instructions
  - [ ] Add build and deployment instructions
  - [ ] Add troubleshooting section
  - [ ] Add screenshots/demo link
  - [ ] Add license information
  - [ ] Add contributing guidelines link
  - [ ] Add badges (build status, etc.)
- **Files**:
  - `README.md`

### ISSUE-015: No Environment Variable Documentation
- **Status**: 🔴 Not Started
- **Priority**: High
- **Type**: Documentation
- **Estimate**: 2 hours
- **Dependencies**: None
- **Description**: Missing .env.example file with all required environment variables
- **Acceptance Criteria**:
  - [ ] Create .env.example file
  - [ ] Document all VITE_ variables
  - [ ] Document Base44 configuration
  - [ ] Document Mapbox configuration
  - [ ] Document Supabase configuration
  - [ ] Document Stripe configuration
  - [ ] Document optional variables
  - [ ] Add setup instructions for each service
- **Files**:
  - `.env.example` (new)
  - `README.md`

### ISSUE-018: SoundCloud Integration Incomplete
- **Status**: 🔴 Not Started
- **Priority**: High
- **Type**: Feature
- **Estimate**: 24 hours
- **Dependencies**: None
- **Description**: SoundCloud upload functionality has placeholder/mock implementation
- **Acceptance Criteria**:
  - [ ] Research SoundCloud API requirements
  - [ ] Implement OAuth flow
  - [ ] Create SoundCloud API client
  - [ ] Update pushToSoundCloud function
  - [ ] Remove placeholder/mock responses
  - [ ] Test full upload flow
  - [ ] Add error handling
  - [ ] Document setup in README
- **Files**:
  - `functions/pushToSoundCloud.ts`
  - `src/components/admin/RecordManager.tsx.jsx`
- **Notes**: Requires SoundCloud Pro API access

---

## 📋 Medium Priority (Do Next)

### ISSUE-003: Console Logging Security Risk
- **Status**: 🔴 Not Started
- **Priority**: Medium
- **Type**: Security
- **Estimate**: 8 hours
- **Dependencies**: None
- **Description**: 140+ console.log/warn statements including API payload logging
- **Acceptance Criteria**:
  - [ ] Audit all console.log statements
  - [ ] Remove production console.log statements
  - [ ] Keep appropriate console.error statements
  - [ ] Implement proper logging framework (e.g., winston)
  - [ ] Replace console statements with logger
  - [ ] Configure log levels
  - [ ] Gate debug logging with environment check
- **Files**:
  - Multiple files (140+ instances)
  - `src/utils/logger.js` (new)
- **Search Command**:
  ```bash
  grep -r "console\." src/ functions/
  ```

### ISSUE-005: Content Security Policy Missing
- **Status**: 🔴 Not Started
- **Priority**: Medium
- **Type**: Security
- **Estimate**: 6 hours
- **Dependencies**: None
- **Description**: No CSP headers configured, exposing application to XSS risks
- **Acceptance Criteria**:
  - [ ] Define CSP policy
  - [ ] Implement CSP headers in Vite config
  - [ ] Test application functionality with CSP
  - [ ] Add CSP to backend functions
  - [ ] Configure nonce for inline scripts if needed
  - [ ] Test with CSP reporting
  - [ ] Document CSP configuration
- **Files**:
  - `vite.config.js`
  - `index.html`
  - `functions/` (headers)

### ISSUE-009: Invalid File Extension
- **Status**: 🔴 Not Started
- **Priority**: Medium
- **Type**: Bug
- **Estimate**: 1 hour
- **Dependencies**: None
- **Description**: RecordManager.tsx.jsx has invalid double extension
- **Acceptance Criteria**:
  - [ ] Determine if file should be .tsx or .jsx
  - [ ] Rename file with correct extension
  - [ ] Update all imports referencing this file
  - [ ] Test application builds
  - [ ] Verify no TypeScript/JavaScript errors
- **Files**:
  - `src/components/admin/RecordManager.tsx.jsx`
  - Any files importing RecordManager

### ISSUE-011: Duplicate Code - User Fetching Logic
- **Status**: 🔴 Not Started
- **Priority**: Medium
- **Type**: Code Quality
- **Estimate**: 6 hours
- **Dependencies**: None
- **Description**: User fetching pattern duplicated across 20+ page components
- **Acceptance Criteria**:
  - [ ] Create useCurrentUser custom hook
  - [ ] Implement user fetching logic in hook
  - [ ] Add error handling in hook
  - [ ] Add loading state in hook
  - [ ] Replace duplicate logic in all pages
  - [ ] Test each affected page
  - [ ] Document hook usage
- **Files**:
  - `src/hooks/useCurrentUser.js` (new)
  - Multiple page components (20+)

### ISSUE-014: Missing Architecture Documentation
- **Status**: 🔴 Not Started
- **Priority**: Medium
- **Type**: Documentation
- **Estimate**: 8 hours
- **Dependencies**: None
- **Description**: No documentation explaining system architecture and design decisions
- **Acceptance Criteria**:
  - [ ] Create ARCHITECTURE.md
  - [ ] Document component hierarchy
  - [ ] Document data flow
  - [ ] Document state management approach
  - [ ] Document API integration patterns
  - [ ] Create architecture diagrams
  - [ ] Document authentication flow
  - [ ] Document deployment architecture
- **Files**:
  - `ARCHITECTURE.md` (new)

### ISSUE-016: Missing API Documentation
- **Status**: 🔴 Not Started
- **Priority**: Medium
- **Type**: Documentation
- **Estimate**: 12 hours
- **Dependencies**: None
- **Description**: 25 backend functions with no API documentation
- **Acceptance Criteria**:
  - [ ] Create API.md or functions/README.md
  - [ ] Document each function's purpose
  - [ ] Document request parameters
  - [ ] Document response formats
  - [ ] Document error responses
  - [ ] Document authentication requirements
  - [ ] Add examples for each endpoint
  - [ ] Add JSDoc comments to function files
- **Files**:
  - `functions/API.md` (new)
  - `functions/*.ts` (add JSDoc)

### ISSUE-019: QR Scanner Not Implemented
- **Status**: 🔴 Not Started
- **Priority**: Medium
- **Type**: Feature
- **Estimate**: 12 hours
- **Dependencies**: None
- **Description**: QR scanning functionality marked as "Coming Soon"
- **Acceptance Criteria**:
  - [ ] Research QR scanning libraries (html5-qrcode, etc.)
  - [ ] Implement QR scanner component
  - [ ] Integrate with ticket validation
  - [ ] Integrate with beacon check-in
  - [ ] Add camera permissions handling
  - [ ] Test on mobile devices
  - [ ] Remove "Coming Soon" text
  - [ ] Add error handling
- **Files**:
  - `src/pages/Scan.jsx`
  - `src/components/events/TicketScanner.jsx`

### ISSUE-020: Mock Data in Production Code
- **Status**: 🔴 Not Started
- **Priority**: Medium
- **Type**: Bug
- **Estimate**: 8 hours
- **Dependencies**: None
- **Description**: Mock data generators and placeholders in production code
- **Acceptance Criteria**:
  - [ ] Replace CityDataOverlay mock data with real API
  - [ ] Replace Connect page mock distance with real calculation
  - [ ] Remove queryBuilder mock filtering
  - [ ] Test with real data
  - [ ] Update related documentation
- **Files**:
  - `src/components/globe/CityDataOverlay.jsx`
  - `src/pages/Connect.jsx`
  - `src/components/discovery/queryBuilder.jsx`

### ISSUE-022: Event Scraper Integration
- **Status**: 🔴 Not Started
- **Priority**: Medium
- **Type**: Feature
- **Estimate**: 12 hours
- **Dependencies**: None
- **Description**: Event scraper requires backend integration and scheduling
- **Acceptance Criteria**:
  - [ ] Enable backend function
  - [ ] Configure scraping schedule
  - [ ] Test scraping functionality
  - [ ] Add admin controls
  - [ ] Implement error notifications
  - [ ] Add scraping logs
  - [ ] Document scraping setup
- **Files**:
  - `src/components/admin/EventScraperControl.jsx`
  - `functions/scrapeEvents.ts`
  - `functions/scheduleEventScraper.ts`

### ISSUE-023: Outdated Dependencies
- **Status**: 🔴 Not Started
- **Priority**: Medium
- **Type**: Maintenance
- **Estimate**: 12 hours
- **Dependencies**: ISSUE-007 (need tests before updating)
- **Description**: Multiple packages have available updates, some with major version changes
- **Acceptance Criteria**:
  - [ ] Run `npm outdated` to list updates
  - [ ] Review breaking changes for major updates
  - [ ] Update non-breaking dependencies first
  - [ ] Test application after each major update
  - [ ] Update breaking dependencies one at a time
  - [ ] Run full test suite after updates
  - [ ] Update documentation if APIs changed
- **Files**:
  - `package.json`
  - Potentially affected components
- **Commands**:
  ```bash
  npm outdated
  npm update  # For minor/patch updates
  npm install <package>@latest  # For major updates
  ```

---

## ℹ️ Low Priority (Nice to Have)

### ISSUE-010: Large Component Refactoring Needed
- **Status**: 🔴 Not Started
- **Priority**: Low
- **Type**: Code Quality
- **Estimate**: 24 hours
- **Dependencies**: ISSUE-007
- **Description**: Multiple components exceed 500 lines, should be broken down
- **Acceptance Criteria**:
  - [ ] Identify components >500 lines
  - [ ] Create refactoring plan for each
  - [ ] Break EditProfile into smaller components
  - [ ] Break Profile into smaller components
  - [ ] Maintain functionality
  - [ ] Update tests
  - [ ] Verify no regressions
- **Files**:
  - `src/pages/EditProfile.jsx`
  - `src/pages/Profile.jsx`
  - Other large components

### ISSUE-012: Magic Numbers Throughout Codebase
- **Status**: 🔴 Not Started
- **Priority**: Low
- **Type**: Code Quality
- **Estimate**: 4 hours
- **Dependencies**: None
- **Description**: Hardcoded values for polling intervals, limits, timeouts throughout code
- **Acceptance Criteria**:
  - [ ] Identify all magic numbers
  - [ ] Create constants.js file
  - [ ] Categorize constants (timing, limits, etc.)
  - [ ] Replace magic numbers with named constants
  - [ ] Test application
  - [ ] Document configuration options
- **Files**:
  - `src/utils/constants.js` (new)
  - Multiple files with hardcoded values

### ISSUE-017: Insufficient Code Comments
- **Status**: 🔴 Not Started
- **Priority**: Low
- **Type**: Documentation
- **Estimate**: 16 hours
- **Dependencies**: None
- **Description**: Complex logic lacks explanatory comments and JSDoc
- **Acceptance Criteria**:
  - [ ] Add JSDoc to all exported functions
  - [ ] Add JSDoc to all React components
  - [ ] Add inline comments for complex logic
  - [ ] Document prop types or add TypeScript interfaces
  - [ ] Add usage examples for utilities
  - [ ] Document custom hooks
- **Files**:
  - Multiple files across codebase

### ISSUE-021: Premium Content Placeholders
- **Status**: 🔴 Not Started
- **Priority**: Low
- **Type**: Feature
- **Estimate**: 16 hours
- **Dependencies**: None
- **Description**: "XXX" placeholders for premium content features
- **Acceptance Criteria**:
  - [ ] Define premium content requirements
  - [ ] Implement premium content upload
  - [ ] Implement premium content blur/lock
  - [ ] Implement unlock mechanism
  - [ ] Replace "XXX" placeholders
  - [ ] Add premium badge/indicators
  - [ ] Test full premium flow
- **Files**:
  - `src/components/profile/MediaGallery.jsx`
  - `src/components/discovery/DiscoveryCard.jsx`
  - `src/pages/EditProfile.jsx`

### ISSUE-024: Unused Dependencies Audit
- **Status**: 🔴 Not Started
- **Priority**: Low
- **Type**: Optimization
- **Estimate**: 6 hours
- **Dependencies**: ISSUE-025
- **Description**: 82 production dependencies, likely unused packages present
- **Acceptance Criteria**:
  - [ ] Install depcheck or similar tool
  - [ ] Run dependency audit
  - [ ] Verify unused dependencies
  - [ ] Remove confirmed unused packages
  - [ ] Test application
  - [ ] Verify build size reduction
- **Files**:
  - `package.json`
- **Commands**:
  ```bash
  npx depcheck
  ```

### ISSUE-025: Bundle Size Optimization
- **Status**: 🔴 Not Started
- **Priority**: Low
- **Type**: Performance
- **Estimate**: 16 hours
- **Dependencies**: ISSUE-008
- **Description**: No bundle analysis performed, optimization opportunities unknown
- **Acceptance Criteria**:
  - [ ] Run bundle analyzer
  - [ ] Identify large dependencies
  - [ ] Implement code splitting for routes
  - [ ] Implement lazy loading for heavy components
  - [ ] Optimize Three.js imports
  - [ ] Configure tree shaking
  - [ ] Target <500KB initial bundle
  - [ ] Measure and document improvements
- **Files**:
  - `vite.config.js`
  - Route components
  - Heavy component imports
- **Commands**:
  ```bash
  npm run build -- --analyze
  ```

---

## 📊 Issue Statistics

- **Total Issues**: 25
- **Critical**: 4 (16%)
- **High**: 6 (24%)
- **Medium**: 9 (36%)
- **Low**: 6 (24%)

**Estimated Total Effort**: 272 hours (~7 weeks with 1 developer)

---

## 🎯 Suggested Sprint Planning

### Sprint 1 (Week 1) - Foundation
**Goal**: Get project buildable and secure
- ISSUE-008: Dependencies Not Installed (1h)
- ISSUE-001: Critical NPM Security Vulnerabilities (2h)
- ISSUE-013: Incomplete README (4h)
- ISSUE-015: No Environment Variable Documentation (2h)
- ISSUE-009: Invalid File Extension (1h)
- **Total**: 10 hours

### Sprint 2 (Week 2) - Infrastructure
**Goal**: Establish CI/CD and testing foundation
- ISSUE-006: No CI/CD Pipeline (8h)
- ISSUE-007: Missing Test Infrastructure - Part 1 (20h)
- **Total**: 28 hours

### Sprint 3 (Week 3) - Testing & Security
**Goal**: Increase test coverage and secure the application
- ISSUE-007: Missing Test Infrastructure - Part 2 (20h)
- ISSUE-002: Missing Error Tracking Integration (4h)
- ISSUE-005: Content Security Policy Missing (6h)
- **Total**: 30 hours

### Sprint 4 (Week 4) - Code Quality
**Goal**: Improve code maintainability
- ISSUE-003: Console Logging Security Risk (8h)
- ISSUE-011: Duplicate Code - User Fetching Logic (6h)
- ISSUE-014: Missing Architecture Documentation (8h)
- ISSUE-016: Missing API Documentation (12h)
- **Total**: 34 hours

### Sprint 5 (Week 5) - Feature Completion
**Goal**: Complete incomplete features
- ISSUE-018: SoundCloud Integration Incomplete (24h)
- ISSUE-019: QR Scanner Not Implemented (12h)
- **Total**: 36 hours

### Sprint 6 (Week 6) - Security & Quality
**Goal**: Harden security and fix bugs
- ISSUE-004: Client-side API Key Exposure (16h)
- ISSUE-020: Mock Data in Production Code (8h)
- ISSUE-022: Event Scraper Integration (12h)
- **Total**: 36 hours

### Sprint 7 (Week 7) - Optimization
**Goal**: Optimize and polish
- ISSUE-023: Outdated Dependencies (12h)
- ISSUE-010: Large Component Refactoring Needed (24h)
- **Total**: 36 hours

### Backlog (Future) - Nice to Have
- ISSUE-012: Magic Numbers Throughout Codebase (4h)
- ISSUE-017: Insufficient Code Comments (16h)
- ISSUE-021: Premium Content Placeholders (16h)
- ISSUE-024: Unused Dependencies Audit (6h)
- ISSUE-025: Bundle Size Optimization (16h)
- **Total**: 58 hours

---

## 📝 Notes for Contributors

1. **Always pull latest** before starting an issue
2. **Create a branch** named `issue-XXX-short-description`
3. **Update this file** to mark status as 🟡 In Progress when starting
4. **Reference the issue** in your commit messages
5. **Check all acceptance criteria** before submitting PR
6. **Update status to** 🟢 Completed when merged

## 🔄 Issue Status Tracking

To update an issue status, simply change the emoji:
- 🔴 Not Started
- 🟡 In Progress  
- 🟢 Completed

---

**Report Generated**: 2026-01-02  
**Next Review**: After Sprint 3 completion
