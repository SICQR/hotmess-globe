import Globe from './pages/Globe';
import Home from './pages/Home';
import Beacons from './pages/Beacons';
import BeaconDetail from './pages/BeaconDetail';
import Scan from './pages/Scan';
import Marketplace from './pages/Marketplace';
import Community from './pages/Community';
import Leaderboard from './pages/Leaderboard';
import Settings from './pages/Settings';
import CreateBeacon from './pages/CreateBeacon';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import Calendar from './pages/Calendar';
import MapView from './pages/MapView';
import OrganizerDashboard from './pages/OrganizerDashboard';
import Bookmarks from './pages/Bookmarks';
import Network from './pages/Network';
import Messages from './pages/Messages';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Globe": Globe,
    "Home": Home,
    "Beacons": Beacons,
    "BeaconDetail": BeaconDetail,
    "Scan": Scan,
    "Marketplace": Marketplace,
    "Community": Community,
    "Leaderboard": Leaderboard,
    "Settings": Settings,
    "CreateBeacon": CreateBeacon,
    "Chat": Chat,
    "Profile": Profile,
    "Calendar": Calendar,
    "MapView": MapView,
    "OrganizerDashboard": OrganizerDashboard,
    "Bookmarks": Bookmarks,
    "Network": Network,
    "Messages": Messages,
}

export const pagesConfig = {
    mainPage: "Globe",
    Pages: PAGES,
    Layout: __Layout,
};