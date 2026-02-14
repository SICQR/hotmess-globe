import { Toaster } from "@/components/ui/sonner"
import { useEffect, useState } from 'react'
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
import { I18nProvider } from '@/contexts/I18nContext';
import { WorldPulseProvider } from '@/contexts/WorldPulseContext';
import { PageTransition } from '@/components/lux/PageTransition';

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
  // Render the main app with LED Brutalist page transitions
  return (
    <PageTransition>
      <Routes>
      {/* V1.5 canonical routes (Bible) */}
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      <Route path="/auth" element={<PageRoute pageKey="Auth" />} />
      <Route path="/auth/*" element={<PageRoute pageKey="Auth" />} />
      <Route path="/onboarding" element={<PageRoute pageKey="OnboardingGate" />} />
      <Route path="/onboarding/*" element={<PageRoute pageKey="OnboardingGate" />} />
      <Route path="/pulse" element={<PageRoute pageKey="Pulse" />} />
      <Route path="/events" element={<PageRoute pageKey="Events" />} />
      <Route path="/events/:id" element={<EventDetailRedirect />} />
      {/* Market (canonical) -> headless Shopify shop */}
      <Route path="/market" element={<ShopHomeRoute />} />
      <Route path="/market/creators" element={<CreatorsMarketRoute />} />
      <Route path="/market/creators/p/:id" element={<CreatorsProductRoute />} />
      <Route path="/market/creators/cart" element={<CreatorsCartRoute />} />
      <Route path="/market/creators/checkout" element={<CreatorsCheckoutRoute />} />
      <Route path="/market/creators/checkout-success" element={<CreatorsCheckoutSuccessRoute />} />
      <Route path="/market/:collection" element={<ShopCollectionRoute />} />
      <Route path="/market/p/:handle" element={<ShopProductRoute />} />
      <Route path="/social" element={<PageRoute pageKey="Social" />} />
      <Route path="/social/discover" element={<SocialDiscoverRedirect />} />
      <Route path="/social/inbox" element={<PageRoute pageKey="Messages" />} />
      <Route path="/social/u/:id" element={<SocialUserRedirect />} />
      <Route path="/social/t/:threadId" element={<SocialThreadRedirect />} />
      <Route path="/music" element={<PageRoute pageKey="Music" />} />
      <Route path="/music/live" element={<PageRoute pageKey="Radio" />} />
      <Route path="/music/shows" element={<PageRoute pageKey="RadioSchedule" />} />
      <Route path="/music/shows/:show/episodes" element={<Navigate to={createPageUrl('RadioSchedule')} replace />} />
      <Route path="/music/shows/:show/episodes/:id" element={<Navigate to={createPageUrl('RadioSchedule')} replace />} />
      <Route path="/music/shows/:slug" element={<ShowHeroRedirect />} />
      <Route path="/music/schedule" element={<PageRoute pageKey="RadioSchedule" />} />
      <Route path="/music/releases" element={<PageRoute pageKey="Music" />} />
      <Route path="/music/releases/:slug" element={<PageRoute pageKey="MusicRelease" />} />
      <Route path="/music/tracks" element={<Navigate to={createPageUrl('Music')} replace />} />
      <Route path="/music/tracks/:id" element={<Navigate to={createPageUrl('Music')} replace />} />
      <Route path="/music/playlists" element={<Navigate to={createPageUrl('Music')} replace />} />
      <Route path="/music/playlists/:id" element={<Navigate to={createPageUrl('Music')} replace />} />
      <Route path="/music/artists" element={<Navigate to={createPageUrl('Music')} replace />} />
      <Route path="/music/artists/:id" element={<Navigate to={createPageUrl('Music')} replace />} />
      <Route path="/music/clips/:id" element={<Navigate to={createPageUrl('Music')} replace />} />
      <Route path="/hnhmess" element={<PageRoute pageKey="Hnhmess" />} />
      <Route path="/more" element={<PageRoute pageKey="More" />} />
      <Route path="/directions" element={<PageRoute pageKey="Directions" />} />
      
      {/* Auth sub-routes */}
      <Route path="/auth/sign-in" element={<PageRoute pageKey="Auth" />} />
      <Route path="/auth/sign-up" element={<PageRoute pageKey="Auth" />} />
      <Route path="/auth/magic-link" element={<PageRoute pageKey="Auth" />} />
      <Route path="/auth/verify" element={<PageRoute pageKey="Auth" />} />
      <Route path="/auth/reset" element={<PageRoute pageKey="Auth" />} />
      
      {/* Onboarding sub-routes */}
      <Route path="/onboarding" element={<PageRoute pageKey="Onboarding" />} />
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
      <Route path="/more/vault" element={<PageRoute pageKey="Vault" />} />
      <Route path="/vault" element={<PageRoute pageKey="Vault" />} />
      <Route path="/more/challenges" element={<PageRoute pageKey="Challenges" />} />
      <Route path="/more/settings" element={<PageRoute pageKey="Settings" />} />
      <Route path="/more/care" element={<PageRoute pageKey="Care" />} />

      {/* Settings */}
      <Route path="/settings" element={<PageRoute pageKey="Settings" />} />
      <Route path="/settings/privacy" element={<PageRoute pageKey="Settings" />} />
      <Route path="/settings/notifications" element={<PageRoute pageKey="Settings" />} />
      <Route path="/settings/account" element={<PageRoute pageKey="Settings" />} />

      {/* Bible-friendly safety/calendar/scan subroutes */}
      <Route path="/safety/*" element={<PageRoute pageKey="Safety" />} />
      <Route path="/safety/report" element={<PageRoute pageKey="Safety" />} />
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
      <Route path="/admin/*" element={<PageRoute pageKey="AdminDashboard" />} />

      {/* Business dashboard */}
      <Route path="/biz" element={<PageRoute pageKey="BusinessDashboard" />} />
      <Route path="/biz/dashboard" element={<PageRoute pageKey="BusinessDashboard" />} />
      <Route path="/biz/analytics" element={<PageRoute pageKey="BusinessAnalytics" />} />
      <Route path="/biz/onboarding" element={<PageRoute pageKey="BusinessOnboarding" />} />

      {/* Legacy lowercase routes -> canonical V1.5 routes */}
      <Route path="/radio" element={<Navigate to={createPageUrl('Radio')} replace />} />
      <Route path="/radio/schedule" element={<Navigate to={createPageUrl('RadioSchedule')} replace />} />
      <Route path="/connect" element={<Navigate to={createPageUrl('Social')} replace />} />
      <Route path="/connect/*" element={<Navigate to={createPageUrl('Social')} replace />} />
      <Route path="/marketplace" element={<Navigate to="/market" replace />} />
      <Route path="/marketplace/p/:handle" element={<ShopProductRoute />} />
      <Route path="/more/beacons" element={<PageRoute pageKey="Beacons" />} />
      <Route path="/more/beacons/new" element={<PageRoute pageKey="CreateBeacon" />} />
      <Route path="/more/beacons/:id" element={<EventDetailRedirect />} />
      <Route path="/age" element={<PageRoute pageKey="AgeGate" />} />
      <Route path="/safety" element={<PageRoute pageKey="Safety" />} />
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
        <BootGuardProvider>
          <QueryClientProvider client={queryClientInstance}>
            <WorldPulseProvider>
              <ShopCartProvider>
                <Router>
                  <NavigationTracker />
                  <BootRouter>
                    <AuthenticatedApp />
                  </BootRouter>
                </Router>
              </ShopCartProvider>
            </WorldPulseProvider>
            <Toaster />
          </QueryClientProvider>
        </BootGuardProvider>
      </AuthProvider>
    </I18nProvider>
  )
}

export default App
