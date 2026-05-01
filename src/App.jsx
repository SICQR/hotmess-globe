import { Toaster } from "@/components/ui/sonner"
import { toast } from 'sonner'
import { useEffect, useState, Suspense, lazy } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useParams, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import { BootGuardProvider, useBootGuard, BOOT_STATES } from '@/contexts/BootGuardContext';
import BootRouter from '@/components/shell/BootRouter';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { createPageUrl } from './utils';
import { ShopCartProvider } from '@/features/shop/cart/ShopCartContext';
import ShopCollection from '@/pages/ShopCollection';
import ShopProduct from '@/pages/ShopProduct';
import ShopCart from '@/pages/ShopCart';
import CheckoutStart from '@/pages/CheckoutStart';
import CreatorsCart from '@/pages/CreatorsCart';
import CreatorsCheckout from '@/pages/CreatorsCheckout';
import CreatorsCheckoutSuccess from '@/pages/CreatorsCheckoutSuccess';
import PrivacyHub from '@/pages/legal/PrivacyHub';
import { AboutPage, LegalPage, AccessibilityPage, PrivacyPolicyPage, RemixLicensePage, CommercialLicensePage, CreatorAgreementPage, DMCAPage, LocationDisclosurePage, AIDisclosurePage } from '@/pages/legal/LegalPages';
import { CookieBanner } from '@/components/legal/CookieBanner';
import { I18nProvider } from '@/contexts/I18nContext';
import { TonightModeProvider } from '@/hooks/useTonightMode';
import { WorldPulseProvider } from '@/contexts/WorldPulseContext';
import { PageTransition } from '@/components/lux/PageTransition';
import { PageLoadingSkeleton } from '@/components/skeletons/PageSkeletons';
import UnifiedGlobe from '@/components/globe/UnifiedGlobe';
import { SheetProvider, useSheet } from '@/contexts/SheetContext';
import SheetRouter from '@/components/sheets/SheetRouter';
import { SOSProvider, useSOSContext } from '@/contexts/SOSContext';
import { CheckinTimerProvider } from '@/contexts/CheckinTimerContext';
import SafetyFAB from '@/components/safety/SafetyFAB';
import SOSOverlay from '@/components/interrupts/SOSOverlay';
import FakeCallGenerator from '@/components/safety/FakeCallGenerator';
import SafetyRecoveryScreen from '@/components/safety/SafetyRecoveryScreen';
import ShakeSOS from '@/components/sos/ShakeSOS';
import IncomingCallBanner from '@/components/calls/IncomingCallBanner';
import { useViewportHeight } from '@/hooks/useMobileDynamics';
import { useNavigate as useNav } from 'react-router-dom';
import { PinLockProvider } from '@/contexts/PinLockContext';
import PinLockOverlay from '@/components/auth/PinLockScreen';
import { OSBottomNav } from '@/modes/OSBottomNav';
import { RadioProvider } from '@/contexts/RadioContext';
import { PersonaProvider } from '@/contexts/PersonaContext';
import { GlobeProvider } from '@/contexts/GlobeContext';
import { LiveModeProvider } from '@/contexts/LiveModeContext';
import LiveModeOverlay from '@/components/live/LiveModeOverlay';
import { RadioMiniPlayer } from '@/components/radio/RadioMiniPlayer';
import { MusicPlayerProvider } from '@/contexts/MusicPlayerContext';
import { MusicMiniPlayer } from '@/components/music/MusicMiniPlayer';
import { GlobalTicker } from '@/components/banners/GlobalTicker';
import { TopHUD } from '@/components/shell/TopHUD';
import { MovementStatusCard } from '@/components/movement/MovementStatusCard';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useRetentionPush } from '@/hooks/useRetentionPush';
import { useDeepLinkSheet } from '@/hooks/useDeepLinkSheet';
import { usePresenceHeartbeat } from '@/hooks/usePresenceHeartbeat';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import AuthCallback from '@/pages/auth/callback';
import { supabase } from '@/components/utils/supabaseClient';
import { syncLocation } from '@/utils/locationService';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';


