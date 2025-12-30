import BeaconDetail from './pages/BeaconDetail';
import Beacons from './pages/Beacons';
import Bookmarks from './pages/Bookmarks';
import Calendar from './pages/Calendar';
import Chat from './pages/Chat';
import Community from './pages/Community';
import CreateBeacon from './pages/CreateBeacon';
import EditBeacon from './pages/EditBeacon';
import ExperienceMockups from './pages/ExperienceMockups';
import Globe from './pages/Globe';
import Home from './pages/Home';
import Leaderboard from './pages/Leaderboard';
import MapView from './pages/MapView';
import Marketplace from './pages/Marketplace';
import Messages from './pages/Messages';
import Network from './pages/Network';
import OrderHistory from './pages/OrderHistory';
import OrganizerDashboard from './pages/OrganizerDashboard';
import ProductDetail from './pages/ProductDetail';
import Profile from './pages/Profile';
import Scan from './pages/Scan';
import SellerDashboard from './pages/SellerDashboard';
import Settings from './pages/Settings';
import EditProfile from './pages/EditProfile';
import __Layout from './Layout.jsx';


export const PAGES = {
    "BeaconDetail": BeaconDetail,
    "Beacons": Beacons,
    "Bookmarks": Bookmarks,
    "Calendar": Calendar,
    "Chat": Chat,
    "Community": Community,
    "CreateBeacon": CreateBeacon,
    "EditBeacon": EditBeacon,
    "ExperienceMockups": ExperienceMockups,
    "Globe": Globe,
    "Home": Home,
    "Leaderboard": Leaderboard,
    "MapView": MapView,
    "Marketplace": Marketplace,
    "Messages": Messages,
    "Network": Network,
    "OrderHistory": OrderHistory,
    "OrganizerDashboard": OrganizerDashboard,
    "ProductDetail": ProductDetail,
    "Profile": Profile,
    "Scan": Scan,
    "SellerDashboard": SellerDashboard,
    "Settings": Settings,
    "EditProfile": EditProfile,
}

export const pagesConfig = {
    mainPage: "Globe",
    Pages: PAGES,
    Layout: __Layout,
};