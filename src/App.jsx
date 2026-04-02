import { Toaster, toast } from "@/components/ui/sonner"
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
import Shop from '@/pages/Shop';
import ShopCollection from '@/pages/ShopCollection';
import ShopProduct from '@/pages/ShopProduct';
import ShopCart from '@/pages/ShopCart';
import CheckoutStart from '@/pages/CheckoutStart';
import CreatorsCart from '@/pages/CreatorsCart';
import CreatorsCheckout from '@/pages/CreatorsCheckout';
import CreatorsCheckoutSuccess from '@/pages/CreatorsCheckoutSuccess';
import Privacy from '@/pages/legal/Privacy';
import Terms from '@/pages/legal/Terms';
import PrivacyHub from '@/pages/legal/PrivacyHub';
import { AboutPage, LegalPage, AccessibilityPage, PrivacyPolicyPage } from '@/pages/legal/LegalPages';
import { CookieBanner } from '@/components/legal/CookieBanner';
import { I18nProvider } from '@/contexts/I18nContext';
import { WorldPulseProvider } from '@/contexts/WorldPulseContext';
import { PageTransition } from '@/components/lux/PageTransition';
import { PageLoadingSkeleton } from '@/components/skeletons/PageSkeletons';
import UnifiedGlobe from '@/components/globe/UnifiedGlobe';
import { SheetProvider, useSheet } from '@/contexts/SheetContext';
import SheetRouter from '@/components/sheets/SheetRouter';
import { SOSProvider, useSOSContext } from '@/contexts/SOSContext';
import { SOSButton } from '@/components/sos/SOSButton';
import SOSOverlay from '@/components/interrupts/SOSOverlay';
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
import { RadioMiniPlayer } from '@/components/radio/RadioMiniPlayer';
import { MusicPlayerProvider } from '@/contexts/MusicPlayerContext';
import { MusicMiniPlayer } from '@/components/music/MusicMiniPlayer';
import { GlobalTicker } from '@/components/banners/GlobalTicker';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useDeepLinkSheet } from '@/hooks/useDeepLinkSheet';
import { usePresenceHeartbeat } from '@/hooks/usePresenceHeartbeat';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import AuthCallback from '@/pages/auth/callback';

// ── 6 core OS modes: eagerly loaded so tab switching is instant ────────────
import HomeMode    from '@/modes/HomeMode';
import GhostedMode from '@/modes/GhostedMode';
import PulseMode   from '@/modes/PulseMode';
import RadioMode   from '@/modes/RadioMode';
import ProfileMode from '@/modes/ProfileMode';
import { MarketMode } from '@/modes/MarketMode';
import MusicTab    from '@/components/music/MusicTab';
// Secondary routes: keep lazy (not in primary nav, rarely accessed on first open)
const EventsMode  = lazy(() => import('@/modes/EventsMode'));
const VaultMode   = lazy(() => import('@/modes/VaultMode'));
const ChatMeetupPage = lazy(() => import('@/pages/ChatMeetupPage'));
const ModerationPage = lazy(() => import('@/pages/admin/ModerationPage'));
const SOSPage = lazy(() => import('@/pages/SOSPage'));
const FakeCallPage = lazy(() => import('@/pages/FakeCallPage'));
const SafetyPage = lazy(() => import('@/pages/Safety'));
const SafetySeedScreen = lazy(() => import('@/components/onboarding/screens/SafetySeedScreen'));
import MorePage from '@/pages/MorePage';
const CarePage = lazy(() => import('@/pages/CarePage'));
import AftercareNudge from '@/components/safety/AftercareNudge';

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