// ── 6 core OS modes: eagerly loaded so tab switching is instant ────────────
import HomeMode    from '@/modes/HomeMode';
import GhostedMode from '@/modes/GhostedMode';
import GlobePage   from '@/pages/Globe';
import RadioMode   from '@/modes/RadioMode';
import ProfileMode from '@/modes/ProfileMode';
import MarketMode  from '@/modes/MarketMode';
import MusicTab    from '@/components/music/MusicTab';
// Secondary routes: keep lazy (not in primary nav, rarely accessed on first open)
const EventsMode  = lazy(() => import('@/modes/EventsMode'));
const VaultMode   = lazy(() => import('@/modes/VaultMode'));
const ChatMeetupPage = lazy(() => import('@/pages/ChatMeetupPage'));
const ModerationPage = lazy(() => import('@/pages/admin/ModerationPage'));
const FlagsAdmin    = lazy(() => import('@/pages/admin/FlagsAdmin'));
const SOSPage = lazy(() => import('@/pages/SOSPage'));
const FakeCallPage = lazy(() => import('@/pages/FakeCallPage'));
const SafetyPage = lazy(() => import('@/pages/Safety'));
const SafePage = lazy(() => import('@/pages/SafePage'));
const SafetySeedScreen = lazy(() => import('@/components/onboarding/screens/SafetySeedScreen'));
const MusicMode = lazy(() => import('@/modes/MusicMode'));
import MorePage from '@/pages/MorePage';
const CarePage = lazy(() => import('@/pages/CarePage'));
import AftercareNudge from '@/components/safety/AftercareNudge';
import CreateBeaconBiz from '@/pages/biz/CreateBeaconBiz';
const VenueCheckin = lazy(() => import('@/pages/VenueCheckin'));
const ComingSoon = lazy(() => import('@/pages/ComingSoon'));
const SellerDashboard = lazy(() => import('@/pages/SellerDashboard'));
const SellerOnboarding = lazy(() => import('@/pages/SellerOnboarding'));
const CreatorDashboard = lazy(() => import('@/pages/CreatorDashboard'));
const TicketsPage = lazy(() => import('@/pages/tickets/Tickets'));
const TicketDetailPage = lazy(() => import('@/pages/tickets/TicketDetail'));
const TicketChatPage = lazy(() => import('@/pages/tickets/TicketChat'));

// Example screens (design system demos)
const ChatWithMapExample = lazy(() => import('@/examples/ChatWithMapExample'));
const GhostedGridExample = lazy(() => import('@/examples/GhostedGridExample'));
const MarketExample = lazy(() => import('@/examples/MarketExample'));

// Auth example screens
const WelcomeScreen = lazy(() => import('@/examples/auth/WelcomeScreen'));
const LoginScreen = lazy(() => import('@/examples/auth/LoginScreen'));
const SignUpScreen = lazy(() => import('@/examples/auth/SignUpScreen'));
const ForgotPasswordScreen = lazy(() => import('@/examples/auth/ForgotPasswordScreen'));
const JoinCodeScreen = lazy(() => import('@/examples/auth/JoinCodeScreen'));
const ProfileSetupScreen = lazy(() => import('@/examples/auth/ProfileSetupScreen'));

// Legacy page imports
const ChatHistoryPage = lazy(() => import('@/pages/ChatHistoryPage'));

const isProdBuild = import.meta.env.MODE === 'production';

// In production, do not expose every Base44 page as a public /PageName route.
// Keep a small compatibility allowlist for historically-used deep links.
const LEGACY_PAGE_ROUTE_ALLOWLIST = new Set([
  'Auth',
  'AgeGate',
  'OnboardingGate',
  'Home',
  'Pulse',
  'Events',
  'Social',
  'Messages',
  'Music',
  'Radio',
  'RadioSchedule',
  'More',
  'Profile',
  'ProfilesGrid',
  'Beacons',
  'CreateBeacon',
  'EditBeacon',
  'Bookmarks',
  'Settings',
  'EditProfile',
  'MembershipUpgrade',
  'Pricing',
  'Safety',
  'Calendar',
  'Scan',
  'Community',
  'Leaderboard',
  'AdminDashboard',
  // Business pages
  'PromoterDashboard',
  'BusinessDashboard',
  'BusinessAnalytics',
  'BusinessOnboarding',
  'BusinessSettings',
  'BusinessVenue',
  'BusinessBilling',
  'CreateBeaconBiz',
  'CreatorDashboard',
  'SellerDashboard',
  'SellerOnboarding',
  'OrganizerDashboard',
  'ReferralProgram',
  // Shop/market compat is handled separately.
  'Marketplace',
  'ProductDetail',
  'OrderHistory',
]);

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const PageRoute = ({ pageKey }) => {
  const Page = Pages[pageKey];
  if (!Page) return <PageNotFound />;

  return (
    <LayoutWrapper currentPageName={pageKey}>
      <Page />
    </LayoutWrapper>
  );
};

