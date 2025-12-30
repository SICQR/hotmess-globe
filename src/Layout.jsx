import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Home, Globe as GlobeIcon, Map, ShoppingBag, Users, Scan, Trophy, Settings, Menu, X, MessageCircle, Calendar as CalendarIcon, MapPin, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const NAV_ITEMS = [
  { name: 'Home', icon: Home, path: 'Home' },
  { name: 'Globe', icon: GlobeIcon, path: 'Globe' },
  { name: 'Map', icon: Map, path: 'MapView' },
  { name: 'Calendar', icon: CalendarIcon, path: 'Calendar' },
  { name: 'Beacons', icon: MapPin, path: 'Beacons' },
  { name: 'AI Chat', icon: MessageCircle, path: 'Chat' },
  { name: 'Organizer', icon: TrendingUp, path: 'OrganizerDashboard' },
  { name: 'Scan', icon: Scan, path: 'Scan' },
  { name: 'Community', icon: Users, path: 'Community' },
  { name: 'Leaderboard', icon: Trophy, path: 'Leaderboard' },
];

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const isActive = (pageName) => currentPageName === pageName;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <Link to={createPageUrl('Home')} className="text-xl font-black tracking-tight">
            HOTMESS
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/95 backdrop-blur-xl pt-16">
          <div className="flex flex-col gap-2 p-4">
            {NAV_ITEMS.map(({ name, icon: Icon, path }) => (
              <Link
                key={path}
                to={createPageUrl(path)}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                  ${isActive(path)
                    ? 'bg-[#FF1493] text-black'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-semibold uppercase tracking-wider text-sm">{name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:fixed md:left-0 md:top-0 md:bottom-0 md:w-64 md:flex-col md:bg-black/95 md:backdrop-blur-xl md:border-r md:border-white/10 md:z-40">
        <div className="p-6">
          <Link to={createPageUrl('Home')} className="text-2xl font-black tracking-tight">
            HOTMESS
          </Link>
          <p className="text-xs text-white/40 uppercase tracking-wider mt-1">London</p>
        </div>

        <nav className="flex-1 px-3">
          {NAV_ITEMS.map(({ name, icon: Icon, path }) => (
            <Link
              key={path}
              to={createPageUrl(path)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-all
                ${isActive(path)
                  ? 'bg-[#FF1493] text-black'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-semibold uppercase tracking-wider text-sm">{name}</span>
            </Link>
          ))}
        </nav>

        {user && (
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center">
                <span className="text-sm font-bold">{user.full_name?.[0] || 'U'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user.full_name}</p>
                <p className="text-xs text-white/40">Level {user.level || 1}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="md:ml-64 pt-14 md:pt-0">
        {children}
      </div>
    </div>
  );
}