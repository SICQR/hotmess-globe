/**
 * OSShell - Main app shell for HOTMESS OS
 * 
 * Renders the 5-mode structure with persistent navigation.
 * Globe persists in background.
 * Bottom nav with 5 icons.
 */

import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { OSBottomNav } from './OSBottomNav';
import { useLocation } from 'react-router-dom';

// Lazy load modes for better performance
const GhostedMode = lazy(() => import('./GhostedMode'));
const PulseMode = lazy(() => import('./PulseMode'));
const MarketMode = lazy(() => import('./MarketMode'));
const RadioMode = lazy(() => import('./RadioMode'));
const ProfileMode = lazy(() => import('./ProfileMode'));

// Loading fallback
function ModeLoadingFallback() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-black">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
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
      {/* Mode Content - fills screen above bottom nav */}
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
                {/* Default: Ghosted mode */}
                <Route path="/" element={<GhostedMode />} />
                <Route path="/ghosted" element={<Navigate to="/" replace />} />
                
                {/* Pulse mode (Globe + Events) */}
                <Route path="/pulse" element={<PulseMode />} />
                <Route path="/globe" element={<Navigate to="/pulse" replace />} />
                <Route path="/events" element={<Navigate to="/pulse" replace />} />
                
                {/* Market mode (Unified Commerce) */}
                <Route path="/market" element={<MarketMode />} />
                <Route path="/market/*" element={<MarketMode />} />
                <Route path="/shop" element={<Navigate to="/market" replace />} />
                <Route path="/preloved" element={<Navigate to="/market?source=preloved" replace />} />
                
                {/* Radio mode */}
                <Route path="/radio" element={<RadioMode />} />
                <Route path="/music" element={<Navigate to="/radio" replace />} />
                
                {/* Profile mode */}
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
