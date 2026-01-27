/**
 * Lazy Loading Pages Configuration
 * 
 * This file provides route-based code splitting using React.lazy().
 * Each page is loaded only when the user navigates to it.
 * 
 * To use this instead of the static config:
 * 1. Rename pages.config.js to pages.config.static.js
 * 2. Rename this file to pages.config.js
 * 
 * Or import directly where needed:
 * import { pagesConfig } from './pages.config.lazy';
 */

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-black flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="w-8 h-8 text-[#E62020] animate-spin mx-auto mb-4" />
      <p className="text-white/60">Loading...</p>
    </div>
  </div>
);

// Higher-order component to wrap lazy components with Suspense
const withSuspense = (LazyComponent) => {
  return function SuspenseWrapper(props) {
    return (
      <Suspense fallback={<PageLoader />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
};

// Lazy-loaded pages
// Core pages - frequently accessed, load with prefetch hint
const Home = lazy(() => import('./pages/Home'));
const Auth = lazy(() => import('./pages/Auth'));
const Social = lazy(() => import('./pages/Social'));
const Events = lazy(() => import('./pages/Events'));
const Messages = lazy(() => import('./pages/Messages'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));

// Secondary pages - load on demand
const AccountConsents = lazy(() => import('./pages/AccountConsents'));
const AccountDeletion = lazy(() => import('./pages/AccountDeletion'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AgeGate = lazy(() => import('./pages/AgeGate'));
const BeaconDetail = lazy(() => import('./pages/BeaconDetail'));
const Beacons = lazy(() => import('./pages/Beacons'));
const Bookmarks = lazy(() => import('./pages/Bookmarks'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Care = lazy(() => import('./pages/Care'));
const Challenges = lazy(() => import('./pages/Challenges'));
const Chat = lazy(() => import('./pages/Chat'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Community = lazy(() => import('./pages/Community'));
const CommunityGuidelines = lazy(() => import('./pages/CommunityGuidelines'));
const Connect = lazy(() => import('./pages/Connect'));
const Contact = lazy(() => import('./pages/Contact'));
const CreateBeacon = lazy(() => import('./pages/CreateBeacon'));
const DataExport = lazy(() => import('./pages/DataExport'));
const DesignSystem = lazy(() => import('./pages/DesignSystem'));
const DialADaddy = lazy(() => import('./pages/DialADaddy'));
const Directions = lazy(() => import('./pages/Directions'));
const EditBeacon = lazy(() => import('./pages/EditBeacon'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const Feed = lazy(() => import('./pages/Feed'));
const Globe = lazy(() => import('./pages/Globe'));
const HandNHand = lazy(() => import('./pages/HandNHand'));
const HelpCenter = lazy(() => import('./pages/HelpCenter'));
const Hnhmess = lazy(() => import('./pages/Hnhmess'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Login = lazy(() => import('./pages/Login'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const MembershipUpgrade = lazy(() => import('./pages/MembershipUpgrade'));
const More = lazy(() => import('./pages/More'));
const Music = lazy(() => import('./pages/Music'));
const MusicRelease = lazy(() => import('./pages/MusicRelease'));
const MyEvents = lazy(() => import('./pages/MyEvents'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const OnboardingGate = lazy(() => import('./pages/OnboardingGate'));
const OrderHistory = lazy(() => import('./pages/OrderHistory'));
const OrganizerDashboard = lazy(() => import('./pages/OrganizerDashboard'));
const OrganizerAnalyticsDashboard = lazy(() => import('./pages/OrganizerAnalyticsDashboard'));
const PersonaManagement = lazy(() => import('./pages/PersonaManagement'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const ProductDetail = lazy(() => import('./pages/ProductDetail'));
const ProfilesGrid = lazy(() => import('./pages/ProfilesGrid'));
const PromoteToAdmin = lazy(() => import('./pages/PromoteToAdmin'));
const Radio = lazy(() => import('./pages/Radio'));
const RadioSchedule = lazy(() => import('./pages/RadioSchedule'));
const RadioShow = lazy(() => import('./pages/RadioShow'));
const ReactBitsProfileCardDemo = lazy(() => import('./pages/ReactBitsProfileCardDemo'));
const RightNowDashboard = lazy(() => import('./pages/RightNowDashboard'));
const Safety = lazy(() => import('./pages/Safety'));
const Scan = lazy(() => import('./pages/Scan'));
const SellerDashboard = lazy(() => import('./pages/SellerDashboard'));
const SellerOnboarding = lazy(() => import('./pages/SellerOnboarding'));
const SquadChat = lazy(() => import('./pages/SquadChat'));
const Stats = lazy(() => import('./pages/Stats'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const TicketMarketplace = lazy(() => import('./pages/TicketMarketplace'));
const TicketReseller = lazy(() => import('./pages/TicketReseller'));
const WakeTheMess = lazy(() => import('./pages/WakeTheMess'));

// Business pages
const BusinessAdvertising = lazy(() => import('./pages/biz/BusinessAdvertising'));
const BusinessAnalytics = lazy(() => import('./pages/biz/BusinessAnalytics'));
const BusinessDashboard = lazy(() => import('./pages/biz/BusinessDashboard'));
const BusinessOnboarding = lazy(() => import('./pages/biz/BusinessOnboarding'));

// Layout - loaded immediately as it's needed for all pages
import __Layout from './Layout.jsx';

// Wrap all lazy components with Suspense
export const PAGES = {
  "AccountConsents": withSuspense(AccountConsents),
  "AccountDeletion": withSuspense(AccountDeletion),
  "AdminDashboard": withSuspense(AdminDashboard),
  "AgeGate": withSuspense(AgeGate),
  "Auth": withSuspense(Auth),
  "BeaconDetail": withSuspense(BeaconDetail),
  "Beacons": withSuspense(Beacons),
  "Bookmarks": withSuspense(Bookmarks),
  "BusinessAdvertising": withSuspense(BusinessAdvertising),
  "BusinessAnalytics": withSuspense(BusinessAnalytics),
  "BusinessDashboard": withSuspense(BusinessDashboard),
  "BusinessOnboarding": withSuspense(BusinessOnboarding),
  "Calendar": withSuspense(Calendar),
  "Care": withSuspense(Care),
  "Challenges": withSuspense(Challenges),
  "Chat": withSuspense(Chat),
  "Checkout": withSuspense(Checkout),
  "Community": withSuspense(Community),
  "CommunityGuidelines": withSuspense(CommunityGuidelines),
  "Connect": withSuspense(Connect),
  "Contact": withSuspense(Contact),
  "CreateBeacon": withSuspense(CreateBeacon),
  "DataExport": withSuspense(DataExport),
  "DesignSystem": withSuspense(DesignSystem),
  "DialADaddy": withSuspense(DialADaddy),
  "Directions": withSuspense(Directions),
  "EditBeacon": withSuspense(EditBeacon),
  "EditProfile": withSuspense(EditProfile),
  "Events": withSuspense(Events),
  "Feed": withSuspense(Feed),
  "Globe": withSuspense(Globe),
  "HandNHand": withSuspense(HandNHand),
  "HelpCenter": withSuspense(HelpCenter),
  "Home": withSuspense(Home),
  "Hnhmess": withSuspense(Hnhmess),
  "Leaderboard": withSuspense(Leaderboard),
  "Login": withSuspense(Login),
  "Marketplace": withSuspense(Marketplace),
  "MembershipUpgrade": withSuspense(MembershipUpgrade),
  "Messages": withSuspense(Messages),
  "More": withSuspense(More),
  "Music": withSuspense(Music),
  "MusicRelease": withSuspense(MusicRelease),
  "MyEvents": withSuspense(MyEvents),
  "Onboarding": withSuspense(Onboarding),
  "OnboardingGate": withSuspense(OnboardingGate),
  "OrderHistory": withSuspense(OrderHistory),
  "OrganizerDashboard": withSuspense(OrganizerDashboard),
  "OrganizerAnalyticsDashboard": withSuspense(OrganizerAnalyticsDashboard),
  "PersonaManagement": withSuspense(PersonaManagement),
  "PrivacyPolicy": withSuspense(PrivacyPolicy),
  "ProductDetail": withSuspense(ProductDetail),
  "Profile": withSuspense(Profile),
  "ProfilesGrid": withSuspense(ProfilesGrid),
  "PromoteToAdmin": withSuspense(PromoteToAdmin),
  "Pulse": withSuspense(Globe),
  "Radio": withSuspense(Radio),
  "RadioSchedule": withSuspense(RadioSchedule),
  "RadioShow": withSuspense(RadioShow),
  "ReactBitsProfileCardDemo": withSuspense(ReactBitsProfileCardDemo),
  "RightNowDashboard": withSuspense(RightNowDashboard),
  "Safety": withSuspense(Safety),
  "Scan": withSuspense(Scan),
  "SellerDashboard": withSuspense(SellerDashboard),
  "SellerOnboarding": withSuspense(SellerOnboarding),
  "Settings": withSuspense(Settings),
  "Social": withSuspense(Social),
  "SquadChat": withSuspense(SquadChat),
  "Stats": withSuspense(Stats),
  "TermsOfService": withSuspense(TermsOfService),
  "TicketMarketplace": withSuspense(TicketMarketplace),
  "TicketReseller": withSuspense(TicketReseller),
  "WakeTheMess": withSuspense(WakeTheMess),
};

export const pagesConfig = {
  mainPage: "Home",
  Pages: PAGES,
  Layout: __Layout,
};

/**
 * Prefetch a page
 * Call this on hover or when you know the user is likely to navigate
 */
export function prefetchPage(pageName) {
  const pageImports = {
    "Home": () => import('./pages/Home'),
    "Social": () => import('./pages/Social'),
    "Events": () => import('./pages/Events'),
    "Messages": () => import('./pages/Messages'),
    "Profile": () => import('./pages/Profile'),
    "Settings": () => import('./pages/Settings'),
    "Marketplace": () => import('./pages/Marketplace'),
    "Radio": () => import('./pages/Radio'),
    "More": () => import('./pages/More'),
    // Add more pages as needed
  };
  
  const importFn = pageImports[pageName];
  if (importFn) {
    importFn(); // Trigger the import
  }
}

/**
 * Prefetch commonly accessed pages
 * Call this after initial page load
 */
export function prefetchCommonPages() {
  // Use requestIdleCallback for non-blocking prefetch
  const prefetch = window.requestIdleCallback || ((cb) => setTimeout(cb, 1));
  
  prefetch(() => {
    prefetchPage('Social');
    prefetchPage('Events');
    prefetchPage('Messages');
  });
}

export default pagesConfig;
