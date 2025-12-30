import BeaconDetail from './pages/BeaconDetail';
import Beacons from './pages/Beacons';
import Bookmarks from './pages/Bookmarks';
import Calendar from './pages/Calendar';
import Chat from './pages/Chat';
import Community from './pages/Community';
import CreateBeacon from './pages/CreateBeacon';
import Globe from './pages/Globe';
import Home from './pages/Home';
import Leaderboard from './pages/Leaderboard';
import MapView from './pages/MapView';
import Marketplace from './pages/Marketplace';
import Messages from './pages/Messages';
import Network from './pages/Network';
import OrganizerDashboard from './pages/OrganizerDashboard';
import Profile from './pages/Profile';
import Scan from './pages/Scan';
import Settings from './pages/Settings';
import EditBeacon from './pages/EditBeacon';
import ExperienceMockups from './pages/ExperienceMockups';
import __Layout from './Layout.jsx';


export const PAGES = {
    "BeaconDetail": BeaconDetail,
    "Beacons": Beacons,
    "Bookmarks": Bookmarks,
    "Calendar": Calendar,
    "Chat": Chat,
    "Community": Community,
    "CreateBeacon": CreateBeacon,
    "Globe": Globe,
    "Home": Home,
    "Leaderboard": Leaderboard,
    "MapView": MapView,
    "Marketplace": Marketplace,
    "Messages": Messages,
    "Network": Network,
    "OrganizerDashboard": OrganizerDashboard,
    "Profile": Profile,
    "Scan": Scan,
    "Settings": Settings,
    "EditBeacon": EditBeacon,
    "ExperienceMockups": ExperienceMockups,
}

export const pagesConfig = {
    mainPage: "Globe",
    Pages: PAGES,
    Layout: __Layout,
};