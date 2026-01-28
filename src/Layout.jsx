import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createPageUrl } from './utils';
import { Home, Globe as GlobeIcon, ShoppingBag, Users, Settings, Menu, X, Calendar as CalendarIcon, Search, Shield } from 'lucide-react';
import { base44 } from '@/components/utils/supabaseClient';
import { updatePresence } from '@/api/presence';
import PanicButton from '@/components/safety/PanicButton';
import NotificationBadge from '@/components/messaging/NotificationBadge';
import GlobalAssistant from '@/components/ai/GlobalAssistant';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import GlobalSearch from '@/components/search/GlobalSearch';
import OfflineIndicator from '@/components/ui/OfflineIndicator';
import EventReminders from '@/components/events/EventReminders';
import { TaxonomyProvider } from '@/components/taxonomy/provider';
import { RadioProvider } from '@/components/shell/RadioContext';
import ErrorBoundary from '@/components/error/ErrorBoundary';
import PageErrorBoundary from '@/components/error/PageErrorBoundary';
import SkipToContent from '@/components/accessibility/SkipToContent';
import { useKeyboardNav } from '@/components/accessibility/KeyboardNav';
import { A11yAnnouncer } from '@/components/accessibility/KeyboardNav';
import WelcomeTour from '@/components/onboarding/WelcomeTour';
import RightNowNotifications from '@/components/discovery/RightNowNotifications';
import PersistentRadioPlayer from '@/components/shell/PersistentRadioPlayer';
import { Radio as RadioIcon } from 'lucide-react';
import { useRadio } from '@/components/shell/RadioContext';
import { mergeGuestCartToUser } from '@/components/marketplace/cartStorage';
import CookieConsent from '@/components/legal/CookieConsent';
import UnifiedCartDrawer from '@/components/marketplace/UnifiedCartDrawer';

      const PRIMARY_NAV = [
        { name: 'HOME', icon: Home, path: 'Home' },
        { name: 'PULSE', icon: GlobeIcon, path: 'Pulse' },
        { name: 'EVENTS', icon: CalendarIcon, path: 'Events' },
        { name: 'MARKET', icon: ShoppingBag, path: 'Marketplace', href: '/market' },
        { name: 'SOCIAL', icon: Users, path: 'Social', showBadge: true },
        { name: 'MUSIC', icon: RadioIcon, path: 'Music' },
        { name: 'MORE', icon: Menu, path: 'More' },
      ];

      const SECONDARY_NAV = [];

