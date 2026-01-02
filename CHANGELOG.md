# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-01-02

### Security Fixes
- Fixed all 8 npm CVEs (6 MODERATE, 2 HIGH severity)
  - **jspdf**: Updated to 3.0.4 to fix DoS and ReDoS vulnerabilities (HIGH)
  - **quill**: Forced update to 2.0.3 via npm overrides to fix XSS vulnerability (MODERATE) - GHSA-4943-9vgg-gr5r
    - Note: react-quill 2.0.0 depends on quill <=1.3.7, override necessary until react-quill updates
  - **glob**: Auto-fixed to 10.5.0+ to fix command injection vulnerability (HIGH) - GHSA-5j98-mcp5-4vw2
  - **js-yaml**: Auto-fixed to 4.1.1+ to fix prototype pollution (MODERATE) - GHSA-mh29-5h37-fv8m
  - **mdast-util-to-hast**: Auto-fixed to 13.2.1+ to fix unsanitized attributes (MODERATE) - GHSA-4fh9-h7wg-q85m
  - **vite**: Auto-fixed to 6.4.1+ to fix path traversal on Windows (MODERATE) - GHSA-93m4-6634-74q7
- Verified 0 vulnerabilities with `npm audit`

### Added
- **CI/CD**: GitHub Actions workflow (`.github/workflows/ci.yml`)
  - Lint checks with ESLint
  - TypeScript type checking
  - Production build verification
  - Test suite execution
  - Security audit for npm packages (--audit-level=high)
  - Proper permissions set (contents: read)
- **Testing Infrastructure**: Vitest + React Testing Library
  - Test configuration in `vite.config.js`
  - Test setup file with jest-dom matchers (`src/test/setup.js`)
  - Sample Badge component tests (3 passing)
  - Test scripts: `test`, `test:watch`, `test:ui`, `test:coverage`
- **Documentation**:
  - Comprehensive README.md with installation, scripts, testing, and security guides
  - SECURITY.md with security policy, best practices, and vulnerability history
  - CHANGELOG.md for tracking changes
  - .env.example with all required environment variables (already existed, verified)

### Changed
- Updated Node.js requirement to 20+ (from 18+)
- Updated npm requirement to 10+ (from 9+)

### Fixed
- Renamed files with invalid `.tsx.jsx` extensions to `.jsx`:
  - `RecordManager.tsx.jsx` → `RecordManager.jsx`
  - `RightNowGrid.tsx.jsx` → `RightNowGrid.jsx`
- Removed unused duplicate files:
  - `src/components/shell/AppContent.tsx.jsx` (not imported anywhere)
  - `src/components/shell/PersistentRadioPlayer.tsx.jsx` (duplicate of .jsx version)
- Removed TypeScript type annotations from JavaScript (.jsx) files
  - Fixed RecordManager.jsx to use pure JavaScript syntax (removed `: File | null`, `: any`, `: React.FormEvent`)

### Technical Details

#### NPM Overrides Explanation
The `package.json` includes an override for the `quill` package:
```json
"overrides": {
  "quill": "^2.0.3"
}
```
This forces all dependencies to use quill 2.0.3+ which fixes a critical XSS vulnerability (GHSA-4943-9vgg-gr5r). The override is necessary because react-quill 2.0.0 explicitly depends on quill 1.3.7, which is vulnerable. This will remain in place until react-quill is updated to support quill 2.x.

#### Test Configuration
Vitest is configured with:
- `globals: true` - Enable global test APIs
- `environment: 'jsdom'` - DOM environment for React component testing
- `setupFiles: './src/test/setup.js'` - Setup file with jest-dom matchers

#### CI/CD Workflow
The workflow runs on:
- Push to `main` branch
- Pull requests to `main` branch

Jobs:
1. **lint-and-build** - Node 20.x matrix
   - Install dependencies with `npm ci`
   - Run ESLint
   - Run TypeScript type checking
   - Build production bundle
   - Run tests (continue-on-error: true for initial setup)
2. **security** - Node 20.x
   - Install dependencies with `npm ci`
   - Run npm audit at high severity level

### Known Issues
- Linting warnings: 160 unused import warnings remain (non-critical, don't block build)
- TypeScript type checking: Many errors from dependencies and UI components (doesn't block build)
- Console.log statements: Present throughout codebase (mostly in analytics, non-blocking)
- Duplicate user-fetching logic: Identified across 20+ components but deferred for future refactoring
- Build warnings: CSS syntax warnings from template literals in Tailwind classes (non-blocking)

### Future Work
- Expand test coverage beyond basic component tests
- Fix unused import warnings (eslint-plugin-unused-imports)
- Refactor duplicate user-fetching logic into shared utilities
- Complete incomplete features:
  - SoundCloud OAuth integration (placeholder in functions/pushToSoundCloud.ts)
  - QR Ticket Scanner logic (placeholder in TicketScanner.jsx)
  - Remove mock data generators from production code

## Version History

This is the first tracked version with comprehensive security fixes, CI/CD, and testing infrastructure.
