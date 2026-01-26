import { Toaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate, useParams, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { createPageUrl } from './utils';

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

const ProductDetailRedirect = () => {
  const { handle } = useParams();
  const target = `${createPageUrl('ProductDetail')}?handle=${encodeURIComponent(handle ?? '')}`;
  return <Navigate to={target} replace />;
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

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Allow the Auth page (and recovery links) to render without forcing a redirect loop.
      const isOnAuthRoute = (location?.pathname || '').toLowerCase().startsWith('/auth');
      if (!isOnAuthRoute) {
        // Redirect to login automatically
        navigateToLogin();
        return null;
      }
    }
  }

  // Render the main app
  return (
    <Routes>
      {/* V1.5 canonical routes (Bible) */}
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      <Route path="/pulse" element={<PageRoute pageKey="Pulse" />} />
      <Route path="/events" element={<PageRoute pageKey="Events" />} />
      <Route path="/events/:id" element={<EventDetailRedirect />} />
      <Route path="/market" element={<PageRoute pageKey="Marketplace" />} />
      <Route path="/market/p/:handle" element={<ProductDetailRedirect />} />
      <Route path="/social" element={<PageRoute pageKey="Social" />} />
      <Route path="/social/inbox" element={<PageRoute pageKey="Messages" />} />
      <Route path="/music" element={<PageRoute pageKey="Music" />} />
      <Route path="/music/live" element={<PageRoute pageKey="Radio" />} />
      <Route path="/music/shows" element={<PageRoute pageKey="RadioSchedule" />} />
      <Route path="/music/shows/:slug" element={<ShowHeroRedirect />} />
      <Route path="/music/schedule" element={<PageRoute pageKey="RadioSchedule" />} />
      <Route path="/music/releases" element={<PageRoute pageKey="Music" />} />
      <Route path="/music/releases/:slug" element={<PageRoute pageKey="MusicRelease" />} />
      <Route path="/hnhmess" element={<PageRoute pageKey="Hnhmess" />} />
      <Route path="/more" element={<PageRoute pageKey="More" />} />
      
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
      
      {/* Orders and checkout */}
      <Route path="/orders" element={<PageRoute pageKey="OrderHistory" />} />
      <Route path="/checkout" element={<PageRoute pageKey="Checkout" />} />
      
      {/* Social profile routes */}
      <Route path="/social/u/:email" element={<ProfileRedirect />} />
      <Route path="/social/discover" element={<PageRoute pageKey="Social" />} />
      
      {/* More stack sub-routes */}
      <Route path="/more/stats" element={<PageRoute pageKey="Stats" />} />
      <Route path="/more/challenges" element={<PageRoute pageKey="Challenges" />} />
      <Route path="/more/settings" element={<PageRoute pageKey="Settings" />} />
      <Route path="/more/care" element={<PageRoute pageKey="Care" />} />
      
      {/* Settings */}
      <Route path="/settings" element={<PageRoute pageKey="Settings" />} />
      <Route path="/settings/privacy" element={<PageRoute pageKey="Settings" />} />
      <Route path="/settings/notifications" element={<PageRoute pageKey="Settings" />} />
      <Route path="/settings/account" element={<PageRoute pageKey="Settings" />} />
      
      {/* Notifications */}
      <Route path="/notifications" element={<PageRoute pageKey="Settings" />} />
      <Route path="/notifications/settings" element={<PageRoute pageKey="Settings" />} />
      
      {/* Legal pages */}
      <Route path="/terms" element={<PageRoute pageKey="TermsOfService" />} />
      <Route path="/privacy" element={<PageRoute pageKey="PrivacyPolicy" />} />
      <Route path="/guidelines" element={<PageRoute pageKey="CommunityGuidelines" />} />
      <Route path="/contact" element={<PageRoute pageKey="Contact" />} />
      
      {/* Help & Support */}
      <Route path="/help" element={<PageRoute pageKey="HelpCenter" />} />
      <Route path="/support" element={<PageRoute pageKey="Contact" />} />
      
      {/* Safety routes */}
      <Route path="/safety/report" element={<PageRoute pageKey="Safety" />} />
      <Route path="/safety/resources" element={<PageRoute pageKey="Care" />} />
      
      {/* Account management */}
      <Route path="/account/delete" element={<PageRoute pageKey="AccountDeletion" />} />
      <Route path="/account/export" element={<PageRoute pageKey="DataExport" />} />
      <Route path="/account/consents" element={<PageRoute pageKey="AccountConsents" />} />
      
      {/* Membership */}
      <Route path="/membership" element={<PageRoute pageKey="MembershipUpgrade" />} />
      <Route path="/upgrade" element={<PageRoute pageKey="MembershipUpgrade" />} />
      
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
      <Route path="/marketplace" element={<Navigate to={createPageUrl('Marketplace')} replace />} />
      <Route path="/marketplace/p/:handle" element={<ProductDetailRedirect />} />
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

      {/* Backward-compatible auto-generated /PageName routes */}
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
