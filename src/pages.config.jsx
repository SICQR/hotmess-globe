import { lazy, Suspense } from 'react';
import AccountConsents from './pages/AccountConsents';
import AccountDeletion from './pages/AccountDeletion';
import AgeGate from './pages/AgeGate';
import CommunityGuidelines from './pages/CommunityGuidelines';
import Contact from './pages/Contact';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Auth from './pages/Auth';
import BeaconDetail from './pages/BeaconDetail';
import Beacons from './pages/Beacons';
import Bookmarks from './pages/Bookmarks';
import Calendar from './pages/Calendar';
import Care from './pages/Care';
import Challenges from './pages/Challenges';
import Chat from './pages/Chat';
import Checkout from './pages/Checkout';
import Community from './pages/Community';
import Connect from './pages/Connect';
import CreateBeacon from './pages/CreateBeacon';
import DataExport from './pages/DataExport';
import DialADaddy from './pages/DialADaddy';
import Directions from './pages/Directions';
import EditBeacon from './pages/EditBeacon';
import EditProfile from './pages/EditProfile';
import Events from './pages/Events';
import Feed from './pages/Feed';
import HandNHand from './pages/HandNHand';
import HelpCenter from './pages/HelpCenter';
import Home from './pages/Home';
import Hnhmess from './pages/Hnhmess';
import Leaderboard from './pages/Leaderboard';
import Login from './pages/Login';
import Marketplace from './pages/Marketplace';
import MembershipUpgrade from './pages/MembershipUpgrade';
import Messages from './pages/Messages';
import More from './pages/More';
import Music from './pages/Music';
import MusicRelease from './pages/MusicRelease';
import MyEvents from './pages/MyEvents';
import Onboarding from './pages/Onboarding';
import OnboardingGate from './pages/OnboardingGate';
import OrderHistory from './pages/OrderHistory';
import ProductDetail from './pages/ProductDetail';
import Profile from './pages/Profile';
import ProfileNew from './pages/ProfileNew';
import ProfilesGrid from './pages/ProfilesGrid';
import ProfileSetup from './pages/ProfileSetup';
import PromoteToAdmin from './pages/PromoteToAdmin';
import Pulse from './pages/Pulse';
import Radio from './pages/Radio';
import RadioSchedule from './pages/RadioSchedule';
import RecordManager from './pages/RecordManager';
import RightNowDashboard from './pages/RightNowDashboard';
import Safety from './pages/Safety';
import Scan from './pages/Scan';
import Settings from './pages/Settings';
import Social from './pages/Social';
import Stats from './pages/Stats';
import TicketMarketplace from './pages/TicketMarketplace';
import { Tickets, TicketDetail, TicketChat } from './pages/tickets';
import WakeTheMess from './pages/WakeTheMess';
import Welcome from './pages/Welcome';
import __Layout from './Layout.jsx';

// Lazy-loaded pages (heavy/admin/business - not loaded until needed)
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const BusinessAnalytics = lazy(() => import('./pages/biz/BusinessAnalytics'));
const BusinessDashboard = lazy(() => import('./pages/biz/BusinessDashboard'));
const BusinessOnboarding = lazy(() => import('./pages/biz/BusinessOnboarding'));
const Globe = lazy(() => import('./pages/Globe'));
const OrganizerDashboard = lazy(() => import('./pages/OrganizerDashboard'));
const SellerDashboard = lazy(() => import('./pages/SellerDashboard'));
const BusinessGlobe = lazy(() => import('./pages/business/BusinessGlobe'));
const BusinessAmplify = lazy(() => import('./pages/business/BusinessAmplify'));
const BusinessInsights = lazy(() => import('./pages/business/BusinessInsights'));
const CadencePanel = lazy(() => import('./pages/admin/CadencePanel'));
const CityReadiness = lazy(() => import('./pages/admin/CityReadiness'));
const CreatorDashboard = lazy(() => import('./pages/creator/CreatorDashboard'));

// Suspense wrapper for lazy components
const withSuspense = (Component) => (props) => (
  <Suspense fallback={
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#FF1493] border-t-transparent rounded-full animate-spin" />
    </div>
  }>
    <Component {...props} />
  </Suspense>
);


export const PAGES = {
    "AccountConsents": AccountConsents,
    "AccountDeletion": AccountDeletion,
    "AdminDashboard": withSuspense(AdminDashboard),
    "AgeGate": AgeGate,
    "Auth": Auth,
    "BeaconDetail": BeaconDetail,
    "Beacons": Beacons,
    "Bookmarks": Bookmarks,
    "BusinessAnalytics": withSuspense(BusinessAnalytics),
    "BusinessDashboard": withSuspense(BusinessDashboard),
    "BusinessOnboarding": withSuspense(BusinessOnboarding),
    "Calendar": Calendar,
    "Care": Care,
    "Challenges": Challenges,
    "Chat": Chat,
    "Checkout": Checkout,
    "Community": Community,
    "CommunityGuidelines": CommunityGuidelines,
    "Connect": Connect,
    "Contact": Contact,
    "CreateBeacon": CreateBeacon,
    "DataExport": DataExport,
    "DialADaddy": DialADaddy,
    "Directions": Directions,
    "EditBeacon": EditBeacon,
    "EditProfile": EditProfile,
    "Events": Events,
    "Feed": Feed,
    "Globe": withSuspense(Globe),
    "HandNHand": HandNHand,
    "HelpCenter": HelpCenter,
    "Home": Home,
    "Hnhmess": Hnhmess,
    "Leaderboard": Leaderboard,
    "Login": Login,
    "Marketplace": Marketplace,
    "MembershipUpgrade": MembershipUpgrade,
    "Messages": Messages,
    "More": More,
    "Music": Music,
    "MusicRelease": MusicRelease,
    "MyEvents": MyEvents,
    "Onboarding": Onboarding,
    "OnboardingGate": OnboardingGate,
    "OrderHistory": OrderHistory,
    "OrganizerDashboard": withSuspense(OrganizerDashboard),
    "ProductDetail": ProductDetail,
    "Profile": Profile,
    "ProfileNew": ProfileNew,
    "ProfilesGrid": ProfilesGrid,
    "ProfileSetup": ProfileSetup,
    "PromoteToAdmin": PromoteToAdmin,
    "Pulse": Pulse,
    "Radio": Radio,
    "RadioSchedule": RadioSchedule,
    "RecordManager": RecordManager,
    "RightNowDashboard": RightNowDashboard,
    "Safety": Safety,
    "Scan": Scan,
    "SellerDashboard": withSuspense(SellerDashboard),
    "Settings": Settings,
    "Social": Social,
    "Stats": Stats,
    "TermsOfService": TermsOfService,
    "TicketMarketplace": TicketMarketplace,
    "Tickets": Tickets,
    "TicketDetail": TicketDetail,
    "TicketChat": TicketChat,
    "WakeTheMess": WakeTheMess,
    "BusinessGlobe": withSuspense(BusinessGlobe),
    "BusinessAmplify": withSuspense(BusinessAmplify),
    "BusinessInsights": withSuspense(BusinessInsights),
    "CadencePanel": withSuspense(CadencePanel),
    "CityReadiness": withSuspense(CityReadiness),
    "CreatorDashboard": withSuspense(CreatorDashboard),
    "Welcome": Welcome,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};