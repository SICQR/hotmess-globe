import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Home, Globe as GlobeIcon, ShoppingBag, Users, Settings, Menu, X, Calendar as CalendarIcon, Search, Shield, Radio as RadioIcon, ChevronRight } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { updatePresence } from '@/api/presence';
import SafetyFAB from '@/components/safety/SafetyFAB';
import NotificationBadge from '@/components/messaging/NotificationBadge';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import GlobalSearch from '@/components/search/GlobalSearch';
import OfflineIndicator from '@/components/ui/OfflineIndicator';
import EventReminders from '@/components/events/EventReminders';
import { TaxonomyProvider } from '@/components/taxonomy/provider';
// Legacy RadioProvider removed — App.jsx wraps with new RadioContext
import ErrorBoundary from '@/components/error/ErrorBoundary';
import PageErrorBoundary from '@/components/error/PageErrorBoundary';
import SkipToContent from '@/components/accessibility/SkipToContent';
import { useKeyboardNav } from '@/components/accessibility/KeyboardNav';
import { A11yAnnouncer } from '@/components/accessibility/KeyboardNav';
import WelcomeTour from '@/components/onboarding/WelcomeTour';
import RightNowNotifications from '@/components/discovery/RightNowNotifications';
import { useRadio } from '@/contexts/RadioContext';
import { mergeGuestCartToUser } from '@/components/marketplace/cartStorage';
// CookieConsent removed — handled by CookieBanner in App.jsx
import UnifiedCartDrawer from '@/components/marketplace/UnifiedCartDrawer';
import BottomNav from '@/components/navigation/BottomNav';
import { TonightModeProvider } from '@/hooks/useTonightMode';
import { useOSURLSync } from '@/os';

      const PRIMARY_NAV = [
        { name: 'HOME', icon: Home, path: 'Home', href: '/' },
        { name: 'PULSE', icon: GlobeIcon, path: 'Pulse', href: '/pulse' },
        { name: 'GHOSTED', icon: Users, path: 'Ghosted', href: '/ghosted' },
        { name: 'SHOP', icon: ShoppingBag, path: 'Marketplace', href: '/market' },
        { name: 'MORE', icon: Menu, path: 'More', href: '/more' },
      ];

      const SECONDARY_NAV = [];

// OS mode paths — Layout is a pass-through on these (OSBottomNav + mode components handle the chrome)
const OS_MODE_PATHS = ['/', '/ghosted', '/pulse', '/market', '/more', '/profile'];
const isOSModePath = (p) =>
  OS_MODE_PATHS.some((m) => p === m || p.startsWith(m + '/'));

