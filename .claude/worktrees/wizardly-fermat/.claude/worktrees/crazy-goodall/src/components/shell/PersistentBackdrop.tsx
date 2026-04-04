/**
 * PersistentBackdrop - Globe/Map backdrop that persists across navigation
 * 
 * Rules:
 * - Mounted once at AppShell level
 * - Never unmounts on route change
 * - Visibility controlled by opacity/blur, not mount state
 * - Surface-specific modes: pulse, ghosted, market, radio, profile
 */

import { useEffect, useState, Suspense, lazy, memo } from 'react';
import { useLocation } from 'react-router-dom';
import { backdropModes, type BackdropMode } from '@/ui/tokens';

// Lazy load the heavy Globe component
const GlobeCanvas = lazy(() => import('@/components/globe/GlobeHero'));

interface PersistentBackdropProps {
  className?: string;
}

/**
 * Get backdrop mode from current route
 */
function getModeFromPath(pathname: string): BackdropMode {
  if (pathname === '/pulse' || pathname.startsWith('/pulse/') || pathname === '/globe') {
    return 'pulse';
  }
  if (pathname === '/market' || pathname.startsWith('/market/') || pathname === '/shop') {
    return 'market';
  }
  if (pathname === '/radio' || pathname.startsWith('/radio/') || pathname.startsWith('/music')) {
    return 'radio';
  }
  if (pathname === '/profile' || pathname.startsWith('/profile/') || pathname === '/settings') {
    return 'profile';
  }
  // Default: ghosted (grid mode)
  return 'ghosted';
}

/**
 * Loading fallback for the globe
 */
function GlobeLoadingFallback() {
  return (
    <div className="absolute inset-0 bg-black flex items-center justify-center">
      <div className="w-16 h-16 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
    </div>
  );
}

/**
 * PersistentBackdrop Component
 */
function PersistentBackdropInner({ className = '' }: PersistentBackdropProps) {
  const location = useLocation();
  const [mode, setMode] = useState<BackdropMode>(() => getModeFromPath(location.pathname));
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(true);

  // Update mode when route changes
  useEffect(() => {
    const newMode = getModeFromPath(location.pathname);
    setMode(newMode);
    
    // Pulse mode = fully visible and animating
    // Other modes = visible but with overlay/reduced animation
    setIsAnimating(newMode === 'pulse');
  }, [location.pathname]);

  const modeConfig = backdropModes[mode];

  return (
    <div 
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{ 
        zIndex: 0,
        pointerEvents: mode === 'pulse' ? 'auto' : 'none',
      }}
    >
      {/* Globe Canvas */}
      <div 
        className="absolute inset-0 transition-opacity duration-500"
        style={{ 
          opacity: isVisible ? 1 : 0,
        }}
      >
        <Suspense fallback={<GlobeLoadingFallback />}>
          <GlobeCanvas />
        </Suspense>
      </div>

      {/* Overlay for dimming/blurring in non-pulse modes */}
      {mode !== 'pulse' && (
        <div 
          className="absolute inset-0 transition-all duration-500"
          style={{
            backgroundColor: `rgba(0, 0, 0, ${modeConfig.opacity})`,
            backdropFilter: modeConfig.blur > 0 ? `blur(${modeConfig.blur}px)` : 'none',
            WebkitBackdropFilter: modeConfig.blur > 0 ? `blur(${modeConfig.blur}px)` : 'none',
          }}
        />
      )}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const PersistentBackdrop = memo(PersistentBackdropInner);

export default PersistentBackdrop;
