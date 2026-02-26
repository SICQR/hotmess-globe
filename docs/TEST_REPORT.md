# HOTMESS — Test Report
**Generated:** 2026-02-26
**After:** git pull (commit 2566fdb — added 9 new API test files + profile_overrides RLS fix)

---

## CURRENT TEST STATUS

### ✅ Main Test Suite (src/)
```
Test Files: 13 passed (13)
Tests:      156 passed (156)
Duration:   ~4s
```

### ⚠️ API Test Suite (api/ — run separately)
```
Test Files: 9 failed | 3 passed (12)
Tests:      169 failed | 251 passed (420)
```

**Note:** API tests use a separate config (`vitest.config.api.js`) and require `node` environment. They were added in the latest Copilot agent commit and have mock setup issues. These are documented as known issues below.

---

## TEST FILES INVENTORY

### Passing (src/ — main suite)

| File | Tests | Coverage Area |
|------|-------|--------------|
| `src/test/brandColors.test.tsx` | 2 | Brand color constants (#C8962C, #1C1C1E) |
| `src/test/sheetPolicy.test.ts` | ~20 | Sheet access policy (canOpenSheet) |
| `src/test/sosContext.test.tsx` | ~30 | SOS context (triggerSOS, clearSOS) |
| `src/test/unifiedGlobe.test.tsx` | ~20 | Globe component rendering |
| `src/test/vercel.csp.test.js` | ~30 | Content Security Policy headers |
| `e2e/auth-persistence.spec.js` | ~15 | Auth session persistence E2E |
| + 7 other test files | | Various component/hook tests |

### Failing (api/ — separate suite, known issues)

| File | Issue | Root Cause |
|------|-------|-----------|
| `api/admin/ops/cadence-apply.test.js` | Import path fixed | `./_verify.js` → `../_verify.js` (fixed) |
| `api/admin/ops/cadence-suggest.test.js` | Mock setup | `vi.clearAllMocks()` breaks module-level Supabase singleton |
| `api/admin/safety-switch.test.js` | Mock chain | Supabase `.from()` chain not properly mocked |
| `api/ai/_rag.test.js` | Mock setup | Same Supabase mock pattern issue |
| `api/ai/_tools.test.js` | Mock setup | Same |
| `api/ai/chat.test.js` | Mock + dynamic import | Dynamic import in `beforeEach` + module caching |
| `api/ai/profile-analysis.test.js` | Mock setup | Same |
| `api/ai/scene-scout.test.js` | Mock setup | Same |
| `api/ai/wingman.test.js` | Mock setup | Same |

**Root cause explanation:**
All 9 new API test files use `vi.clearAllMocks()` in `beforeEach` combined with module-level Supabase instantiation (`const supabase = createClient(...)`). The Supabase client is created once at module import time, but the mock's chain methods get disrupted by mock clearing in combination with ESM module caching in Vitest's `jsdom` environment.

**Fix applied:** Added `api/**` to exclude list in `vite.config.js` so these tests don't run with the main `jsdom` environment. They must be run with their dedicated config:
```bash
npx vitest run --config vitest.config.api.js
```

**Remaining fix needed:** Refactor the 9 API test files to use `vi.resetModules()` + re-import in `beforeEach`, or restructure Supabase usage in the API handlers to use a factory function instead of module-level singleton.

---

## HOW TO RUN TESTS

```bash
# Main test suite (all passing)
npm run test:run

# Watch mode
npm test

# With coverage
npm run test:coverage

# API tests (separate, some failing)
npx vitest run --config vitest.config.api.js

# E2E tests
npm run test:e2e

# Single file
npx vitest run src/test/sheetPolicy.test.ts
```

---

## COVERAGE AREAS

### ✅ Well covered
- Brand color constants
- Sheet access policy logic
- SOS context state machine
- Globe component rendering
- CSP header configuration
- Auth session persistence (E2E)

### ⚠️ Needs coverage
- Boot FSM state transitions (BootGuardContext)
- Sheet router (36+ sheets — zero tests)
- Persona switching (PersonaContext)
- Taps/woofs system (useTaps hook)
- Push notification flow
- Chat message sending
- Beacon creation flow
- Commerce / cart operations
- Marketplace listing CRUD
- Admin route protection

### ❌ API handler tests (broken mocks)
- All 9 new API test files need mock refactoring

---

## RECOMMENDED TEST IMPROVEMENTS

### Priority 1: Fix API test mocks
The 9 API test files need their Supabase mock pattern fixed. Template:

```js
// Instead of module-level singleton, use factory in each test
let mockSupabase;

beforeEach(() => {
  vi.resetModules();
  mockSupabase = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    // ...
  };
  vi.doMock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => mockSupabase)
  }));
  handler = (await import('./handler.js')).default;
});
```

### Priority 2: Add sheet tests
```bash
# Create: src/test/sheets/sheetRouter.test.tsx
# Create: src/test/sheets/sheetPolicy.test.ts (expand existing)
```

### Priority 3: Add boot FSM tests
```bash
# Create: src/test/contexts/bootGuard.test.ts
```
