import { Toaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from '@/lib/AuthContext';
import { ShopCartProvider } from '@/features/shop/cart/ShopCartContext';
import { I18nProvider } from '@/contexts/I18nContext';
import { WorldPulseProvider } from '@/contexts/WorldPulseContext';
import { BootGuardProvider, useBootGuard, BOOT_STATES } from '@/contexts/BootGuardContext';
import PublicShell from '@/components/shell/PublicShell';
import OSShell from '@/components/shell/OSShell';

/**
 * 🚨 HOTMESS GLOBE OS ARCHITECTURE GUARDRAILS 🚨
 * 
 * This app is a STATE-DRIVEN SPATIAL OPERATING SYSTEM, not a page-based website.
 * 
 * RULES (DO NOT BREAK):
 * 1. ❌ DO NOT add new pages to src/pages/ - Use modes + sheets instead
 * 2. ❌ DO NOT mount Globe without BootGuard gates passing
 * 3. ❌ DO NOT add UI-only state - Use Supabase as source of truth
 * 4. ❌ DO NOT bypass profile gates (age_confirmed, onboarding_complete, etc.)
 * 5. ❌ DO NOT create manual presence toggles - Use presenceAPI
 * 
 * ARCHITECTURE:
 * - BootGuard enforces profile gates before OS mounts
 * - PublicShell: Pre-auth routes (age, auth, legal)
 * - OSShell: Full OS runtime (Globe, HUD, modes, sheets)
 * - Presence: TTL-based, auto-expires via database
 * - Beacons: Unified Globe rendering (type: social, event, market, radio, safety)
 * 
 * See: /HOTMESS_OS_ARCHITECTURE.md for full documentation
 */


/**
 * BootGuardedApp - Routes based on boot state
 * 
 * Boot state machine:
 * - LOADING: Show loading spinner
 * - UNAUTHENTICATED: PublicShell (age, auth, legal)
 * - NEEDS_AGE: PublicShell → redirect to /age
 * - NEEDS_ONBOARDING: PublicShell → redirect to /onboarding
 * - SUSPENDED: Show suspension message
 * - READY: OSShell (full OS runtime with Globe, HUD, etc.)
 */
const BootGuardedApp = () => {
  const { bootState, isLoading, isUnauthenticated, needsAge, needsOnboarding, isSuspended, isReady } = useBootGuard();

  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-[#FF1493] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60 uppercase tracking-wider text-sm">HOTMESS GLOBE</p>
        </div>
      </div>
    );
  }

  // Suspended state
  if (isSuspended) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black p-4">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">⛔</div>
          <h1 className="text-2xl font-black uppercase mb-4 text-white">ACCOUNT SUSPENDED</h1>
          <p className="text-white/60 mb-6">
            Your account has been suspended. Please contact support for more information.
          </p>
          <a 
            href="mailto:support@hotmess.london" 
            className="inline-block px-6 py-3 bg-white text-black font-black uppercase hover:bg-[#FF1493] hover:text-white transition-colors"
          >
            CONTACT SUPPORT
          </a>
        </div>
      </div>
    );
  }

  // Public shell (UNAUTHENTICATED, NEEDS_AGE, NEEDS_ONBOARDING)
  if (isUnauthenticated || needsAge || needsOnboarding) {
    return <PublicShell bootState={bootState} />;
  }

  // OS runtime (READY)
  if (isReady) {
    return <OSShell />;
  }

  // Fallback (should never reach here)
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <p className="text-white/60">Unknown boot state: {bootState}</p>
    </div>
  );
};

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <BootGuardProvider>
            <WorldPulseProvider>
              <ShopCartProvider>
                <Router>
                  <NavigationTracker />
                  <BootGuardedApp />
                </Router>
              </ShopCartProvider>
            </WorldPulseProvider>
          </BootGuardProvider>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </I18nProvider>
  )
}

export default App
