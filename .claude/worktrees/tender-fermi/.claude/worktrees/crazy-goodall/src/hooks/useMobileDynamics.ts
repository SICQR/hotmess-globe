/**
 * useMobileDynamics - Dynamic viewport and mobile-first utilities
 * 
 * Handles:
 * - Real viewport height (accounts for mobile browser chrome)
 * - Keyboard visibility detection
 * - Orientation changes
 * - Safe area insets
 * - Touch capability detection
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

interface ViewportDimensions {
  width: number;
  height: number;
  visualHeight: number;  // VisualViewport height (excludes keyboard)
  isKeyboardOpen: boolean;
  orientation: 'portrait' | 'landscape';
  safeAreaTop: number;
  safeAreaBottom: number;
  safeAreaLeft: number;
  safeAreaRight: number;
}

interface MobileDynamics {
  viewport: ViewportDimensions;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  isStandalone: boolean;  // PWA mode
  prefersReducedMotion: boolean;
  setViewportHeight: () => void;  // Force recalculate
}

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

// Get safe area insets from CSS env variables
function getSafeAreaInsets() {
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  
  return {
    top: parseInt(computedStyle.getPropertyValue('--sat') || '0', 10) || 0,
    bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0', 10) || 0,
    left: parseInt(computedStyle.getPropertyValue('--sal') || '0', 10) || 0,
    right: parseInt(computedStyle.getPropertyValue('--sar') || '0', 10) || 0,
  };
}

// Check if visual viewport API is available
function hasVisualViewport(): boolean {
  return typeof window !== 'undefined' && 'visualViewport' in window;
}

export function useMobileDynamics(): MobileDynamics {
  const [viewport, setViewport] = useState<ViewportDimensions>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 0,
        height: 0,
        visualHeight: 0,
        isKeyboardOpen: false,
        orientation: 'portrait',
        safeAreaTop: 0,
        safeAreaBottom: 0,
        safeAreaLeft: 0,
        safeAreaRight: 0,
      };
    }

    const safeArea = getSafeAreaInsets();
    const visualHeight = hasVisualViewport() 
      ? window.visualViewport?.height || window.innerHeight 
      : window.innerHeight;

    return {
      width: window.innerWidth,
      height: window.innerHeight,
      visualHeight,
      isKeyboardOpen: visualHeight < window.innerHeight * 0.75,
      orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
      safeAreaTop: safeArea.top,
      safeAreaBottom: safeArea.bottom,
      safeAreaLeft: safeArea.left,
      safeAreaRight: safeArea.right,
    };
  });

  // Set CSS custom property for real viewport height
  const setViewportHeight = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    const vh = window.innerHeight * 0.01;
    const vvh = hasVisualViewport() 
      ? (window.visualViewport?.height || window.innerHeight) * 0.01 
      : vh;
    
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    document.documentElement.style.setProperty('--vvh', `${vvh}px`);
    document.documentElement.style.setProperty('--real-vh', `${window.innerHeight}px`);
    document.documentElement.style.setProperty('--visual-vh', `${vvh * 100}px`);
  }, []);

  // Update viewport dimensions
  const updateViewport = useCallback(() => {
    if (typeof window === 'undefined') return;

    const safeArea = getSafeAreaInsets();
    const visualHeight = hasVisualViewport() 
      ? window.visualViewport?.height || window.innerHeight 
      : window.innerHeight;

    setViewport({
      width: window.innerWidth,
      height: window.innerHeight,
      visualHeight,
      isKeyboardOpen: visualHeight < window.innerHeight * 0.75,
      orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
      safeAreaTop: safeArea.top,
      safeAreaBottom: safeArea.bottom,
      safeAreaLeft: safeArea.left,
      safeAreaRight: safeArea.right,
    });

    setViewportHeight();
  }, [setViewportHeight]);

  // Listen to viewport changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial set
    setViewportHeight();
    updateViewport();

    // Standard resize
    window.addEventListener('resize', updateViewport);
    
    // Orientation change
    window.addEventListener('orientationchange', () => {
      // Delay to let browser finish orientation change
      setTimeout(updateViewport, 100);
    });

    // Visual viewport (for keyboard)
    if (hasVisualViewport() && window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport);
      window.visualViewport.addEventListener('scroll', updateViewport);
    }

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      if (hasVisualViewport() && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewport);
        window.visualViewport.removeEventListener('scroll', updateViewport);
      }
    };
  }, [updateViewport, setViewportHeight]);

  // Memoized device capabilities
  const deviceInfo = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouchDevice: false,
        isStandalone: false,
        prefersReducedMotion: false,
      };
    }

    const width = viewport.width;
    const isMobile = width < MOBILE_BREAKPOINT;
    const isTablet = width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT;
    const isDesktop = width >= TABLET_BREAKPOINT;
    
    // Touch detection
    const isTouchDevice = 
      'ontouchstart' in window || 
      navigator.maxTouchPoints > 0 ||
      // @ts-ignore - Legacy check
      (window.DocumentTouch && document instanceof window.DocumentTouch);

    // PWA standalone mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-ignore - iOS Safari
      window.navigator.standalone === true;

    // Motion preference
    const prefersReducedMotion = 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    return {
      isMobile,
      isTablet,
      isDesktop,
      isTouchDevice,
      isStandalone,
      prefersReducedMotion,
    };
  }, [viewport.width]);

  return {
    viewport,
    ...deviceInfo,
    setViewportHeight,
  };
}

// Simple hook for just viewport height CSS variable
export function useViewportHeight() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVH();
    window.addEventListener('resize', setVH);
    
    if (hasVisualViewport() && window.visualViewport) {
      window.visualViewport.addEventListener('resize', setVH);
    }

    return () => {
      window.removeEventListener('resize', setVH);
      if (hasVisualViewport() && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', setVH);
      }
    };
  }, []);
}

// Hook for keyboard visibility
export function useKeyboardVisibility() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !hasVisualViewport()) return;

    const checkKeyboard = () => {
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const windowHeight = window.innerHeight;
      setIsKeyboardOpen(viewportHeight < windowHeight * 0.75);
    };

    window.visualViewport?.addEventListener('resize', checkKeyboard);
    
    return () => {
      window.visualViewport?.removeEventListener('resize', checkKeyboard);
    };
  }, []);

  return isKeyboardOpen;
}

export default useMobileDynamics;