function LayoutInner({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const location = useLocation();
  const { toggleRadio, isRadioOpen } = useRadio();

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

  // Service worker:
  // - Enable in production for offline support.
  // - In dev, explicitly unregister any existing SW so stale cached bundles
  //   can't keep showing old runtime errors after code fixes.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (import.meta.env.DEV) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {
          // ignore
        });
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed, continue without offline support
    });
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Check age verification first (session-based)
        let ageVerified = null;
        try {
          ageVerified = sessionStorage.getItem('age_verified');
        } catch {
          ageVerified = null;
        }
        if (!ageVerified && currentPageName !== 'AgeGate') {
          window.location.href = createPageUrl('AgeGate') + `?next=${encodeURIComponent(window.location.pathname)}`;
          return;
        }

        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          setUser(null);
          return;
        }

        let currentUser = await base44.auth.me();

        // If we have a session but cannot load the user record, treat this as unauthenticated
        // for gating purposes (prevents redirect loops into consent/profile flows).
        if (!currentUser) {
          setUser(null);
          return;
        }

        // If the user already completed the AgeGate (session-based) AND granted browser
        // location permission, auto-apply the equivalent profile consent flags once.
        // This prevents loops where the app keeps redirecting to AccountConsents/OnboardingGate.
        try {
          const ageVerified = sessionStorage.getItem('age_verified') === 'true';
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

          if (!alreadyApplied && needsConsents && ageVerified && locationConsent && hasGrantedLocation) {
            await base44.auth.updateMe({
              consent_accepted: true,
              consent_age: true,
              consent_location: true,
              consent_date: new Date().toISOString(),

              // These are the required flags checked by Layout/OnboardingGate.
              has_agreed_terms: true,
              has_consented_data: true,
              has_consented_gps: true,
            });

            if (markerKey) sessionStorage.setItem(markerKey, '1');
            currentUser = await base44.auth.me();
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
          window.location.href = createPageUrl('AccountConsents');
          return;
        }

        // Onboarding gate: require terms + data consent.
        // GPS consent is optional and should only gate location-based features.
        if (
          currentPageName !== 'OnboardingGate' &&
          currentPageName !== 'AccountConsents' &&
          currentPageName !== 'AgeGate' &&
          (!currentUser?.has_agreed_terms || !currentUser?.has_consented_data)
        ) {
          window.location.href = createPageUrl('OnboardingGate');
          return;
        }

        // Check if profile setup is incomplete
        if (
          currentPageName !== 'Profile' &&
          currentPageName !== 'OnboardingGate' &&
          currentPageName !== 'AccountConsents' &&
          currentPageName !== 'AgeGate' &&
          (!currentUser?.full_name || !currentUser?.avatar_url)
        ) {
          const next = encodeURIComponent(`${window.location.pathname}${window.location.search || ''}`);
          window.location.href = `${createPageUrl('Profile')}?next=${next}`;
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
        <div className="min-h-[100svh] bg-black text-white">
      {shouldShowChrome && (
        <>
          {/* Mobile Header */}
          <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/10 pt-[env(safe-area-inset-top)]">
            <div className="flex items-center justify-between px-4 py-3">
              <Link to={createPageUrl('Home')} className="text-xl font-black tracking-tight">
                HOTMESS
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
                  className={`p-2 rounded-lg transition-colors ${isRadioOpen ? 'bg-[#B026FF] text-white' : 'bg-white/5 hover:bg-white/10'}`}
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
            <div className="md:hidden fixed inset-0 z-40 bg-black/95 backdrop-blur-xl pt-[calc(4rem+env(safe-area-inset-top))]">
              <div className="flex flex-col p-4">
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
                          ? 'bg-[#FF1493] text-black border-2 border-[#FF1493]'
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
                          ? 'text-[#FF1493] border-l-2 border-[#FF1493]'
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
                      base44.auth.logout();
                    }}
                    className="w-full text-left px-3 py-2 text-white/60 hover:text-white border border-white/10 text-xs uppercase tracking-wider font-bold mt-2"
                  >
                    Logout
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      base44.auth.redirectToLogin();
                    }}
                    className="w-full text-left px-3 py-2 bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black text-xs uppercase tracking-wider font-bold mt-2"
                  >
                    Login
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Desktop Sidebar - Smart Nav */}
          <div className="hidden md:flex md:fixed md:left-0 md:top-0 md:bottom-0 md:w-56 md:flex-col md:bg-black md:backdrop-blur-xl md:border-r-2 md:border-white md:z-40">
            <div className="p-4 border-b-2 border-white/20">
              <div className="flex items-center justify-between mb-1">
                <Link to={createPageUrl('Home')} className="text-xl font-black tracking-tight">
                  HOT<span className="text-[#FF1493]">MESS</span>
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
                    className={`p-1.5 rounded-lg transition-colors ${isRadioOpen ? 'bg-[#B026FF] text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
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
                        ? 'bg-[#FF1493] text-black border-[#FF1493] shadow-[0_0_10px_#FF1493]'
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
              <div className="mb-3 border border-white/10 bg-white/5 p-2">
                <p className="text-[9px] text-white/40 font-black uppercase tracking-widest mb-2">Quick Links</p>
                <div className="grid grid-cols-2 gap-2">
                  <Link to={createPageUrl('Radio')} className="flex items-center gap-2 px-2 py-2 border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all">
                    <RadioIcon className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Radio</span>
                  </Link>
                  <Link to={createPageUrl('Care')} className="flex items-center gap-2 px-2 py-2 border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all">
                    <Shield className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Care</span>
                  </Link>
                  <Link to={createPageUrl('Settings')} className="flex items-center gap-2 px-2 py-2 border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all">
                    <Settings className="w-3 h-3" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Settings</span>
                  </Link>
                </div>
              </div>
              {user ? (
                <>
                  <Link to={createPageUrl('Settings')} className="flex items-center gap-2 hover:opacity-80 transition-opacity mb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center flex-shrink-0 border-2 border-white">
                      <span className="text-xs font-bold">{user.full_name?.[0] || 'U'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black truncate">{user.full_name}</p>
                      <p className="text-[9px] text-[#FFEB3B] font-mono">LVL {Math.floor((user.xp || 0) / 1000) + 1} • {user.xp || 0} XP</p>
                    </div>
                    <Settings className="w-3 h-3 text-white/40" />
                  </Link>
                  <button
                    onClick={() => base44.auth.logout()}
                    className="w-full px-3 py-2 text-white/60 hover:text-white hover:bg-white/5 border border-white/10 text-xs uppercase tracking-wider font-bold transition-all"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => base44.auth.redirectToLogin()}
                  className="w-full px-3 py-2 bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black text-xs uppercase tracking-wider font-bold transition-all"
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
              ? 'md:ml-56 pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-0 min-w-0'
              : 'min-w-0'
        }
        role="main"
      >
        <PageErrorBoundary>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </PageErrorBoundary>
      </main>

      {/* Panic Button */}
      {user && <PanicButton />}

      {/* Global AI Assistant */}
      {user && <GlobalAssistant />}

      {/* Global Search */}
      {user && <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />}

      {/* Event Reminders Background Service */}
      {user && <EventReminders currentUser={user} />}

      {/* Right Now Match Notifications */}
      {user && <RightNowNotifications currentUser={user} />}

      {/* Persistent Radio Player - Never Unmounts */}
      <PersistentRadioPlayer />

      {/* Cookie Consent Banner */}
      <CookieConsent />
      </div>
        </TaxonomyProvider>
      </ErrorBoundary>
      );
      }

      export default function Layout(props) {
      return (
      <RadioProvider>
      <LayoutInner {...props} />
      </RadioProvider>
      );
      }