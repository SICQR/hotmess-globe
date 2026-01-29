/**
 * Pages Configuration with Code Splitting
 * 
 * Heavy pages are lazy-loaded to reduce initial bundle size.
 * Critical pages (auth, legal) are eagerly loaded.
 */

import { lazyPage } from './lib/lazyWithSkeleton';

// ========================================
// EAGER LOADS - Small, critical pages
// ========================================
import AgeGate from './pages/AgeGate';
import Auth from './pages/Auth';
import Login from './pages/Login';
import OnboardingGate from './pages/OnboardingGate';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CommunityGuidelines from './pages/CommunityGuidelines';

// ========================================
// LAZY LOADS - Heavy pages with skeletons
// ========================================

// Home - Large page with many components
const Home = lazyPage.default(() => import('./pages/Home'));

// Globe/3D - Heavy 3D rendering
const Globe = lazyPage.globe(() => import('./pages/Globe'));
const Pulse = lazyPage.globe(() => import('./pages/Pulse'));

// Grid/Discovery pages
const Social = lazyPage.grid(() => import('./pages/Social'));
const Connect = lazyPage.grid(() => import('./pages/Connect'));
const ProfilesGrid = lazyPage.grid(() => import('./pages/ProfilesGrid'));
const Community = lazyPage.grid(() => import('./pages/Community'));

// Profile pages
const Profile = lazyPage.profile(() => import('./pages/Profile'));
const EditProfile = lazyPage.profile(() => import('./pages/EditProfile'));
const ProfileSetup = lazyPage.profile(() => import('./pages/ProfileSetup'));

// Messages/Chat
const Messages = lazyPage.messages(() => import('./pages/Messages'));
const Chat = lazyPage.messages(() => import('./pages/Chat'));
const SquadChat = lazyPage.messages(() => import('./pages/SquadChat'));

// Marketplace
const Marketplace = lazyPage.marketplace(() => import('./pages/Marketplace'));
const ProductDetail = lazyPage.marketplace(() => import('./pages/ProductDetail'));
const Checkout = lazyPage.marketplace(() => import('./pages/Checkout'));
const SellerDashboard = lazyPage.dashboard(() => import('./pages/SellerDashboard'));
const TicketMarketplace = lazyPage.marketplace(() => import('./pages/TicketMarketplace'));

// Events
const Events = lazyPage.events(() => import('./pages/Events'));
const Calendar = lazyPage.events(() => import('./pages/Calendar'));
const MyEvents = lazyPage.events(() => import('./pages/MyEvents'));
const EventsFeatures = lazyPage.events(() => import('./pages/EventsFeatures'));

// Dashboard pages
const AdminDashboard = lazyPage.dashboard(() => import('./pages/AdminDashboard'));
const OrganizerDashboard = lazyPage.dashboard(() => import('./pages/OrganizerDashboard'));
const RightNowDashboard = lazyPage.dashboard(() => import('./pages/RightNowDashboard'));
const Stats = lazyPage.dashboard(() => import('./pages/Stats'));
const Leaderboard = lazyPage.dashboard(() => import('./pages/Leaderboard'));

// Business pages
const BusinessDashboard = lazyPage.dashboard(() => import('./pages/biz/BusinessDashboard'));
const BusinessAnalytics = lazyPage.dashboard(() => import('./pages/biz/BusinessAnalytics'));
const BusinessOnboarding = lazyPage.dashboard(() => import('./pages/biz/BusinessOnboarding'));

// Music/Radio
const Music = lazyPage.default(() => import('./pages/Music'));
const MusicRelease = lazyPage.default(() => import('./pages/MusicRelease'));
const Radio = lazyPage.default(() => import('./pages/Radio'));
const RadioSchedule = lazyPage.default(() => import('./pages/RadioSchedule'));
const RadioFeatures = lazyPage.default(() => import('./pages/RadioFeatures'));
const RecordManager = lazyPage.dashboard(() => import('./pages/RecordManager'));

// Beacon pages
const Beacons = lazyPage.grid(() => import('./pages/Beacons'));
const BeaconDetail = lazyPage.default(() => import('./pages/BeaconDetail'));
const CreateBeacon = lazyPage.default(() => import('./pages/CreateBeacon'));
const EditBeacon = lazyPage.default(() => import('./pages/EditBeacon'));

