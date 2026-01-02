import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Home, Globe as GlobeIcon, Map, ShoppingBag, Users, Scan, Trophy, Settings, Menu, X, MessageCircle, Calendar as CalendarIcon, MapPin, TrendingUp, Bookmark, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PanicButton from '@/components/safety/PanicButton';
import Gatekeeper from '@/components/auth/Gatekeeper';
import NotificationBadge from '@/components/messaging/NotificationBadge';
import GlobalAssistant from '@/components/ai/GlobalAssistant';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import GlobalSearch from '@/components/search/GlobalSearch';
import OfflineIndicator from '@/components/ui/OfflineIndicator';
import EventReminders from '@/components/events/EventReminders';
import { TaxonomyProvider } from '@/components/taxonomy/provider';
import ErrorBoundary from '@/components/error/ErrorBoundary';
import PageErrorBoundary from '@/components/error/PageErrorBoundary';
import SkipToContent from '@/components/accessibility/SkipToContent';
import { useKeyboardNav } from '@/components/accessibility/KeyboardNav';
import { A11yAnnouncer } from '@/components/accessibility/KeyboardNav';
import WelcomeTour from '@/components/onboarding/WelcomeTour';

      const PRIMARY_NAV = [
  { name: 'Pulse', icon: Home, path: 'Home' },
  { name: 'Globe', icon: GlobeIcon, path: 'Globe' },
  { name: 'Events', icon: CalendarIcon, path: 'Events' },
  { name: 'Market', icon: ShoppingBag, path: 'Marketplace' },
  { name: 'Connect', icon: Users, path: 'Connect' },
  { name: 'Messages', icon: MessageCircle, path: 'Messages', showBadge: true },
];

const SECONDARY_NAV = [
  { name: 'Beacons', icon: MapPin, path: 'Beacons' },
  { name: 'Grid', icon: Users, path: 'Connect' },
  { name: 'Radio', icon: Users, path: 'Radio' },
  { name: 'Calendar', icon: CalendarIcon, path: 'Calendar' },
  { name: 'Scan', icon: Scan, path: 'Scan' },
  { name: 'Community', icon: Users, path: 'Community' },
  { name: 'Leaderboard', icon: Trophy, path: 'Leaderboard' },
];