const EventDetailRedirect = () => {
  const { id } = useParams();
  const target = `${createPageUrl('BeaconDetail')}?id=${encodeURIComponent(id ?? '')}`;
  return <Navigate to={target} replace />;
};

const EditBeaconRedirect = () => {
  const { id } = useParams();
  const target = `${createPageUrl('EditBeacon')}?id=${encodeURIComponent(id ?? '')}`;
  return <Navigate to={target} replace />;
};

const LegacyShopCollectionRedirect = () => {
  return <Navigate to="/market" replace />;
};

const LegacyProductDetailRedirect = () => {
  const location = useLocation();
  const search = location?.search || '';
  const params = new URLSearchParams(search);
  const handle = params.get('handle');
  const target = handle ? `/market/p/${encodeURIComponent(handle)}` : '/market';
  return <Navigate to={target} replace />;
};

const ProductDetailGate = () => {
  const location = useLocation();
  const search = location?.search || '';
  const params = new URLSearchParams(search);
  const handle = params.get('handle');

  // If a Shopify handle is provided, always land on the canonical Shopify product page.
  if (handle) {
    return <LegacyProductDetailRedirect />;
  }

  // Otherwise, allow legacy ProductDetail (used by XP/P2P marketplace) to render.
  const Page = Pages?.ProductDetail;
  if (!Page) return <PageNotFound />;

  return (
    <LayoutWrapper currentPageName="ProductDetail">
      <Page />
    </LayoutWrapper>
  );
};

const ShowHeroRedirect = () => {
  const { slug } = useParams();
  const map = {
    'wake-the-mess': 'WakeTheMess',
    'dial-a-daddy': 'DialADaddy',
    'hand-n-hand': 'HandNHand',
  };
  const pageKey = slug ? map[String(slug).toLowerCase()] : null;
  const target = pageKey ? createPageUrl(pageKey) : createPageUrl('RadioSchedule');
  return <Navigate to={target} replace />;
};

const ProfileRedirect = () => {
  const { email } = useParams();
  const target = `${createPageUrl('Profile')}?email=${encodeURIComponent(email ?? '')}`;
  return <Navigate to={target} replace />;
};

const OrdersRedirect = () => {
  return <Navigate to={createPageUrl('OrderHistory')} replace />;
};

const OrderByIdRedirect = () => {
  // We don't currently have a dedicated order detail route; land on the orders list.
  return <Navigate to={createPageUrl('OrderHistory')} replace />;
};

const OrderTrackingRedirect = () => {
  // We don't currently have a dedicated tracking page; land on the orders list.
  return <Navigate to={createPageUrl('OrderHistory')} replace />;
};

const ReturnsRedirect = () => {
  // Returns are handled from orders for now.
  return <Navigate to={createPageUrl('OrderHistory')} replace />;
};

const ShopCollectionRoute = () => {
  return (
    <LayoutWrapper currentPageName="Marketplace">
      <ShopCollection />
    </LayoutWrapper>
  );
};

const CreatorsProductRoute = () => {
  const { id } = useParams();
  const target = `${createPageUrl('ProductDetail')}?id=${encodeURIComponent(id ?? '')}`;
  return <Navigate to={target} replace />;
};

const CreatorsCartRoute = () => {
  return (
    <LayoutWrapper currentPageName="Marketplace">
      <CreatorsCart />
    </LayoutWrapper>
  );
};