const CreatorsMarketRoute = () => {
  return <PageRoute pageKey="Marketplace" />;
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

const ShopHomeRoute = () => {
  return (
    <LayoutWrapper currentPageName="Marketplace">
      <Shop />
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
    <Privacy />
  </LayoutWrapper>
);

const LegalTermsRoute = () => (
  <LayoutWrapper currentPageName="More">
    <Terms />
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
  // Handle Stripe redirect after successful boost purchase
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const bs = p.get('boost_success');
    if (bs) {
      const L = {
        globe_glow: 'Globe Glow', profile_bump: 'Profile Bump', vibe_blast: 'Vibe Blast',
        incognito_week: 'Incognito Mode', extra_beacon_drop: 'Extra Beacon Drop', highlighted_message: 'Highlighted Message'
      };
      toast.success(`${L[bs] || 'Boost'} activated! ⚡`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Render the main app with LED Brutalist page transitions
  return (
    <PageTransition>
      <Routes>
      {/* V1.5 canonical routes (Bible) - OS 5-Mode Structure */}
      
      {/* HOME - Dashboard */}
      <Route path="/" element={<Suspense fallback={<PageLoadingSkeleton type="feed" />}><HomeMode /></Suspense>} />
      {/* GHOSTED - Proximity Grid */}
      <Route path="/ghosted" element={<Suspense fallback={<PageLoadingSkeleton type="profiles" />}><GhostedMode /></Suspense>} />
      
      {/* Auth & Onboarding (unchanged) */}
      <Route path="/auth" element={<PageRoute pageKey="Auth" />} />
      <Route path="/auth/*" element={<PageRoute pageKey="Auth" />} />
      <Route path="/onboarding" element={<PageRoute pageKey="OnboardingGate" />} />
      <Route path="/onboarding/*" element={<PageRoute pageKey="OnboardingGate" />} />
      
      {/* PULSE - Mode (no Layout) */}
      <Route path="/pulse" element={<Suspense fallback={<PageLoadingSkeleton type="events" />}><PulseMode /></Suspense>} />
      <Route path="/globe" element={<Navigate to="/pulse" replace />} />
      <Route path="/events" element={<Suspense fallback={null}><EventsMode /></Suspense>} />
      <Route path="/events/*" element={<Suspense fallback={null}><EventsMode /></Suspense>} />
      <Route path="/events/:id" element={<EventDetailRedirect />} />
      {/* Market (canonical) -> MarketMode (no Layout) */}
      {/* Specific sub-routes MUST come before the wildcard */}
      <Route path="/market/creators/checkout" element={<CreatorsCheckoutRoute />} />
      <Route path="/market/creators/checkout-success" element={<CreatorsCheckoutSuccessRoute />} />
      <Route path="/market" element={<Suspense fallback={<PageLoadingSkeleton type="products" />}><MarketMode /></Suspense>} />
      <Route path="/market/*" element={<Suspense fallback={<PageLoadingSkeleton type="products" />}><MarketMode /></Suspense>} />
      <Route path="/social" element={<Navigate to="/ghosted" replace />} />
      <Route path="/social/discover" element={<Navigate to="/ghosted" replace />} />
      <Route path="/social/inbox" element={<PageRoute pageKey="Messages" />} />
      <Route path="/social/u/:id" element={<SocialUserRedirect />} />
      <Route path="/social/t/:threadId" element={<SocialThreadRedirect />} />
      <Route path="/chat/meetup" element={<Suspense fallback={null}><ChatMeetupPage /></Suspense>} />
      <Route path="/chat/:threadId" element={<Suspense fallback={null}><ChatMeetupPage /></Suspense>} />
      <Route path="/chats" element={<Suspense fallback={null}><ChatHistoryPage /></Suspense>} />
      
      {/* Example screens (design system demos) */}
      <Route path="/examples/chat" element={<Suspense fallback={null}><ChatWithMapExample /></Suspense>} />
      <Route path="/examples/ghosted" element={<Suspense fallback={null}><GhostedGridExample /></Suspense>} />
      <Route path="/examples/market" element={<Suspense fallback={null}><MarketExample /></Suspense>} />
      
      {/* Auth screens - fully wired to Supabase */}
      <Route path="/examples/auth/welcome" element={<Suspense fallback={null}><WelcomeScreen /></Suspense>} />
      <Route path="/examples/auth/login" element={<Suspense fallback={null}><LoginScreen /></Suspense>} />
      <Route path="/examples/auth/signup" element={<Suspense fallback={null}><SignUpScreen /></Suspense>} />
      <Route path="/examples/auth/forgot" element={<Suspense fallback={null}><ForgotPasswordScreen /></Suspense>} />
      <Route path="/examples/auth/join-code" element={<Suspense fallback={null}><JoinCodeScreen /></Suspense>} />
      <Route path="/examples/auth/profile-setup" element={<Suspense fallback={null}><ProfileSetupScreen /></Suspense>} />
      
      {/* RADIO - Mode (no Layout) */}
      <Route path="/radio" element={<Suspense fallback={<PageLoadingSkeleton />}><RadioMode /></Suspense>} />
      <Route path="/radio/schedule" element={<Suspense fallback={<PageLoadingSkeleton />}><RadioMode /></Suspense>} />
      <Route path="/radio/live" element={<Suspense fallback={<PageLoadingSkeleton />}><RadioMode /></Suspense>} />
      <Route path="/music" element={<Suspense fallback={<PageLoadingSkeleton />}><MusicTab /></Suspense>} />
      <Route path="/music/live" element={<Navigate to="/radio" replace />} />
      <Route path="/music/shows" element={<Navigate to="/radio/schedule" replace />} />
      <Route path="/music/shows/:show/episodes" element={<Navigate to="/radio/schedule" replace />} />
      <Route path="/music/shows/:show/episodes/:id" element={<Navigate to="/radio/schedule" replace />} />
      <Route path="/music/shows/:slug" element={<ShowHeroRedirect />} />
      <Route path="/music/schedule" element={<Navigate to="/radio/schedule" replace />} />
      <Route path="/music/releases" element={<Navigate to="/radio" replace />} />
      <Route path="/music/releases/:slug" element={<PageRoute pageKey="MusicRelease" />} />
      <Route path="/music/tracks" element={<Navigate to="/radio" replace />} />
      <Route path="/music/tracks/:id" element={<Navigate to="/radio" replace />} />
      <Route path="/music/playlists" element={<Navigate to="/radio" replace />} />
      <Route path="/music/playlists/:id" element={<Navigate to="/radio" replace />} />
      <Route path="/music/artists" element={<Navigate to="/radio" replace />} />
      <Route path="/music/artists/:id" element={<Navigate to="/radio" replace />} />
      <Route path="/music/clips/:id" element={<Navigate to="/radio" replace />} />
      
      {/* PROFILE - Mode (no Layout) */}
      <Route path="/profile" element={<Suspense fallback={null}><ProfileMode /></Suspense>} />
      <Route path="/profile/edit" element={<Suspense fallback={null}><ProfileMode /></Suspense>} />
      <Route path="/profile/:id" element={<Suspense fallback={null}><ProfileMode /></Suspense>} />
      
      <Route path="/hnhmess" element={<PageRoute pageKey="Hnhmess" />} />
      <Route path="/more" element={<Suspense fallback={null}><MorePage /></Suspense>} />
      <Route path="/directions" element={<PageRoute pageKey="Directions" />} />
      
      {/* Auth sub-routes */}
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/sign-in" element={<PageRoute pageKey="Auth" />} />
      <Route path="/auth/sign-up" element={<PageRoute pageKey="Auth" />} />
      <Route path="/auth/magic-link" element={<PageRoute pageKey="Auth" />} />
      <Route path="/auth/verify" element={<PageRoute pageKey="Auth" />} />
      <Route path="/auth/reset" element={<PageRoute pageKey="Auth" />} />
      
      {/* Onboarding sub-routes (main /onboarding declared above) */}
      <Route path="/onboarding/consent" element={<PageRoute pageKey="Onboarding" />} />
      <Route path="/onboarding/profile" element={<PageRoute pageKey="Onboarding" />} />
      <Route path="/onboarding/preferences" element={<PageRoute pageKey="Onboarding" />} />

      {/* Headless Shopify shop routes */}
      {/* Legacy/alias shop routes (keep URLs working) */}
      <Route path="/shop" element={<Navigate to="/market" replace />} />
      <Route path="/shop/:handle" element={<LegacyShopCollectionRedirect />} />
      <Route path="/p/:handle" element={<ShopProductRoute />} />
      <Route path="/cart" element={<ShopCartRoute />} />
      <Route path="/checkout/start" element={<ShopCheckoutStartRoute />} />
      <Route path="/checkout" element={<PageRoute pageKey="Checkout" />} />

      {/* Features / USP Pages */}
      <Route path="/features" element={<PageRoute pageKey="Features" />} />
      <Route path="/features/manifesto" element={<PageRoute pageKey="FeaturesManifesto" />} />
      <Route path="/features/safety" element={<PageRoute pageKey="SafetyFeatures" />} />
      <Route path="/features/events" element={<PageRoute pageKey="EventsFeatures" />} />
      <Route path="/features/social" element={<PageRoute pageKey="SocialFeatures" />} />
      <Route path="/features/music" element={<PageRoute pageKey="RadioFeatures" />} />
      <Route path="/features/radio" element={<PageRoute pageKey="RadioFeatures" />} />
      <Route path="/features/personas" element={<PageRoute pageKey="PersonaFeatures" />} />
      <Route path="/features/profiles" element={<PageRoute pageKey="PersonaFeatures" />} />

      {/* Legal */}
      <Route path="/legal/privacy" element={<LegalPrivacyRoute />} />
      <Route path="/legal/terms" element={<LegalTermsRoute />} />
      <Route path="/legal/privacy-hub" element={<LegalPrivacyHubRoute />} />
      <Route path="/legal/about" element={<AboutPage />} />
      <Route path="/legal/accessibility" element={<AccessibilityPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/accessibility" element={<AccessibilityPage />} />
      <Route path="/legal" element={<Navigate to="/legal/privacy" replace />} />
      <Route path="/terms" element={<PageRoute pageKey="TermsOfService" />} />
      <Route path="/privacy" element={<PageRoute pageKey="PrivacyPolicy" />} />
      <Route path="/guidelines" element={<PageRoute pageKey="CommunityGuidelines" />} />
      <Route path="/contact" element={<PageRoute pageKey="Contact" />} />

      {/* Orders and market aliases */}
      <Route path="/orders" element={<OrdersRedirect />} />
      <Route path="/orders/:id" element={<OrderByIdRedirect />} />
      <Route path="/orders/:id/tracking" element={<OrderTrackingRedirect />} />
      <Route path="/returns" element={<ReturnsRedirect />} />
      
      {/* Social profile routes */}
      <Route path="/social/u/:email" element={<ProfileRedirect />} />

      {/* Bible-friendly /more/* tool routes (aliases) */}
      <Route path="/more/beacons" element={<PageRoute pageKey="Beacons" />} />
      <Route path="/more/beacons/new" element={<PageRoute pageKey="CreateBeacon" />} />
      <Route path="/more/beacons/:id" element={<EventDetailRedirect />} />
      <Route path="/more/beacons/:id/edit" element={<EditBeaconRedirect />} />
      <Route path="/more/stats" element={<PageRoute pageKey="Stats" />} />
      <Route path="/more/vault" element={<Suspense fallback={null}><VaultMode /></Suspense>} />
      <Route path="/vault" element={<Suspense fallback={null}><VaultMode /></Suspense>} />
      <Route path="/vault/*" element={<Suspense fallback={null}><VaultMode /></Suspense>} />
      <Route path="/more/challenges" element={<PageRoute pageKey="Challenges" />} />
      <Route path="/more/settings" element={<PageRoute pageKey="Settings" />} />
      <Route path="/more/care" element={<Suspense fallback={null}><CarePage /></Suspense>} />

      {/* Settings */}
      <Route path="/settings" element={<PageRoute pageKey="Settings" />} />
      <Route path="/settings/privacy" element={<PageRoute pageKey="Settings" />} />
      <Route path="/settings/notifications" element={<PageRoute pageKey="Settings" />} />
      <Route path="/settings/account" element={<PageRoute pageKey="Settings" />} />

      {/* SOS + Fake Call — deep-linkable safety shortcuts */}
      <Route path="/sos" element={<Suspense fallback={null}><SOSPage /></Suspense>} />
      <Route path="/fake-call" element={<Suspense fallback={null}><FakeCallPage /></Suspense>} />

      {/* Care — Hand N Hand wellbeing */}
      <Route path="/care" element={<Suspense fallback={null}><CarePage /></Suspense>} />

      {/* Safety — mobile-first, no desktop sidebar wrapper */}
      <Route path="/safety/setup" element={<Suspense fallback={null}><SafetySeedScreen standalone /></Suspense>} />
      <Route path="/safety/*" element={<Suspense fallback={null}><SafetyPage /></Suspense>} />
      <Route path="/safety/report" element={<Suspense fallback={null}><SafetyPage /></Suspense>} />
      <Route path="/safety/resources" element={<PageRoute pageKey="Care" />} />
      <Route path="/calendar/*" element={<PageRoute pageKey="Calendar" />} />
      <Route path="/scan/*" element={<PageRoute pageKey="Scan" />} />
      <Route path="/community/*" element={<PageRoute pageKey="Community" />} />
      <Route path="/leaderboard/*" element={<PageRoute pageKey="Leaderboard" />} />

      {/* Notifications/account aliases */}
      <Route path="/notifications" element={<Navigate to={createPageUrl('Settings')} replace />} />
      <Route path="/notifications/*" element={<Navigate to={createPageUrl('Settings')} replace />} />
      <Route path="/notifications/settings" element={<PageRoute pageKey="Settings" />} />
      <Route path="/account" element={<Navigate to={createPageUrl('Settings')} replace />} />
      <Route path="/account/profile" element={<Navigate to={createPageUrl('EditProfile')} replace />} />
      <Route path="/account/membership" element={<Navigate to={createPageUrl('MembershipUpgrade')} replace />} />
      <Route path="/account/upgrade" element={<Navigate to={createPageUrl('MembershipUpgrade')} replace />} />
      <Route path="/account/billing" element={<Navigate to={createPageUrl('MembershipUpgrade')} replace />} />
      <Route path="/account/receipts" element={<Navigate to={createPageUrl('MembershipUpgrade')} replace />} />
      <Route path="/account/delete" element={<PageRoute pageKey="AccountDeletion" />} />
      <Route path="/account/export" element={<PageRoute pageKey="DataExport" />} />
      <Route path="/account/consents" element={<PageRoute pageKey="AccountConsents" />} />
      <Route path="/account/data" element={<Navigate to={createPageUrl('AccountConsents')} replace />} />
      <Route path="/account/data/*" element={<Navigate to={createPageUrl('AccountConsents')} replace />} />

      {/* Help & Support */}
      <Route path="/help" element={<PageRoute pageKey="HelpCenter" />} />
      <Route path="/support" element={<PageRoute pageKey="Contact" />} />
      
      {/* Membership & Pricing */}
      <Route path="/membership" element={<PageRoute pageKey="MembershipUpgrade" />} />
      <Route path="/upgrade" element={<PageRoute pageKey="MembershipUpgrade" />} />
      <Route path="/pricing" element={<PageRoute pageKey="Pricing" />} />
      <Route path="/fees" element={<PageRoute pageKey="Pricing" />} />
      
      {/* Admin dashboard */}
      <Route path="/admin" element={<PageRoute pageKey="AdminDashboard" />} />
      <Route path="/admin/moderation" element={<Suspense fallback={null}><ModerationPage /></Suspense>} />
      <Route path="/admin/*" element={<PageRoute pageKey="AdminDashboard" />} />

      {/* Business dashboard */}
      <Route path="/biz" element={<PageRoute pageKey="BusinessDashboard" />} />
      <Route path="/biz/dashboard" element={<PageRoute pageKey="BusinessDashboard" />} />
      <Route path="/biz/analytics" element={<PageRoute pageKey="BusinessAnalytics" />} />
      <Route path="/biz/onboarding" element={<PageRoute pageKey="BusinessOnboarding" />} />

      {/* Legacy lowercase routes -> canonical V1.5 routes */}
      {/* /radio and /radio/schedule already declared above as PageRoutes (no duplicate needed) */}
      <Route path="/connect" element={<Navigate to={createPageUrl('Social')} replace />} />
      <Route path="/connect/*" element={<Navigate to={createPageUrl('Social')} replace />} />
      <Route path="/marketplace" element={<Navigate to="/market" replace />} />
      <Route path="/marketplace/p/:handle" element={<ShopProductRoute />} />
      {/* /more/beacons/* routes declared above at lines 410-413 */}
      <Route path="/age" element={<PageRoute pageKey="AgeGate" />} />
      <Route path="/safety" element={<Suspense fallback={null}><SafetyPage /></Suspense>} />
      <Route path="/calendar" element={<PageRoute pageKey="Calendar" />} />
      <Route path="/scan" element={<PageRoute pageKey="Scan" />} />
      <Route path="/saved" element={<PageRoute pageKey="Bookmarks" />} />
      <Route path="/leaderboard" element={<PageRoute pageKey="Leaderboard" />} />
      <Route path="/community" element={<PageRoute pageKey="Community" />} />
      <Route path="/profiles" element={<PageRoute pageKey="ProfilesGrid" />} />

      {/* Backward-compatible auto-generated /PageName routes */}
      {Object.entries(Pages).map(([path, Page]) => {
        if (isProdBuild && !LEGACY_PAGE_ROUTE_ALLOWLIST.has(path)) {
          return null;
        }

        if (path === 'Marketplace') {
          return <Route key={path} path={`/${path}`} element={<Navigate to="/market" replace />} />;
        }

        if (path === 'ProductDetail') {
          return <Route key={path} path={`/${path}`} element={<ProductDetailGate />} />;
        }

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
          <BootGuardProvider>
            <QueryClientProvider client={queryClientInstance}>
              <WorldPulseProvider>
                <ShopCartProvider>
                  <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <SOSProvider>
                      <SheetProvider>
                        <NavigationTracker />
                        <GlobeProvider>
                          <BootRouter>
                            {/*
                              L0-L3 Layered OS Architecture
                              - UnifiedGlobe is persistent, never unmounts
                              - All navigation happens via SheetContext
                              - Router only handles URL sync, not page mounts
                            */}
                            <RadioProvider>
                              <MusicPlayerProvider>
                                <PersonaProvider>
                                  <OSArchitecture />
                                </PersonaProvider>
                              </MusicPlayerProvider>
                            </RadioProvider>
                          </BootRouter>
                        </GlobeProvider>
                        {/* L2 Sheet System - Renders over everything, outside route remount boundary */}
                        <SheetRouter />
                      </SheetProvider>
                    </SOSProvider>
                  </Router>
                </ShopCartProvider>
              </WorldPulseProvider>
              <Toaster />
              {/* PIN Lock Overlay - Z-200, above everything */}
              <PinLockOverlay />
            </QueryClientProvider>
          </BootGuardProvider>
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
  // Initialize dynamic viewport height for mobile browsers
  useViewportHeight();
  // Register service worker + request push permission on first load
  usePushNotifications();
  // Auto-open sheets from push notification deep links (?sheet=...)
  useDeepLinkSheet();
  // Update User.last_seen every 5 min — powers online presence dots on Ghosted grid
  usePresenceHeartbeat();
  // iOS-style edge swipe to go back
  useSwipeBack();
  const { sosActive, triggerSOS, clearSOS } = useSOSContext();
  const { isAuthenticated } = useBootGuard();
  const location = useLocation();
  const { closeSheet, sheetStack } = useSheet();

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

  // Hide mini player when on /radio — full player is visible there
  const onRadioRoute = location.pathname === '/radio' || location.pathname.startsWith('/radio/');

  return (
    <div className="hotmess-os relative h-dvh w-full overflow-hidden bg-[#050507]">
      {/* L0: Persistent Globe Layer (Z-0) */}
      <UnifiedGlobe />

      {/* L1-L3: Everything else — absolute, covers globe, full-height */}
      <div className="absolute inset-0 z-10 h-full w-full">
        <AuthenticatedApp />
      </div>

      {/* Radio Mini Player — sits just above OSBottomNav (Z-40) */}
      <RadioMiniPlayer hidden={onRadioRoute} />

      {/* Music Mini Player — sits just above OSBottomNav (Z-50) */}
      <MusicMiniPlayer />

      {/* Global Ticker — scrolling banner strip above nav */}
      <GlobalTicker className="fixed left-0 right-0 z-[45]" style={{ bottom: '83px' }} />

      {/* L1: OS Bottom Nav — amber-circle 5-tab nav */}
      <OSBottomNav />

      {/* L3: SOS long-press trigger — auth only (Z-190) */}
      {isAuthenticated && (
        <SOSButton
          className="fixed bottom-24 right-4 z-[190]"
          onTrigger={triggerSOS}
        />
      )}

      {/* L3: Shake-to-SOS — auth only */}
      {isAuthenticated && <ShakeSOS />}

      {/* L3: SOS Overlay — blocks entire OS, stops all sharing (Z-200) */}
      {sosActive && <SOSOverlay onClose={clearSOS} />}

      {/* Incoming call banner — auth only */}
      {isAuthenticated && <IncomingCallBanner />}

      {/* Aftercare nudge — triggered by check-in expiry */}
      <AftercareNudge isOpen={showAftercare} onClose={() => setShowAftercare(false)} />

      {/* GDPR Cookie Banner — shows once, persists choice */}
      <CookieBanner />
    </div>
  );
}

export default App
