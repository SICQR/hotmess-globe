import AdminDashboard from './pages/AdminDashboard';
import BeaconDetail from './pages/BeaconDetail';
import Beacons from './pages/Beacons';
import Bookmarks from './pages/Bookmarks';
import Calendar from './pages/Calendar';
import Chat from './pages/Chat';
import Community from './pages/Community';
import CreateBeacon from './pages/CreateBeacon';
import EditBeacon from './pages/EditBeacon';
import EditProfile from './pages/EditProfile';
import Events from './pages/Events';
import Globe from './pages/Globe';
import Home from './pages/Home';
import Leaderboard from './pages/Leaderboard';
import Marketplace from './pages/Marketplace';
import Messages from './pages/Messages';
import OrderHistory from './pages/OrderHistory';
import OrganizerDashboard from './pages/OrganizerDashboard';
import ProductDetail from './pages/ProductDetail';
import Profile from './pages/Profile';
import ProfileSetup from './pages/ProfileSetup';
import Radio from './pages/Radio';
import Scan from './pages/Scan';
import SellerDashboard from './pages/SellerDashboard';
import Settings from './pages/Settings';
import Connect from './pages/Connect';
import Onboarding from './pages/Onboarding';
import Checkout from './pages/Checkout';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminDashboard": AdminDashboard,
    "BeaconDetail": BeaconDetail,
    "Beacons": Beacons,
    "Bookmarks": Bookmarks,
    "Calendar": Calendar,
    "Chat": Chat,
    "Community": Community,
    "CreateBeacon": CreateBeacon,
    "EditBeacon": EditBeacon,
    "EditProfile": EditProfile,
    "Events": Events,
    "Globe": Globe,
    "Home": Home,
    "Leaderboard": Leaderboard,
    "Marketplace": Marketplace,
    "Messages": Messages,
    "OrderHistory": OrderHistory,
    "OrganizerDashboard": OrganizerDashboard,
    "ProductDetail": ProductDetail,
    "Profile": Profile,
    "ProfileSetup": ProfileSetup,
    "Radio": Radio,
    "Scan": Scan,
    "SellerDashboard": SellerDashboard,
    "Settings": Settings,
    "Connect": Connect,
    "Onboarding": Onboarding,
    "Checkout": Checkout,
}

export const pagesConfig = {
    mainPage: "Globe",
    Pages: PAGES,
    Layout: __Layout,
};