export default function Layout({ children, currentPageName }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const location = useLocation();
  
  // Enable keyboard navigation
  useKeyboardNav();

  // Register service worker for offline support
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Service worker registration failed, continue without offline support
      });
    }
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Check if onboarding is incomplete (except on OnboardingGate page itself)
        if (currentPageName !== 'OnboardingGate' && (!currentUser.has_agreed_terms || !currentUser.has_consented_data || !currentUser.has_consented_gps)) {
          window.location.href = createPageUrl('OnboardingGate');
          return;
        }
        
        // Check if profile setup is incomplete
        if (currentPageName !== 'Profile' && currentPageName !== 'OnboardingGate' && (!currentUser.full_name || !currentUser.avatar_url)) {
          window.location.href = createPageUrl('Profile');
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, [currentPageName]);

  const [showSecondary, setShowSecondary] = useState(false);
  const isActive = (pageName) => currentPageName === pageName;

  const isGlobePage = currentPageName === 'Globe';

  return (
    <ErrorBoundary>
      <TaxonomyProvider>
        <Gatekeeper>
          <SkipToContent />
          <A11yAnnouncer />
          <OfflineIndicator />
          {user && currentPageName === 'Home' && <WelcomeTour />}
        <div className="min-h-screen bg-black text-white">
      {!isGlobePage && (
        <>
          {/* Mobile Header */}
          <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/10">
            <div className="flex items-center justify-between px-4 py-3">
              <Link to={createPageUrl('Home')} className="text-xl font-black tracking-tight">
                HOTMESS
              </Link>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSearch(true)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  aria-label="Open search"
                  data-search-trigger
                >
                  <Search className="w-5 h-5" />
                </button>
                {user && <NotificationCenter currentUser={user} />}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                  aria-expanded={mobileMenuOpen}
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-40 bg-black/95 backdrop-blur-xl pt-16">
              <div className="flex flex-col p-4">
                <div className="mb-2">
                  <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2 px-3">PRIMARY</p>
                  {PRIMARY_NAV.map(({ name, icon: Icon, path, showBadge }) => (
                    <Link
                      key={path}
                      to={createPageUrl(path)}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 mb-1 transition-all
                        ${isActive(path)
                          ? 'bg-[#FF1493] text-black border-2 border-[#FF1493]'
                          : 'text-white/60 hover:text-white hover:bg-white/5 border-2 border-white/10'
                        }
                      `}
                    >
                      {showBadge && user ? (
                        <NotificationBadge user={user} />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                      <span className="font-black uppercase tracking-wider text-xs">{name}</span>
                    </Link>
                  ))}
                </div>
                <div>
                  <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-2 px-3 mt-4">MORE</p>
                  {SECONDARY_NAV.map(({ name, icon: Icon, path }) => (
                    <Link
                      key={path}
                      to={createPageUrl(path)}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2 mb-1 transition-all
                        ${isActive(path)
                          ? 'text-[#FF1493] border-l-2 border-[#FF1493]'
                          : 'text-white/40 hover:text-white/60 border-l-2 border-white/5'
                        }
                      `}
                    >
                      <Icon className="w-3 h-3" />
                      <span className="font-bold uppercase tracking-wider text-[10px]">{name}</span>
                    </Link>
                  ))}
                </div>
                <Link 
                  to={createPageUrl('Settings')}
                  onClick={() => setMobileMenuOpen(false)}
                  className="mt-6 flex items-center gap-2 px-3 py-2 text-white/40 hover:text-white/60 border-t border-white/10 pt-4"
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider font-bold">Settings</span>
                </Link>
              </div>
            </div>
          )}

          {/* Desktop Sidebar - Smart Nav */}
          <div className="hidden md:flex md:fixed md:left-0 md:top-0 md:bottom-0 md:w-56 md:flex-col md:bg-black md:backdrop-blur-xl md:border-r-2 md:border-white md:z-40">
            <div className="p-4 border-b-2 border-white/20">
              <div className="flex items-center justify-between mb-1">
                <Link to={createPageUrl('Home')} className="text-xl font-black tracking-tight">
                  HOT<span className="text-[#FF1493]">MESS</span>
                </Link>
                {user && <NotificationCenter currentUser={user} />}
              </div>
              <p className="text-[8px] text-white/40 uppercase tracking-wider mt-1">LONDON OS</p>
            </div>

            <nav className="flex-1 px-2 py-4 overflow-y-auto">
              {/* Admin Link */}
              {user && user.role === 'admin' && (
                <Link
                  to={createPageUrl('AdminDashboard')}
                  className="flex items-center gap-2 px-3 py-2.5 mb-4 transition-all border-2 bg-red-600/20 border-red-600 text-red-400 hover:bg-red-600/30"
                >
                  <Settings className="w-4 h-4" />
                  <span className="font-black uppercase tracking-wider text-[10px]">ADMIN</span>
                </Link>
              )}

              {/* Promote to Admin Link */}
              {user && user.role !== 'admin' && (
                <Link
                  to={createPageUrl('PromoteToAdmin')}
                  className="flex items-center gap-2 px-3 py-2.5 mb-4 transition-all border-2 bg-yellow-600/20 border-yellow-600 text-yellow-400 hover:bg-yellow-600/30"
                >
                  <Settings className="w-4 h-4" />
                  <span className="font-black uppercase tracking-wider text-[10px]">BECOME ADMIN</span>
                </Link>
              )}

              {/* Primary Navigation */}
              <div className="mb-6">
                {PRIMARY_NAV.map(({ name, icon: Icon, path, showBadge }) => (
                  <Link
                    key={path}
                    to={createPageUrl(path)}
                    className={`
                      flex items-center gap-2 px-3 py-2.5 mb-1 transition-all border-2
                      ${isActive(path)
                        ? 'bg-[#FF1493] text-black border-[#FF1493] shadow-[0_0_10px_#FF1493]'
                        : 'text-white/60 hover:text-white hover:bg-white/5 border-white/10 hover:border-white/30'
                      }
                    `}
                  >
                    {showBadge && user ? (
                      <NotificationBadge user={user} />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                    <span className="font-black uppercase tracking-wider text-[10px]">{name}</span>
                  </Link>
                ))}
              </div>

              {/* Secondary Toggle */}
              <button
                onClick={() => setShowSecondary(!showSecondary)}
                className="w-full text-left px-3 py-2 text-white/40 hover:text-white/60 text-[8px] uppercase tracking-widest font-black mb-2 transition-all"
              >
                {showSecondary ? '▼' : '▶'} MORE
              </button>

              {/* Secondary Navigation */}
              {showSecondary && (
                <div className="space-y-1">
                  {SECONDARY_NAV.map(({ name, icon: Icon, path }) => (
                    <Link
                      key={path}
                      to={createPageUrl(path)}
                      className={`
                        flex items-center gap-2 px-3 py-1.5 transition-all
                        ${isActive(path)
                          ? 'text-[#FF1493] border-l-2 border-[#FF1493]'
                          : 'text-white/40 hover:text-white/60 border-l-2 border-white/5'
                        }
                      `}
                    >
                      <Icon className="w-3 h-3" />
                      <span className="font-bold uppercase tracking-wider text-[9px]">{name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </nav>

            {user && (
              <div className="p-3 border-t-2 border-white/20">
                <Link to={createPageUrl('Settings')} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center flex-shrink-0 border-2 border-white">
                    <span className="text-xs font-bold">{user.full_name?.[0] || 'U'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black truncate">{user.full_name}</p>
                    <p className="text-[9px] text-[#FFEB3B] font-mono">LVL {Math.floor((user.xp || 0) / 1000) + 1} • {user.xp || 0} XP</p>
                  </div>
                  <Settings className="w-3 h-3 text-white/40" />
                </Link>
              </div>
            )}
          </div>
        </>
      )}

      {/* Main Content */}
      <main 
        id="main-content" 
        className={isGlobePage ? '' : 'md:ml-56 pt-14 md:pt-0'}
        role="main"
      >
        <PageErrorBoundary>
          {children}
        </PageErrorBoundary>
      </main>

      {/* Panic Button */}
      {user && <PanicButton />}

      {/* Global AI Assistant */}
      {user && <GlobalAssistant />}

      {/* Global Search */}
      {user && <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />}

      {/* Event Reminders Background Service */}
      {user && <EventReminders currentUser={user} />}
      </div>
        </Gatekeeper>
      </TaxonomyProvider>
    </ErrorBoundary>
  );
}