const CreatorsCheckoutRoute = () => {
  return (
    <LayoutWrapper currentPageName="Marketplace">
      <CreatorsCheckout />
    </LayoutWrapper>
  );
};

const CreatorsCheckoutSuccessRoute = () => {
  return (
    <LayoutWrapper currentPageName="Marketplace">
      <CreatorsCheckoutSuccess />
    </LayoutWrapper>
  );
};

const ShopProductRoute = () => {
  return (
    <LayoutWrapper currentPageName="Marketplace">
      <ShopProduct />
    </LayoutWrapper>
  );
};

const ShopCartRoute = () => {
  return (
    <LayoutWrapper currentPageName="Marketplace">
      <ShopCart />
    </LayoutWrapper>
  );
};

const ShopCheckoutStartRoute = () => {
  return (
    <LayoutWrapper currentPageName="Marketplace">
      <CheckoutStart />
    </LayoutWrapper>
  );
};

const LegalPrivacyRoute = () => (
  <LayoutWrapper currentPageName="More">
    <PrivacyPolicyPage />
  </LayoutWrapper>
);

const LegalTermsRoute = () => (
  <LayoutWrapper currentPageName="More">
    <LegalPage />
  </LayoutWrapper>
);

const LegalPrivacyHubRoute = () => (
  <LayoutWrapper currentPageName="More">
    <PrivacyHub />
  </LayoutWrapper>
);

const SocialDiscoverRedirect = () => {
  return <Navigate to={createPageUrl('Social')} replace />;
};

const SocialUserRedirect = () => {
  const { id } = useParams();
  const target = `${createPageUrl('Profile')}?uid=${encodeURIComponent(id ?? '')}`;
  return <Navigate to={target} replace />;
};

const SocialThreadRedirect = () => {
  const { threadId } = useParams();
  const target = `${createPageUrl('Messages')}?thread=${encodeURIComponent(threadId ?? '')}`;
  return <Navigate to={target} replace />;
};

const MarketCollectionRedirect = () => {
  const { collection } = useParams();
  const target = `/market?collection=${encodeURIComponent(collection ?? '')}`;
  return <Navigate to={target} replace />;
};

/**
 * AuthenticatedApp - The main app routes (only renders when bootState is READY)
 * BootRouter handles all the gating logic now.
 */