// Other feature pages (lazy loaded)
const AccountConsents = lazyPage.default(() => import('./pages/AccountConsents'));
const AccountDeletion = lazyPage.default(() => import('./pages/AccountDeletion'));
const Bookmarks = lazyPage.grid(() => import('./pages/Bookmarks'));
const Care = lazyPage.default(() => import('./pages/Care'));
const Challenges = lazyPage.grid(() => import('./pages/Challenges'));
const Contact = lazyPage.default(() => import('./pages/Contact'));
const DataExport = lazyPage.default(() => import('./pages/DataExport'));
const DialADaddy = lazyPage.default(() => import('./pages/DialADaddy'));
const Directions = lazyPage.default(() => import('./pages/Directions'));
const Features = lazyPage.default(() => import('./pages/Features'));
const Feed = lazyPage.grid(() => import('./pages/Feed'));
const HandNHand = lazyPage.default(() => import('./pages/HandNHand'));
const HelpCenter = lazyPage.default(() => import('./pages/HelpCenter'));
const Hnhmess = lazyPage.default(() => import('./pages/Hnhmess'));
const MembershipUpgrade = lazyPage.default(() => import('./pages/MembershipUpgrade'));
const More = lazyPage.default(() => import('./pages/More'));
const Onboarding = lazyPage.default(() => import('./pages/Onboarding'));
const OrderHistory = lazyPage.default(() => import('./pages/OrderHistory'));
const PersonaFeatures = lazyPage.default(() => import('./pages/PersonaFeatures'));
const Pricing = lazyPage.default(() => import('./pages/Pricing'));
const PromoteToAdmin = lazyPage.default(() => import('./pages/PromoteToAdmin'));
const Safety = lazyPage.default(() => import('./pages/Safety'));
const SafetyFeatures = lazyPage.default(() => import('./pages/SafetyFeatures'));
const Scan = lazyPage.default(() => import('./pages/Scan'));
const Settings = lazyPage.default(() => import('./pages/Settings'));
const SocialFeatures = lazyPage.default(() => import('./pages/SocialFeatures'));
const WakeTheMess = lazyPage.default(() => import('./pages/WakeTheMess'));
const ReactBitsProfileCardDemo = lazyPage.default(() => import('./pages/ReactBitsProfileCardDemo'));

// Layout (eager - needed for all pages)
import __Layout from './Layout.jsx';


export const PAGES = {
    "AccountConsents": AccountConsents,
    "AccountDeletion": AccountDeletion,
    "AdminDashboard": AdminDashboard,
    "AgeGate": AgeGate,
    "Auth": Auth,
    "BeaconDetail": BeaconDetail,
    "Beacons": Beacons,
    "Bookmarks": Bookmarks,
    "BusinessAnalytics": BusinessAnalytics,
    "BusinessDashboard": BusinessDashboard,
    "BusinessOnboarding": BusinessOnboarding,
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
    "EventsFeatures": EventsFeatures,
    "Features": Features,
    "Feed": Feed,
    "Globe": Globe,
    "HandNHand": HandNHand,
    "HelpCenter": HelpCenter,
    "Home": Home,
    "Hnhmess": Hnhmess,
    "Leaderboard": Leaderboard,
    "Login": Login,
    "Marketplace": Marketplace,
    "MembershipUpgrade": MembershipUpgrade,
    "Messages": Messages,
    "Pricing": Pricing,
    "More": More,
    "Music": Music,
    "MusicRelease": MusicRelease,
    "MyEvents": MyEvents,
    "Onboarding": Onboarding,
    "OnboardingGate": OnboardingGate,
    "OrderHistory": OrderHistory,
    "OrganizerDashboard": OrganizerDashboard,
    "PersonaFeatures": PersonaFeatures,
    "ProductDetail": ProductDetail,
    "Profile": Profile,
    "ProfilesGrid": ProfilesGrid,
    "ProfileSetup": ProfileSetup,
    "PromoteToAdmin": PromoteToAdmin,
    "Pulse": Pulse,
    "Radio": Radio,
    "RadioFeatures": RadioFeatures,
    "RadioSchedule": RadioSchedule,
    "RecordManager": RecordManager,
    "ReactBitsProfileCardDemo": ReactBitsProfileCardDemo,
    "RightNowDashboard": RightNowDashboard,
    "Safety": Safety,
    "SafetyFeatures": SafetyFeatures,
    "Scan": Scan,
    "SellerDashboard": SellerDashboard,
    "Settings": Settings,
    "Social": Social,
    "SocialFeatures": SocialFeatures,
    "SquadChat": SquadChat,
    "Stats": Stats,
    "TermsOfService": TermsOfService,
    "TicketMarketplace": TicketMarketplace,
    "WakeTheMess": WakeTheMess,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};