function LayoutInner({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { togglePlay: toggleRadio, isPlaying: isRadioOpen } = useRadio();

  // Enable OS URL sync
  useOSURLSync();

  const pathname = (location?.pathname || '').toLowerCase();
  const isMarketRoute =
    pathname === '/market' ||
    pathname.startsWith('/market/') ||
    pathname === '/cart' ||
    pathname.startsWith('/p/');

  const presenceLastSentRef = useRef({
    ts: 0,
    lat: null,
    lng: null,
  });

  // Enable keyboard navigation
  useKeyboardNav();

  // SW registration handled by usePushNotifications (OSArchitecture).
  // Dev only: unregister stale SWs so cached bundles don't mask code fixes.
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !import.meta.env.DEV) return;
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // NOTE: Age verification is now handled by BootRouter/BootGuardContext
        // This Layout only runs when bootState is READY

        const { data: { session } } = await supabase.auth.getSession();
        const isAuth = !!session;
        if (!isAuth) {
          setUser(null);
          return;
        }

        let { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setUser(null);
          return;
        }

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        let currentUser = {
          ...user,
          ...(profile || {}),
          auth_user_id: user.id,
          email: user.email || profile?.email,
        };

        // If we have a session but cannot load the user record, treat this as unauthenticated
        // for gating purposes (prevents redirect loops into consent/profile flows).
        if (!currentUser) {
          setUser(null);
          return;
        }

        // If the user already completed the AgeGate AND granted browser
        // location permission, auto-apply the equivalent profile consent flags once.
        // This prevents loops where the app keeps redirecting to AccountConsents/OnboardingGate.
        try {
          const AGE_KEY_CHECK = 'hm_age_confirmed_v1';
          const ageVerifiedLocal = localStorage.getItem(AGE_KEY_CHECK) === 'true';
          const locationConsent = sessionStorage.getItem('location_consent') === 'true';
          const locationPermission = sessionStorage.getItem('location_permission');
          const hasGrantedLocation = locationPermission === 'granted';

          const markerKey = currentUser?.email ? `auto_consents_applied_for:${currentUser.email}` : null;
          const alreadyApplied = markerKey ? sessionStorage.getItem(markerKey) === '1' : false;

          const needsConsents =
            !currentUser?.consent_accepted ||
            !currentUser?.has_agreed_terms ||
            !currentUser?.has_consented_data ||
            !currentUser?.has_consented_gps;

          if (!alreadyApplied && needsConsents && ageVerifiedLocal && locationConsent && hasGrantedLocation) {
            const updateData = {
              consent_accepted: true,
              consent_age: true,
              consent_location: true,
              consent_date: new Date().toISOString(),

              // These are the required flags checked by Layout/OnboardingGate.
              has_agreed_terms: true,
              has_consented_data: true,
              has_consented_gps: true,
            };

            await supabase.auth.updateUser({ data: updateData });
            const { data: updatedProfile } = await supabase.from('profiles').update(updateData).eq('id', user.id).select().single();

            if (markerKey) sessionStorage.setItem(markerKey, '1');
            currentUser = {
              ...user,
              ...(updatedProfile || {}),
              auth_user_id: user.id,
              email: user.email || updatedProfile?.email,
            };
          }
        } catch {
          // ignore
        }

        setUser(currentUser);

        // Merge any guest cart into the authenticated cart (once per user per session)
        if (currentUser?.email) {
          const mergedKey = `guest_cart_merged_for:${currentUser.email}`;
          let alreadyMerged = false;
          try {
            alreadyMerged = !!sessionStorage.getItem(mergedKey);
          } catch {
            alreadyMerged = false;
          }

          if (!alreadyMerged) {
            mergeGuestCartToUser({ currentUser })
              .then(() => {
                try {
                  sessionStorage.setItem(mergedKey, '1');
                } catch {
                  // ignore
                }
              })
              .catch(() => {
                // Non-fatal; keep guest cart local if merge fails.
              });
          }
        }

        // GATEKEEPER: Block all access until consent_accepted is true
        if (currentPageName !== 'AccountConsents' && currentPageName !== 'AgeGate' && !currentUser?.consent_accepted) {
          navigate(createPageUrl('AccountConsents'));
          return;
        }

        // Onboarding gate: require terms + data consent.
        // GPS consent is optional and should only gate location-based features.
        if (
          currentPageName !== 'OnboardingGate' &&
          currentPageName !== 'AccountConsents' &&
          currentPageName !== 'AgeGate' &&
          currentPageName !== 'Settings' &&
          (!currentUser?.has_agreed_terms || !currentUser?.has_consented_data)
        ) {
          navigate(createPageUrl('OnboardingGate'));
          return;
        }

        // Check if profile setup is incomplete
        if (
          currentPageName !== 'Profile' &&
          currentPageName !== 'Settings' &&
          currentPageName !== 'OnboardingGate' &&
          currentPageName !== 'AccountConsents' &&
          currentPageName !== 'AgeGate' &&
          (!currentUser?.full_name || !currentUser?.avatar_url)
        ) {
          const next = encodeURIComponent(`${window.location.pathname}${window.location.search || ''}`);
          navigate(`${createPageUrl('Profile')}?next=${next}`);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
        setUser(null);
      }
    };
    fetchUser();
  }, [currentPageName]);

  // Foreground presence/location updates (production behavior):
  // - Only when authenticated AND GPS consented.
  // - Send if moved >200m OR at least 60s since last send.
  useEffect(() => {
    if (!user?.has_consented_gps) return;
    if (!('geolocation' in navigator)) return;

    let intervalId = null;
    let cancelled = false;
    let inFlight = false;

    const shouldSend = ({ lat, lng }) => {
      const now = Date.now();
      const last = presenceLastSentRef.current;
      const elapsedMs = now - (last.ts || 0);
      if (!Number.isFinite(last.lat) || !Number.isFinite(last.lng)) return true;

      const toRad = (deg) => (deg * Math.PI) / 180;
      const R = 6371000;
      const dLat = toRad(lat - last.lat);
      const dLng = toRad(lng - last.lng);
      const lat1 = toRad(last.lat);
      const lat2 = toRad(lat);
      const sinDLat = Math.sin(dLat / 2);
      const sinDLng = Math.sin(dLng / 2);
      const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
      const movedM = 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

      return movedM >= 200 || elapsedMs >= 60_000;
    };

    const onPosition = async (pos) => {
      if (cancelled) return;
      if (document.visibilityState !== 'visible') return;
      if (inFlight) return;

      const lat = pos?.coords?.latitude;
      const lng = pos?.coords?.longitude;
      const accuracy = pos?.coords?.accuracy;
      const heading = pos?.coords?.heading;
      const speed = pos?.coords?.speed;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      if (!shouldSend({ lat, lng })) return;

      inFlight = true;
      try {
        await updatePresence({ lat, lng, accuracy, heading, speed });
        presenceLastSentRef.current = { ts: Date.now(), lat, lng };
      } catch {
        // Non-fatal: presence should not break navigation.
      } finally {
        inFlight = false;
      }
    };

    const onError = () => {
      // Ignore: user can revoke permission at any time.
    };

    const poll = () => {
      if (cancelled) return;
      if (document.visibilityState !== 'visible') return;

      try {
        navigator.geolocation.getCurrentPosition(
          onPosition,
          (err) => {
            // 1 = PERMISSION_DENIED
            // Stop polling if permission is explicitly denied to avoid repeated CoreLocation noise.
            if (err?.code === 1) {
              if (intervalId != null) clearInterval(intervalId);
              intervalId = null;
            }
            onError(err);
          },
          {
            enableHighAccuracy: false,
            maximumAge: 30_000,
            timeout: 10_000,
          }
        );
      } catch {
        // ignore
      }
    };

    // Run immediately, then poll (low frequency) to keep presence roughly fresh.
    poll();
    intervalId = setInterval(poll, 60_000);

    return () => {
      cancelled = true;
      if (intervalId != null) {
        try {
          clearInterval(intervalId);
        } catch {
          // ignore
        }
      }
    };
  }, [user?.has_consented_gps]);

  // On OS mode routes, render children only — no old header/nav/chrome
  // (placed after all hooks to satisfy Rules of Hooks)
  // On OS mode routes, render children with proper safety padding so they aren't hidden by bars
  if (isOSModePath(pathname)) {
    return (
      <div className="flex flex-col min-h-screen bg-black overflow-x-hidden transition-all duration-300">
        {/* Top spacer for the marquee/banner - Balanced with App.jsx offset */}
        <div className="h-10 flex-shrink-0" /> 

        <main className="flex-1 w-full max-w-lg mx-auto md:ml-64 relative px-4 md:px-0">
          {children}
        </main>

        {/* Bottom spacer for the navigation bar - Balanced with App.jsx offset */}
        <div className="h-20 flex-shrink-0" />
      </div>
    );
  }

  const isActive = (pageName) => currentPageName === pageName;

  const isPulsePage = currentPageName === 'Pulse';
  const isChromelessPage =
    currentPageName === 'Auth' ||
    currentPageName === 'AgeGate' ||
    currentPageName === 'OnboardingGate' ||
    currentPageName === 'AccountConsents';

  const shouldShowChrome = !isPulsePage && !isChromelessPage;

  return (
    <ErrorBoundary>
        <TaxonomyProvider>
          <SkipToContent />
          <A11yAnnouncer />
          <OfflineIndicator />
          {user && currentPageName === 'Home' && <WelcomeTour />}
        <div className="h-full overflow-y-auto bg-black text-white">
      {shouldShowChrome && (
        <>
          {/* Mobile Header */}
          <div className="md:hidden fixed top-[44px] left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/10 pt-[env(safe-area-inset-top)]">
            <div className="flex items-center justify-between px-4 py-3">
              <Link to={createPageUrl('Home')} className="text-xl font-black tracking-tight">
                HOT<span className="text-[#C8962C]">MESS</span>
              </Link>
              <div className="flex items-center gap-2">
                <Link
                  to={createPageUrl('Care')}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  aria-label="Open care"
                >
                  <Shield className="w-5 h-5" />
                </Link>
                <Link
                  to={createPageUrl('Settings')}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  aria-label="Open settings"
                >
                  <Settings className="w-5 h-5" />
                </Link>
                <button
                  onClick={() => setShowSearch(true)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  aria-label="Open search"
                  data-search-trigger
                >
                  <Search className="w-5 h-5" />
                </button>
                {isMarketRoute ? <UnifiedCartDrawer currentUser={user} /> : null}
                <button
                  onClick={toggleRadio}
                  className={`p-2 rounded-lg transition-colors ${isRadioOpen ? 'bg-[#C8962C] text-white' : 'bg-white/5 hover:bg-white/10'}`}
                  aria-label="Toggle radio"
                >
                  <RadioIcon className="w-5 h-5" />
                </button>
                {user && <NotificationCenter currentUser={user} />}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-40 bg-black/95 backdrop-blur-xl pt-[calc(7.5rem+env(safe-area-inset-top))] overflow-y-auto">
              <div className="flex flex-col p-4 pb-32">
                {/* Mobile Profile Section */}
                {user && (
                  <div 
                    className="flex items-center gap-3 px-3 py-4 mb-6 bg-white/5 border border-white/10 rounded-2xl"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-[#C8962C] to-[#C8962C] flex items-center justify-center flex-shrink-0 border-2 border-white rounded-full overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold">{user.full_name?.[0] || 'U'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-black truncate text-white">{user.full_name}</p>
                    </div>
                  </div>
                )}

                {/* Admin Link - Mobile */}
                {user && user.role === 'admin' && (
                  <Link
                    to={createPageUrl('AdminDashboard')}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 mb-4 transition-all border-2 bg-red-600/20 border-red-600 text-red-400 hover:bg-red-600/30"
                  >
                    <Shield className="w-4 h-4" />
                    <span className="font-black uppercase tracking-wider text-xs">ADMIN</span>
                  </Link>
                )}

                {/* Promote to Admin Link - Mobile */}
                {user && user.role !== 'admin' && (
                  <Link
                    to={createPageUrl('PromoteToAdmin')}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 mb-4 transition-all border-2 bg-yellow-600/20 border-yellow-600 text-yellow-400 hover:bg-yellow-600/30"
                  >
                    <Shield className="w-4 h-4" />
                    <span className="font-black uppercase tracking-wider text-xs">BECOME ADMIN</span>
                  </Link>
                )}

                <div className="mb-2">
                  <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2 px-3">PRIMARY</p>
                  {PRIMARY_NAV.map(({ name, icon: Icon, path, href, showBadge }) => (
                    <Link
                      key={path}
                      to={href || createPageUrl(path)}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 mb-1 transition-all
                        ${isActive(path)
                          ? 'bg-[#C8962C] text-black border-2 border-[#C8962C]'
                          : 'text-white/60 hover:text-white hover:bg-white/5 border-2 border-white/10'
                        }
                      `}
                    >
                      {showBadge && user ? (
                        <NotificationBadge user={user} />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                      <span className="font-black uppercase tracking-wider text-xs">{name}</span>
                    </Link>
                  ))}
                </div>
                <div>
                  <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2 px-3 mt-4">MORE</p>
                  {SECONDARY_NAV.map(({ name, icon: Icon, path }) => (
                    <Link
                      key={path}
                      to={createPageUrl(path)}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2 mb-1 transition-all
                        ${isActive(path)
                          ? 'text-[#C8962C] border-l-2 border-[#C8962C]'
                          : 'text-white/40 hover:text-white/60 border-l-2 border-white/5'
                        }
                      `}
                    >
                      <Icon className="w-3 h-3" />
                      <span className="font-bold uppercase tracking-wider text-[10px]">{name}</span>
                    </Link>
                  ))}
                </div>
                <Link 
                  to={createPageUrl('Settings')}
                  onClick={() => setMobileMenuOpen(false)}
                  className="mt-6 flex items-center gap-2 px-3 py-2 text-white/40 hover:text-white/60 border-t border-white/10 pt-4"
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider font-bold">Settings</span>
                </Link>
                {user ? (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      supabase.auth.signOut();
                    }}
                    className="w-full text-left px-3 py-2 text-white/60 hover:text-white border border-white/10 text-xs uppercase tracking-wider font-bold mt-2"
                  >
                    Logout
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      window.location.href = '/auth';
                    }}
                    className="w-full text-left px-3 py-2 bg-[#C8962C] hover:bg-[#B07F1F] text-black text-xs uppercase tracking-wider font-bold mt-2"
                  >
                    Login
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Desktop Sidebar - Smart Nav */}
          <div className="hidden md:flex md:fixed md:left-0 md:top-11 md:bottom-20 md:w-64 md:flex-col md:bg-black md:backdrop-blur-xl md:border-r md:border-white/10 md:z-40 pb-4">
            <div className="p-4 border-b-2 border-white/20">
              <div className="flex items-center justify-between mb-1">
                <Link to={createPageUrl('Home')} className="text-xl font-black tracking-tight">
                  HOT<span className="text-[#C8962C]">MESS</span>
                </Link>
                <div className="flex items-center gap-2">
                  <Link
                    to={createPageUrl('Care')}
                    className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                    aria-label="Open care"
                  >
                    <Shield className="w-4 h-4" />
                  </Link>
                  <Link
                    to={createPageUrl('Settings')}
                    className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                    aria-label="Open settings"
                  >
                    <Settings className="w-4 h-4" />
                  </Link>
                  {isMarketRoute ? <UnifiedCartDrawer currentUser={user} /> : null}
                  <button
                    onClick={toggleRadio}
                    className={`p-1.5 rounded-lg transition-colors ${isRadioOpen ? 'bg-[#C8962C] text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    aria-label="Toggle radio"
                  >
                    <RadioIcon className="w-4 h-4" />
                  </button>
                  {user && <NotificationCenter currentUser={user} />}
                </div>
              </div>
              <p className="text-[8px] text-white/40 uppercase tracking-wider mt-1">LONDON OS</p>
            </div>

            <nav className="flex-1 px-2 py-4 overflow-y-auto">
              {/* Admin Link */}
              {user && user.role === 'admin' && (
                <Link
                  to={createPageUrl('AdminDashboard')}
                  className="flex items-center gap-2 px-3 py-2.5 mb-4 transition-all border-2 bg-red-600/20 border-red-600 text-red-400 hover:bg-red-600/30"
                >
                  <Settings className="w-4 h-4" />
                  <span className="font-black uppercase tracking-wider text-[10px]">ADMIN</span>
                </Link>
              )}

              {/* Promote to Admin Link */}
              {user && user.role !== 'admin' && (
                <Link
                  to={createPageUrl('PromoteToAdmin')}
                  className="flex items-center gap-2 px-3 py-2.5 mb-4 transition-all border-2 bg-yellow-600/20 border-yellow-600 text-yellow-400 hover:bg-yellow-600/30"
                >
                  <Settings className="w-4 h-4" />
                  <span className="font-black uppercase tracking-wider text-[10px]">BECOME ADMIN</span>
                </Link>
              )}

              {/* Primary Navigation */}
              <div className="mb-6">
                {PRIMARY_NAV.map(({ name, icon: Icon, path, href, showBadge }) => (
                  <Link
                    key={path}
                    to={href || createPageUrl(path)}
                    className={`
                      flex items-center gap-2 px-3 py-2.5 mb-1 transition-all border-2
                      ${isActive(path)
                        ? 'bg-[#C8962C] text-black border-[#C8962C] shadow-[0_0_10px_#C8962C]'
                        : 'text-white/60 hover:text-white hover:bg-white/5 border-white/10 hover:border-white/30'
                      }
                    `}
                  >
                    {showBadge && user ? (
                      <NotificationBadge user={user} />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                    <span className="font-black uppercase tracking-wider text-[10px]">{name}</span>
                  </Link>
                ))}
                </div>
                </nav>

            <div className="p-3 border-t-2 border-white/20">
              {/* Profile/Auth section maintained at bottom */}
              {user ? (
                <>
                  <Link to={createPageUrl('Settings')} className="flex items-center gap-2 hover:opacity-80 transition-opacity mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#C8962C] to-[#C8962C] flex items-center justify-center flex-shrink-0 border-2 border-white rounded-full overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold">{user.full_name?.[0] || 'U'}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black truncate">{user.full_name}</p>
                    </div>
                    <Settings className="w-3 h-3 text-white/40" />
                  </Link>
                  <button
                    onClick={() => supabase.auth.signOut()}
                    className="w-full px-3 py-2 text-white/60 hover:text-white hover:bg-white/5 border border-white/10 text-xs uppercase tracking-wider font-bold transition-all"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { window.location.href = '/auth'; }}
                  className="w-full px-3 py-2 bg-[#C8962C] hover:bg-[#B07F1F] text-black text-xs uppercase tracking-wider font-bold transition-all"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <main 
        id="main-content" 
        className={
          isPulsePage
            ? 'min-w-0'
            : shouldShowChrome
              ? 'md:ml-64 pt-[calc(4rem+env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] md:pt-14 md:pb-0 min-w-0'
              : 'min-w-0'
        }
        role="main"
      >
        <PageErrorBoundary>
          {children}
        </PageErrorBoundary>
      </main>

      {/* Safety FAB - replaces old Panic Button */}
      {user && <SafetyFAB />}

      {/* Global Search */}
      {user && <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />}

      {/* Event Reminders Background Service */}
      {user && <EventReminders currentUser={user} />}

      {/* Right Now Match Notifications */}
      {user && <RightNowNotifications currentUser={user} />}

      {/* Legacy PersistentRadioPlayer removed — RadioMiniPlayer in App.jsx handles playback */}

      {/* Mobile Bottom Navigation — hidden on OS mode routes (OSBottomNav handles those) */}
      {!['/','','/ghosted','/pulse','/radio','/profile'].includes(pathname.replace(/\/$/, '') || '/') && (
        <BottomNav currentPageName={currentPageName} user={user} />
      )}

      {/* Cookie consent handled by CookieBanner in App.jsx — do not duplicate */}
    </div>
        </TaxonomyProvider>
      </ErrorBoundary>
  );
}

export default function Layout(props) {
  return (
    <TonightModeProvider>
      <LayoutInner {...props} />
    </TonightModeProvider>
  );
}