const AuthenticatedApp = () => {
  const location = useLocation();
  // Handle Stripe redirect after successful boost purchase
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const bs = p.get('boost_success');
    const ms = p.get('membership');
    const tier = p.get('tier');

    if (bs) {
      const L = {
        globe_glow: 'Globe Glow', profile_bump: 'Profile Bump', vibe_blast: 'Vibe Blast',
        incognito_week: 'Incognito Mode', extra_beacon_drop: 'Extra Beacon Drop', highlighted_message: 'Highlighted Message'
      };
      toast.success(`${L[bs] || 'Boost'} activated! ⚡`);
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (ms === 'success' && tier) {
      const fulfill = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const tierKey = tier.toLowerCase();
          await supabase.from('profiles').update({
            membership_tier: tierKey,
            is_verified: true
          }).eq('id', user.id);

          await supabase.from('memberships').upsert({
            user_id: user.id,
            tier_name: tierKey,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

          toast.success(`Welcome to ${tier.toUpperCase()}! Active now. 👑`);
          window.history.replaceState({}, '', window.location.pathname);
        }
      };
      fulfill();
    }
  }, []);

  // Render the main app with LED Brutalist page transitions
  return (
    <PageTransition location={location}>
      <Routes location={location} key={location.pathname}>
      {/* OS 5-Mode Structure: Home | Pulse | Ghosted | Shop | More */}
      
      {/* 1. HOME */}
      <Route path="/" element={<Suspense fallback={<PageLoadingSkeleton type="feed" />}><HomeMode /></Suspense>} />
      
      {/* 2. PULSE (The signal starts here) */}
      <Route path="/pulse" element={<Suspense fallback={<PageLoadingSkeleton type="events" />}><GlobePage /></Suspense>} />

      <Route path="/globe" element={<Navigate to="/pulse" replace />} />
      <Route path="/events" element={<Navigate to="/pulse" replace />} />
      <Route path="/events/*" element={<Navigate to="/pulse" replace />} />
      
      {/* 3. GHOSTED (Teaser / Music-led) */}
      <Route path="/ghosted" element={<Suspense fallback={<PageLoadingSkeleton type="profiles" />}><GhostedMode /></Suspense>} />
      <Route path="/social" element={<Navigate to="/ghosted" replace />} />
      <Route path="/social/*" element={<Navigate to="/ghosted" replace />} />
      
      {/* 4. SHOP (Unified Commerce) */}
      <Route path="/market" element={<Suspense fallback={<PageLoadingSkeleton type="products" />}><MarketMode /></Suspense>} />
      <Route path="/market/*" element={<Suspense fallback={<PageLoadingSkeleton type="products" />}><MarketMode /></Suspense>} />
      <Route path="/shop" element={<Navigate to="/market" replace />} />
      <Route path="/shop/*" element={<Navigate to="/market" replace />} />
      <Route path="/marketplace" element={<Navigate to="/market" replace />} />
      <Route path="/p/:handle" element={<ShopProductRoute />} />
      
      {/* 5. MORE (Radio, Care, Settings, Legal) */}
      <Route path="/more" element={<Suspense fallback={null}><MorePage /></Suspense>} />
      <Route path="/radio" element={<Navigate to="/more" replace />} />
      <Route path="/music" element={<Suspense fallback={<PageLoadingSkeleton type="feed" />}><MusicMode /></Suspense>} />
      <Route path="/care" element={<Navigate to="/more" replace />} />
      <Route path="/more/*" element={<Suspense fallback={null}><MorePage /></Suspense>} />
      <Route path="/safety" element={<Suspense fallback={<PageLoadingSkeleton type="feed" />}><SafetyPage /></Suspense>} />
      <Route path="/safety/*" element={<Suspense fallback={<PageLoadingSkeleton type="feed" />}><SafetyPage /></Suspense>} />
      <Route path="/safe" element={<Suspense fallback={null}><SafePage /></Suspense>} />

      
      {/* AUTH & INFRASTRUCTURE */}
      <Route path="/auth" element={<PageRoute pageKey="Auth" />} />
      <Route path="/auth/*" element={<PageRoute pageKey="Auth" />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/onboarding" element={<PageRoute pageKey="OnboardingGate" />} />
      <Route path="/onboarding/*" element={<PageRoute pageKey="OnboardingGate" />} />
      
      {/* SETTINGS (Accessible via More) */}
      <Route path="/settings" element={<PageRoute pageKey="Settings" />} />
      <Route path="/settings/*" element={<PageRoute pageKey="Settings" />} />
      <Route path="/profile" element={<Navigate to="/settings" replace />} />
      
      {/* LEGAL (Accessible via More) */}
      <Route path="/legal/privacy" element={<LegalPrivacyRoute />} />
      <Route path="/legal/terms" element={<LegalTermsRoute />} />
      <Route path="/legal/*" element={<AboutPage />} />

      {/* Fallback auto-generated /PageName routes for internal createPageUrl() redirects */}
      {Object.entries(Pages).map(([path, Page]) => {
        // Skip explicitly declared canonical routes to avoid duplicate logic
        if (['Home', 'Pulse', 'Ghosted', 'Market', 'More', 'Auth'].includes(path)) return null;
        
        return (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            }
          />
        );
      })}
      
      {/* ADMIN — v6 Feature Flags */}
      <Route path="/admin/flags" element={<Suspense fallback={<PageLoadingSkeleton type="feed" />}><FlagsAdmin /></Suspense>} />
      <Route path="*" element={<PageNotFound />} />
      </Routes>
    </PageTransition>
  );
};


