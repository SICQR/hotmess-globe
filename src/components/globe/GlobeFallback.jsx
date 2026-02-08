/**
 * GlobeFallback - Fallback components for Globe loading/error states
 * 
 * Provides:
 * - GlobeLoadingFallback: Shown while Globe is lazy-loading
 * - GlobeErrorFallback: Shown when Globe fails to render (WebGL issues, etc.)
 * - GlobeMobileFallback: 2D alternative for mobile/low-end devices
 */

import React from 'react';
import { Globe, MapPin, Radio, Users, Calendar, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * Loading state while Globe component loads
 */
export function GlobeLoadingFallback() {
  return (
    <div className="relative w-full h-[60vh] min-h-[400px] bg-black flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/30 via-black to-purple-900/20 animate-pulse" />
      
      {/* Concentric circles animation */}
      <div className="absolute inset-0 flex items-center justify-center">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute rounded-full border border-cyan-500/20"
            style={{
              width: `${i * 150}px`,
              height: `${i * 150}px`,
              animation: `ping ${2 + i * 0.5}s cubic-bezier(0, 0, 0.2, 1) infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      {/* Loading content */}
      <div className="relative z-10 text-center">
        <Globe className="w-16 h-16 text-cyan-500 mx-auto mb-4 animate-spin-slow" />
        <p className="text-white/60 font-mono text-sm uppercase tracking-wider">
          Loading Globe...
        </p>
      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}

/**
 * Error state when Globe fails to render
 */
export function GlobeErrorFallback({ error, reset }) {
  const isWebGLError = error?.message?.toLowerCase().includes('webgl') ||
                       error?.message?.toLowerCase().includes('context');

  return (
    <div className="relative w-full h-[60vh] min-h-[400px] bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/10 via-transparent to-transparent" />
      
      <div className="relative z-10 text-center p-6 max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full border-2 border-red-500/50 bg-red-500/10 flex items-center justify-center">
          <Globe className="w-10 h-10 text-red-500" />
        </div>
        
        <h2 className="text-2xl font-black text-white mb-2">Globe Unavailable</h2>
        
        <p className="text-white/60 mb-6">
          {isWebGLError
            ? "Your browser or device doesn't support 3D graphics. Try a different browser or device."
            : "The 3D globe couldn't load. This might be a temporary issue."}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {reset && (
            <Button variant="outline" onClick={reset} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          )}
          <Button variant="outlineCyan" asChild>
            <Link to={createPageUrl('Events')}>
              <Calendar className="w-4 h-4 mr-2" />
              Browse Events
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Mobile/2D fallback - Quick action grid instead of Globe
 */
export function GlobeMobileFallback({ onRequestFullGlobe }) {
  const quickActions = [
    { 
      icon: Radio, 
      label: 'Listen Live', 
      href: createPageUrl('Radio'),
      color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    },
    { 
      icon: Calendar, 
      label: 'Events', 
      href: createPageUrl('Events'),
      color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    },
    { 
      icon: Users, 
      label: 'Social', 
      href: createPageUrl('Social'),
      color: 'bg-lime-500/20 text-lime-400 border-lime-500/30',
    },
    { 
      icon: MapPin, 
      label: 'Nearby', 
      href: createPageUrl('Beacons'),
      color: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    },
  ];

  return (
    <div className="relative w-full min-h-[50vh] bg-gradient-to-b from-black via-gray-900 to-black p-6">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent" />
      
      <div className="relative z-10 max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Globe className="w-12 h-12 text-cyan-500 mx-auto mb-3" />
          <h2 className="text-xl font-black text-white mb-1">HOTMESS</h2>
          <p className="text-white/50 text-sm">Quick access</p>
        </div>

        {/* Quick action grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {quickActions.map(({ icon: Icon, label, href, color }) => (
            <Link
              key={label}
              to={href}
              className={`flex flex-col items-center justify-center p-6 rounded-xl border ${color} hover:scale-105 transition-transform`}
            >
              <Icon className="w-8 h-8 mb-2" />
              <span className="font-bold text-sm">{label}</span>
            </Link>
          ))}
        </div>

        {/* Option to load full Globe */}
        {onRequestFullGlobe && (
          <button
            onClick={onRequestFullGlobe}
            className="w-full text-center text-white/40 text-xs hover:text-white/60 transition-colors"
          >
            Load 3D Globe anyway →
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Detect if device should use mobile fallback
 */
export function shouldUseMobileFallback() {
  if (typeof window === 'undefined') return false;
  
  // Check for touch device with small screen
  const isMobile = window.innerWidth < 768;
  const isTouch = 'ontouchstart' in window;
  
  // Check for weak WebGL support
  let hasWeakWebGL = false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        // Check for software renderers or known weak GPUs
        hasWeakWebGL = /swiftshader|llvmpipe|software/i.test(renderer);
      }
    } else {
      hasWeakWebGL = true; // No WebGL at all
    }
  } catch {
    hasWeakWebGL = true;
  }

  // Check for low memory (if available)
  const hasLowMemory = navigator.deviceMemory && navigator.deviceMemory < 4;

  return (isMobile && isTouch) || hasWeakWebGL || hasLowMemory;
}

export default {
  GlobeLoadingFallback,
  GlobeErrorFallback,
  GlobeMobileFallback,
  shouldUseMobileFallback,
};
