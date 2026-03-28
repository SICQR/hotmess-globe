# HOTMESS OS — Missing Features Register

**Created:** 2026-02-20  
**Status:** Stage 0 Audit Complete

This document tracks all incomplete, buggy, or missing flows discovered during the Stage 0 hard audit.

---

## 1. AUTH FLOWS

### 1.1 Google OAuth
| Field | Value |
|-------|-------|
| **Symptom** | Google button exists but may fail silently if redirect URI not configured in Supabase |
| **Root Cause** | `Auth.jsx:513`, `HotmessSplash.jsx:396` call `auth.signInWithGoogle()` - requires Supabase dashboard config |
| **Files** | `src/pages/Auth.jsx`, `src/components/splash/HotmessSplash.jsx`, `src/components/utils/supabaseClient.jsx:1553` |
| **Fix Plan** | Verify Supabase Google provider enabled, redirect URIs match production domain |
| **Gate Test** | Click Google → redirect to Google → return to app → session exists |
| **Status** | ⚠️ NEEDS VERIFICATION |

### 1.2 Telegram Auth
| Field | Value |
|-------|-------|
| **Symptom** | Telegram widget loads but verification endpoint may not exist |
| **Root Cause** | `TelegramLogin.jsx:41` calls `/api/auth/telegram/verify` - endpoint needs to exist |
| **Files** | `src/components/auth/TelegramLogin.jsx`, `src/pages/Auth.jsx:544` |
| **Fix Plan** | Create `/api/auth/telegram/verify` endpoint OR remove Telegram UI if not supported |
| **Gate Test** | Click Telegram → authenticate → return with session |
| **Status** | ⚠️ NEEDS VERIFICATION (endpoint may not exist) |

### 1.3 Email/Password
| Field | Value |
|-------|-------|
| **Symptom** | Sign up / login forms exist, password reset flow exists |
| **Root Cause** | Multiple sign-up forms in `Auth.jsx:199` and `HotmessSplash.jsx:138` |
| **Files** | `src/pages/Auth.jsx`, `src/components/splash/HotmessSplash.jsx`, `src/pages/Login.jsx` |
| **Fix Plan** | Consolidate to single auth surface, verify email confirmation flow |
| **Gate Test** | Sign up → receive email → confirm → login → session exists |
| **Status** | ✅ WORKING (needs email template verification) |

### 1.4 Auth Listener Multiplication
| Field | Value |
|-------|-------|
| **Symptom** | Multiple `onAuthStateChange` listeners could cause duplicate side effects |
| **Root Cause** | 6 files contain `onAuthStateChange`: BootGuardContext, NowSignalContext, viewerState, bootGuard.ts, supabaseClient, Auth.jsx |
| **Files** | See list above |
| **Fix Plan** | BootGuardContext is canonical owner; others should react via useEffect on user state |
| **Gate Test** | Login → only one profile bootstrap, one cart merge, no duplicate realtime subscriptions |
| **Status** | ⚠️ NEEDS REFACTOR |

---

## 2. CART MERGE DUPLICATION

### 2.1 Multiple Cart Merge Calls
| Field | Value |
|-------|-------|
| **Symptom** | `mergeGuestCartToUser` called from 4+ locations |
| **Root Cause** | `Layout.jsx:166`, `AuthContext.jsx:70`, `Checkout.jsx:89`, `CartDrawer.jsx:52` |
| **Files** | All files above call merge independently |
| **Fix Plan** | Existing deduplication guard in `cartStorage.js:302-304` should prevent double merge |
| **Gate Test** | Login with guest cart → verify DB has merged items → only one merge logged |
| **Status** | ✅ GUARDED (but redundant calls exist) |

---

## 3. NAVIGATION / HARD RELOADS

### 3.1 window.location.href for Internal Routes
| Field | Value |
|-------|-------|
| **Symptom** | Tab switch or navigation causes full page reload |
| **Root Cause** | 60+ files use `window.location.href` for internal navigation |
| **Files** | `supabaseClient.jsx:502,509`, `ErrorBoundary.jsx:43`, `PageErrorBoundary.jsx:80`, many more |
| **Fix Plan** | `nav.ts` created with `useNav()` hook - migrate remaining locations |
| **Gate Test** | Navigate between tabs → no full reload, back button works |
| **Status** | ⚠️ PARTIALLY FIXED (nav.ts exists, migration incomplete) |

---

## 4. REALTIME CHANNEL MULTIPLICATION

### 4.1 No Centralized Cleanup
| Field | Value |
|-------|-------|
| **Symptom** | Channels may not close on logout, causing listener multiplication |
| **Root Cause** | 35+ channel subscriptions across codebase, cleanup scattered |
| **Files** | `Globe.jsx`, `ActivityStream.jsx`, `NowSignalContext.jsx`, `WorldPulseContext.jsx`, etc. |
| **Fix Plan** | Domain layer (`lib/data/*.ts`) has cleanup functions - need logout hook to call them all |
| **Gate Test** | Login → navigate → logout → verify all channels closed |
| **Status** | ⚠️ NEEDS CENTRALIZED CLEANUP |

---

## 5. PROFILE OPENING

