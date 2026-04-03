/**
 * AppNavBar — Unified Bottom Navigation
 * 
 * 5-tab nav: Home, Pulse, Ghosted, Market, Profile
 * Gold active state, consistent across all pages.
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { FaHome, FaHeartbeat, FaGhost, FaShoppingBag, FaUser } from 'react-icons/fa';

type NavTab = 'home' | 'pulse' | 'ghosted' | 'market' | 'profile';

interface AppNavBarProps {
  active?: NavTab;
}

const tabs: { id: NavTab; icon: React.ReactNode; label: string; path: string }[] = [
  { id: 'home', icon: <FaHome />, label: 'Home', path: '/' },
  { id: 'pulse', icon: <FaHeartbeat />, label: 'Pulse', path: '/pulse' },
  { id: 'ghosted', icon: <FaGhost />, label: 'Ghosted', path: '/ghosted' },
  { id: 'market', icon: <FaShoppingBag />, label: 'Market', path: '/market' },
  { id: 'profile', icon: <FaUser />, label: 'Profile', path: '/profile' },
];

export function AppNavBar({ active }: AppNavBarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-detect active tab from path if not provided
  const currentTab = active || detectActiveTab(location.pathname);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-darkest border-t border-borderGlow shadow-navbar flex justify-between items-center px-4 py-2 z-50">
      {tabs.map((tab) => (
        <NavButton
          key={tab.id}
          icon={tab.icon}
          label={tab.label}
          active={currentTab === tab.id}
          onClick={() => navigate(tab.path)}
        />
      ))}
    </nav>
  );
}

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function NavButton({ icon, label, active, onClick }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center text-xs transition-colors ${
        active ? 'text-gold' : 'text-light hover:text-gold'
      }`}
    >
      <span className="text-xl mb-0.5">{icon}</span>
      <span>{label}</span>
      {active && <span className="block w-2 h-2 rounded-full bg-gold mt-1" />}
    </button>
  );
}

function detectActiveTab(pathname: string): NavTab {
  if (pathname === '/' || pathname.startsWith('/home')) return 'home';
  if (pathname.startsWith('/pulse') || pathname.startsWith('/globe')) return 'pulse';
  if (pathname.startsWith('/ghosted')) return 'ghosted';
  if (pathname.startsWith('/market') || pathname.startsWith('/shop')) return 'market';
  if (pathname.startsWith('/profile')) return 'profile';
  return 'home';
}

export default AppNavBar;