function App() {

  return (
    <I18nProvider>
      <AuthProvider>
        <PinLockProvider>
          <TonightModeProvider>
            <BootGuardProvider>
            <QueryClientProvider client={queryClientInstance}>
              <WorldPulseProvider>
                <ShopCartProvider>
                  <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <SOSProvider>
                      <CheckinTimerProvider>
                        <SheetProvider>
                        <RadioProvider>
                          <NavigationTracker />
                          <LiveModeProvider>
                            <MusicPlayerProvider>
                              <PersonaProvider>
                                <GlobeProvider>
                                  <BootRouter>
                                    <OSArchitecture />
                                  </BootRouter>
                                  {/* L2 Sheet System - Renders over everything, outside route remount boundary */}
                                  <SheetRouter />
                                </GlobeProvider>
                              </PersonaProvider>
                            </MusicPlayerProvider>
                          </LiveModeProvider>
                        </RadioProvider>
                      </SheetProvider>
                    </CheckinTimerProvider>
                  </SOSProvider>
                  </Router>
                </ShopCartProvider>
              </WorldPulseProvider>
              <Toaster />
              {/* PIN Lock Overlay - Z-200, above everything */}
              <PinLockOverlay />
            </QueryClientProvider>
          </BootGuardProvider>
          </TonightModeProvider>
        </PinLockProvider>
      </AuthProvider>
    </I18nProvider>
  )
}

/**
 * Render the application's layered OS UI shell and initialize OS-level side effects.
 *
 * Initializes dynamic viewport height, push notifications, deep-link sheet handling, and presence heartbeat; parses and strips Telegram deep-link tokens from the URL. Renders a persistent globe background, the authenticated app routes overlay, radio mini player (hidden on radio routes), bottom navigation, cookie banner, and interrupt-layer UI such as the SOS long-press button, shake-to-SOS, incoming call banner (each shown only when authenticated), and the SOS overlay when active.
 *
 * @returns {JSX.Element} The layered OS shell containing globe, app routes, mini player, navigation, interrupts, and cookie banner.
 */