### 5.1 Multiple Profile Open Patterns
| Field | Value |
|-------|-------|
| **Symptom** | Profile opens inconsistently (sometimes sheet, sometimes route) |
| **Root Cause** | Some components use `useProfileOpener`, others navigate directly |
| **Files** | `lib/profile.ts` (canonical), `Globe.jsx`, `ProfilesGrid.tsx`, `ProfileCard.tsx` |
| **Fix Plan** | `useProfileOpener` hook created - ensure all profile opens go through it |
| **Gate Test** | Grid click → sheet opens; Globe click → sheet opens; Deep link → route renders |
| **Status** | ✅ HOOK EXISTS (adoption incomplete) |

---

## 6. MARKET / PRELOVED

### 6.1 Preloved Table May Not Exist
| Field | Value |
|-------|-------|
| **Symptom** | `preloved_listings` table referenced but may not be in schema |
| **Root Cause** | `lib/data/market.ts` queries `preloved_listings` table |
| **Files** | `lib/data/market.ts` |
| **Fix Plan** | Verify table exists in Supabase, create if not |
| **Gate Test** | Create listing → view in market → edit → delete |
| **Status** | ⚠️ NEEDS VERIFICATION |

### 6.2 Shopify Proxy
| Field | Value |
|-------|-------|
| **Symptom** | `/api/shopify/products` endpoint may return errors |
| **Root Cause** | Vercel serverless proxy needs Shopify credentials |
| **Files** | `api/shopify/*.js` (if exists), `lib/data/market.ts` |
| **Fix Plan** | Verify Shopify Storefront API credentials in Vercel env |
| **Gate Test** | Load market → Shopify products appear → add to cart → checkout |
| **Status** | ⚠️ NEEDS VERIFICATION |

---

## 7. GLOBE / PULSE

### 7.1 Globe Remount on Navigation
| Field | Value |
|-------|-------|
| **Symptom** | Globe may remount when switching tabs, losing realtime connections |
| **Root Cause** | Globe not mounted at AppShell level (currently inside route) |
| **Files** | `src/pages/Globe.jsx`, `src/App.jsx` |
| **Fix Plan** | Move Globe to AppShell level, control visibility by route |
| **Gate Test** | Switch Pulse → Ghosted → Pulse → Globe still has same channels |
| **Status** | ⚠️ NEEDS IMPLEMENTATION |

---

## 8. RADIO

### 8.1 Player Persistence
| Field | Value |
|-------|-------|
| **Symptom** | Radio player may stop when navigating away from Radio page |
| **Root Cause** | Player component mounted inside Radio route |
| **Files** | `src/pages/Music.jsx`, radio player components |
| **Fix Plan** | Create persistent mini-player at AppShell level |
| **Gate Test** | Play stream → navigate to Market → stream continues |
| **Status** | ⚠️ NEEDS IMPLEMENTATION |

---

## 9. UI TOKEN CONSISTENCY

### 9.1 Hardcoded Colors/Spacing
| Field | Value |
|-------|-------|
| **Symptom** | 2000+ hardcoded hex values, inconsistent spacing |
| **Root Cause** | No unified token system enforced |
| **Files** | Throughout codebase |
| **Fix Plan** | `src/styles/tokens.css` created - gradual migration |
| **Gate Test** | Primary surfaces use token vars, not hardcoded values |
| **Status** | ⚠️ TOKENS CREATED, MIGRATION NEEDED |

---

## 10. OVERLAY / SHEET SYSTEM

### 10.1 Sheet Mounted Inside Routes
| Field | Value |
|-------|-------|
| **Symptom** | Sheet state lost on route change |
| **Root Cause** | SheetProvider inside Layout.jsx (per RUNLOG) |
| **Files** | `src/Layout.jsx`, `src/App.jsx` |
| **Fix Plan** | Move SheetProvider outside route boundary (prior fix applied) |
| **Gate Test** | Open sheet → navigate → sheet still visible OR correctly closed |
| **Status** | ✅ FIXED (per stabilization work) |

---

## AUTHORITY MATRIX

| System | Canonical Owner | Location | Status |
|--------|-----------------|----------|--------|
| Navigation | React Router | `App.jsx` routes | ⚠️ 60+ window.location bypasses |
| Overlay Stack | SheetContext | `src/os/sheet-registry.ts` | ✅ Single authority |
| Auth Listener | BootGuardContext | `src/contexts/BootGuardContext.jsx` | ⚠️ 5 other listeners exist |
| Realtime | Scattered | Multiple contexts | ⚠️ Needs centralized cleanup |
| Profiles | useProfileOpener | `src/lib/profile.ts` | ✅ Hook exists |
| Market | lib/data/market.ts | Domain layer | ✅ Unified model |
| Cart | cartStorage.js | `src/components/marketplace/cartStorage.js` | ✅ With merge guard |
| Globe | GlobeContext | `src/contexts/GlobeContext.jsx` | ⚠️ Remounts on navigation |

---

## PRIORITY ORDER

1. **P0 - Blocking:** Auth flows verification, Telegram endpoint
2. **P1 - High:** Globe persistence, Realtime cleanup, Navigation migration
3. **P2 - Medium:** UI tokens migration, Radio persistence, Preloved table
4. **P3 - Low:** Consolidate duplicate auth listeners

---

## NEXT STEPS

1. Create remaining required docs (FLOW_MAP, UI_WIREFRAME, etc.)
2. Proceed to Stage 1: OS Shell implementation
3. Verify all auth flows work end-to-end
4. Implement persistent globe backdrop
