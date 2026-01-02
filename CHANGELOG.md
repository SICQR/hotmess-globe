# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-01-02

### Security Fixes
- Fixed all 8 npm CVEs (HIGH and MODERATE severity)
  - **jspdf**: Updated to 3.0.4 to fix DoS and ReDoS vulnerabilities
  - **quill**: Forced update to 2.0.3 via npm overrides to fix XSS vulnerability (GHSA-4943-9vgg-gr5r)
    - Note: react-quill 2.0.0 depends on quill <=1.3.7, override necessary until react-quill updates
  - **glob**: Auto-fixed to 10.5.0+ to fix command injection vulnerability
  - **js-yaml**: Auto-fixed to 4.1.1+ to fix prototype pollution
  - **mdast-util-to-hast**: Auto-fixed to 13.2.1+ to fix unsanitized attributes
  - **vite**: Auto-fixed to 6.4.1+ to fix path traversal on Windows
- Verified 0 vulnerabilities with `npm audit`

### Added
- **CI/CD**: GitHub Actions workflow (`.github/workflows/ci.yml`)
  - Lint checks with ESLint
  - TypeScript type checking
  - Production build verification
  - Test suite execution
  - Security audit for npm packages
- **Testing Infrastructure**: Vitest + React Testing Library
  - Test configuration in `vite.config.js`
  - Test setup file with jest-dom matchers
  - Sample Badge component tests (3 passing)
  - Test scripts: `test`, `test:watch`, `test:ui`, `test:coverage`
- **Documentation**:
  - Comprehensive README.md with installation, scripts, security, and testing guides
  - SECURITY.md with security policy and vulnerability history
  - .env.example with all required environment variables
  - CHANGELOG.md for tracking changes

### Changed
- Updated .gitignore to allow .env.example while still ignoring other .env files

### Fixed
- Renamed files with invalid `.tsx.jsx` extensions to `.jsx`:
  - `RecordManager.tsx.jsx` → `RecordManager.jsx`
  - `RightNowGrid.tsx.jsx` → `RightNowGrid.jsx`
- Removed unused duplicate files:
  - `AppContent.tsx.jsx` (not imported anywhere)
  - `PersistentRadioPlayer.tsx.jsx` (duplicate of .jsx version)
- Removed TypeScript type annotations from JavaScript (.jsx) files
  - Fixed RecordManager.jsx to use pure JavaScript syntax

### Technical Details

#### NPM Overrides Explanation
The `package.json` includes an override for the `quill` package:
```json
"overrides": {
  "quill": "^2.0.3"
}
```
This forces all dependencies to use quill 2.0.3+ which fixes a critical XSS vulnerability. The override is necessary because react-quill 2.0.0 explicitly depends on quill 1.3.7, which is vulnerable. This will remain in place until react-quill is updated to support quill 2.x.

### Known Issues
- Console.log statements: Reviewed and found to be properly gated (mostly in DEV mode via analytics.jsx)
- Duplicate user-fetching logic: Identified across 20+ components but deferred for future refactoring
- Build warnings: CSS syntax warnings from template literals in Tailwind classes (non-blocking)

### Future Work
- Expand test coverage beyond basic component tests
- Refactor duplicate user-fetching logic into shared utilities
- Complete incomplete features:
  - SoundCloud OAuth integration (placeholder in functions/pushToSoundCloud.ts)
  - QR Ticket Scanner logic (placeholder in TicketScanner.jsx)
  - Remove mock data generators from production code
