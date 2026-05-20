import AccountConsents from './pages/AccountConsents';
import AccountDeletion from './pages/AccountDeletion';
import AdminDashboard from './pages/AdminDashboard';
import AgeGate from './pages/AgeGate';
import Contact from './pages/Contact';
import HelpCenter from './pages/HelpCenter';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Auth from './pages/Auth';
import Home from './pages/Home';
import Ghosted from './modes/GhostedMode';
import Pulse from './modes/PulseMode';
import Market from './modes/MarketMode';
import More from './pages/MorePage';
import Care from './pages/CarePage';
import Settings from './pages/Settings';
import OnboardingGate from './pages/OnboardingGate';
import OrderHistory from './pages/OrderHistory';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Safety from './pages/Safety';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AccountConsents": AccountConsents,
    "AccountDeletion": AccountDeletion,
    "AdminDashboard": AdminDashboard,
    "AgeGate": AgeGate,
    "Auth": Auth,
    "Home": Home,
    "Ghosted": Ghosted,
    "Pulse": Pulse,
    "Market": Market,
    "More": More,
    "Care": Care,
    "Settings": Settings,
    "OnboardingGate": OnboardingGate,
    "OrderHistory": OrderHistory,
    "Profile": Profile,
    "EditProfile": EditProfile,
    "Safety": Safety,
    "TermsOfService": TermsOfService,

    "PrivacyPolicy": PrivacyPolicy,
    "Contact": Contact,
    "HelpCenter": HelpCenter,
    "BeaconDetail": () => import('./pages/BeaconDetail'),
}


export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};