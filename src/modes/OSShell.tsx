/**
 * OSShell - Main app shell for HOTMESS OS
 *
 * 5 modes: Home, Pulse, Ghosted, Market, Profile
 * Persistent bottom nav. AnimatePresence page transitions.
 */

import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { OSBottomNav } from './OSBottomNav';
import { useLocation } from 'react-router-dom';

// Lazy load modes
const HomeMode    = lazy(() => import('./HomeMode'));
const GhostedMode = lazy(() => import('./GhostedMode'));
const PulseMode   = lazy(() => import('./PulseMode'));
const EventsMode  = lazy(() => import('./EventsMode'));
const VaultMode   = lazy(() => import('./VaultMode'));
const MarketMode  = lazy(() => import('./MarketMode'));
const RadioMode   = lazy(() => import('./RadioMode'));
const ProfileMode = lazy(() => import('./ProfileMode'));

function ModeLoadingFallback() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-black">
      <div className="w-8 h-8 border-2 border-white/20 border-t-[#C8962C] rounded-full animate-spin" />
    </div>
  );
}

interface OSShellProps {
  className?: string;
}

export function OSShell({ className = '' }: OSShellProps) {
  const location = useLocation();

  return (
    <div className={`h-full w-full bg-black ${className}`}>
      {/* Mode Content */}
      <div className="h-full w-full pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="h-full w-full"
          >
            <Suspense fallback={<ModeLoadingFallback />}>
              <Routes location={location}>
                {/* Home (dashboard) */}
                <Route path="/" element={<HomeMode />} />

                {/* Ghosted (proximity grid) */}
                <Route path="/ghosted" element={<GhostedMode />} />
                <Route path="/ghosted/*" element={<GhostedMode />} />

                {/* Pulse (Globe + Events) */}
                <Route path="/pulse" element={<PulseMode />} />
                <Route path="/globe" element={<Navigate to="/pulse" replace />} />
                {/* Events (full page browser) */}
                <Route path="/events" element={<EventsMode />} />
                <Route path="/events/*" element={<EventsMode />} />

                {/* Market */}
                <Route path="/market" element={<MarketMode />} />
                <Route path="/market/*" element={<MarketMode />} />
                <Route path="/shop" element={<Navigate to="/market" replace />} />
                <Route path="/preloved" element={<Navigate to="/market?source=preloved" replace />} />

                {/* Radio (still accessible via direct link) */}
                <Route path="/radio" element={<RadioMode />} />
                <Route path="/music" element={<Navigate to="/radio" replace />} />

                {/* Vault (purchases, tickets, QR) */}
                <Route path="/vault" element={<VaultMode />} />
                <Route path="/vault/*" element={<VaultMode />} />

                {/* Profile */}
                <Route path="/profile" element={<ProfileMode />} />
                <Route path="/settings" element={<Navigate to="/profile" replace />} />
                <Route path="/account" element={<Navigate to="/profile" replace />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fixed Bottom Navigation */}
      <OSBottomNav />
    </div>
  );
}

export default OSShell;