function OSArchitecture() {
  const { isAuthenticated } = useBootGuard();
  const { sosActive, showRecovery, triggerSOS, clearSOS, dismissRecovery } = useSOSContext();
  const location = useLocation();
  const { closeSheet, sheetStack } = useSheet();

  // Initialize dynamic viewport height for mobile browsers
  useViewportHeight();
  // Register service worker + request push permission on first load
  usePushNotifications();
  // Retention push triggers — rate-limited, intent-based notifications
  useRetentionPush();
  // Auto-open sheets from push notification deep links (?sheet=...)
  useDeepLinkSheet();
  // Update User.last_seen every 5 min — powers online presence dots on Ghosted grid
  usePresenceHeartbeat();
  // iOS-style edge swipe to go back
  useSwipeBack();
  const { pullProgress, isRefreshing } = usePullToRefresh();


  // Part B: Sync location on app open (once per mount)
  useEffect(() => {
    if (isAuthenticated) {
      syncLocation();
    }
  }, [isAuthenticated]);

  // Aftercare nudge state for check-in expiry
  const [showAftercare, setShowAftercare] = useState(false);

  // Listen for check-in expiry event
  useEffect(() => {
    const h = () => setShowAftercare(true);
    window.addEventListener('hm:checkin-expired', h);
    return () => window.removeEventListener('hm:checkin-expired', h);
  }, []);

  // ── Service Worker NOTIFICATION_CLICK message → React Router navigate ─────
  const navigate = useNav();
  useEffect(() => {
    if (!navigator.serviceWorker) return;
    const handleSWMessage = (event) => {
      if (event.data?.type === 'NOTIFICATION_CLICK' && event.data?.url) {
        try {
          const url = new URL(event.data.url, window.location.origin);
          navigate(url.pathname + url.search + url.hash, { replace: false });
        } catch {
          // invalid url — ignore
        }
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSWMessage);
  }, [navigate]);

  // C5: Android back button — close top sheet instead of navigating back
  useEffect(() => {
    const handlePopState = (e) => {
      if (sheetStack && sheetStack.length > 0) {
        // Push a new state to replace the consumed popstate
        window.history.pushState(null, '', window.location.href);
        closeSheet();
        e.preventDefault?.();
      }
    };
    // Prime the history stack so the first back press is interceptable
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetStack, closeSheet]);

  // ── Telegram deep-link handler ──────────────────────────────────────────
  // When the Telegram bot sends a user to hotmessldn.com?tg_token=XXX
  // we stash the token for post-auth use and strip it from the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tgToken = params.get('tg_token');
    const tgUser  = params.get('tg_user');
    const inviteCode = params.get('invite');

    if (tgToken) {
      localStorage.setItem('hm_tg_token', tgToken);
      if (tgUser) localStorage.setItem('hm_tg_user', tgUser);
    }

    // ── Invite code deep-link handler ────────────────────────────────────
    // When a user clicks hotmessldn.com?invite=CODE
    // we stash the code for post-auth signup capture
    if (inviteCode) {
      localStorage.setItem('hm_invite_code', inviteCode);
    }

    // Strip params from URL without reload if any were handled
    if (tgToken || inviteCode) {
      const clean = window.location.pathname + (window.location.hash || '');
      window.history.replaceState({}, '', clean);
    }
  }, []);

  const onRadioActive = location.pathname.startsWith('/more/radio') || location.pathname === '/radio';

  return (
    <div className="hotmess-os relative h-dvh w-full overflow-hidden bg-[#050507]">
      {/* Pull to Refresh Indicator */}
      {pullProgress > 0 && (
        <div 
          className="fixed top-0 left-0 right-0 z-[1000] pointer-events-none flex flex-col items-center pt-2"
          style={{ opacity: pullProgress }}
        >
          <div 
            className="h-1 bg-[#C8962C] shadow-[0_0_15px_#C8962C] transition-all duration-75 rounded-full" 
            style={{ width: `${Math.min(pullProgress * 60, 100)}%` }}
          />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C8962C] mt-2 opacity-60">
            {pullProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      )}

      {/* L0: Persistent Globe Layer (Z-0) - Removed, now handled by route */}


      {/* L1-L3: Everything else — absolute, covers globe, explicitly ends above bottom nav */}
      <div 
        className="absolute inset-x-0 z-10 w-full"
        style={{ 
          top: 'calc(44px + env(safe-area-inset-top, 0px))',
          bottom: 'calc(64px + max(env(safe-area-inset-bottom), 8px))'
        }}
      >
        <AuthenticatedApp />
      </div>

      {/* L1: Top HUD (Z-50) — Unified Logo + Notifs + Avatar */}
      <TopHUD />

      {/* Global Ticker — sits just below TopHUD */}
      <GlobalTicker className="fixed top-12 left-0 right-0 z-[60]" />

      {/* Radio Mini Player — sits just above OSBottomNav (Z-40) */}
      <RadioMiniPlayer hidden={onRadioActive} />


      {/* Music Mini Player — sits just above radio player or nav (Z-50) */}
      <MusicMiniPlayer />

      {/* Global Ticker was moved to the very top to prevent hiding Shopping buttons */}

      {/* Movement Status Card — floats above nav when sharing movement (Z-50) */}
      {isAuthenticated && <MovementStatusCard />}

      {/* L1: OS Bottom Nav — amber-circle 5-tab nav */}
      <OSBottomNav />

      {/* L2.5: Live Mode Overlay — unified presence layer (Z-110) */}
      <LiveModeOverlay />

      {/* L3: Shake-to-SOS — auth only */}
      {isAuthenticated && <ShakeSOS />}

      {/* Invisible Safety FAB — sits over OSBottomNav (Z-120) */}
      <SafetyFAB />

      {/* L3: SOS Overlay — blocks entire OS, stops all sharing (Z-200) */}
      {/* SOS Overlay removed — now silent */}

      {/* Post-safety recovery screen — z-[205], shown after SOS dismissed */}
      {showRecovery && <SafetyRecoveryScreen />}

      {/* Incoming call banner — auth only */}
      {isAuthenticated && <IncomingCallBanner />}

      {/* The Exit Generator (Persistent listener) */}
      {isAuthenticated && <div className="hidden"><FakeCallGenerator /></div>}

      {/* Aftercare nudge — triggered by check-in expiry */}
      <AftercareNudge isOpen={showAftercare} onClose={() => setShowAftercare(false)} />

      {/* GDPR Cookie Banner — shows once, persists choice */}
      <CookieBanner />
    </div>
  );
}

export default App
