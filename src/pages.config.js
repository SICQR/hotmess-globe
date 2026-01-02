import AdminDashboard from './pages/AdminDashboard';
import BeaconDetail from './pages/BeaconDetail';
import Beacons from './pages/Beacons';
import Bookmarks from './pages/Bookmarks';
import Calendar from './pages/Calendar';
import Chat from './pages/Chat';
import Checkout from './pages/Checkout';
import Community from './pages/Community';
import Connect from './pages/Connect';
import CreateBeacon from './pages/CreateBeacon';
import EditBeacon from './pages/EditBeacon';
import EditProfile from './pages/EditProfile';
import Events from './pages/Events';
import Globe from './pages/Globe';
import Home from './pages/Home';
import Leaderboard from './pages/Leaderboard';
import Marketplace from './pages/Marketplace';
import Messages from './pages/Messages';
import Onboarding from './pages/Onboarding';
import OnboardingGate from './pages/OnboardingGate';
import OrderHistory from './pages/OrderHistory';
import OrganizerDashboard from './pages/OrganizerDashboard';
import ProductDetail from './pages/ProductDetail';
import Profile from './pages/Profile';
import ProfileSetup from './pages/ProfileSetup';
import PromoteToAdmin from './pages/PromoteToAdmin';
import Radio from './pages/Radio';
import RightNowDashboard from './pages/RightNowDashboard';
import Scan from './pages/Scan';
import SellerDashboard from './pages/SellerDashboard';
import Settings from './pages/Settings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminDashboard": AdminDashboard,
    "BeaconDetail": BeaconDetail,
    "Beacons": Beacons,
    "Bookmarks": Bookmarks,
    "Calendar": Calendar,
    "Chat": Chat,
    "Checkout": Checkout,
    "Community": Community,
    "Connect": Connect,
    "CreateBeacon": CreateBeacon,
    "EditBeacon": EditBeacon,
    "EditProfile": EditProfile,
    "Events": Events,
    "Globe": Globe,
    "Home": Home,
    "Leaderboard": Leaderboard,
    "Marketplace": Marketplace,
    "Messages": Messages,
    "Onboarding": Onboarding,
    "OnboardingGate": OnboardingGate,
    "OrderHistory": OrderHistory,
    "OrganizerDashboard": OrganizerDashboard,
    "ProductDetail": ProductDetail,
    "Profile": Profile,
    "ProfileSetup": ProfileSetup,
    "PromoteToAdmin": PromoteToAdmin,
    "Radio": Radio,
    "RightNowDashboard": RightNowDashboard,
    "Scan": Scan,
    "SellerDashboard": SellerDashboard,
    "Settings": Settings,
}

export const pagesConfig = {
    mainPage: "Globe",
    Pages: PAGES,
    Layout: __Layout,
};