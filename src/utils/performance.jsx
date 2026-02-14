/**
 * Performance Monitoring Utilities
 * Track Core Web Vitals and other performance metrics
 */

import { trackPerformance } from '@/components/utils/analytics';
import logger from '@/utils/logger';

/**
 * Core Web Vitals thresholds
 */
const THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 },
  FID: { good: 100, needsImprovement: 300 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 800, needsImprovement: 1800 },
};

/**
 * Get rating for a metric value
 */
function getRating(metric, value) {
  const threshold = THRESHOLDS[metric];
  if (!threshold) return 'unknown';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * Report Web Vital metric
 */
function reportWebVital(metric, value) {
  const rating = getRating(metric, value);
  
  // Track to analytics
  trackPerformance(metric, value);
  
  // Log in development
  if (import.meta.env.DEV) {
    const color = rating === 'good' ? 'green' : rating === 'needs-improvement' ? 'orange' : 'red';
    logger.debug(
      `[Web Vital] ${metric}: ${value.toFixed(2)}ms (${rating})`
    );
  }
  
  return { metric, value, rating };
}

/**
 * Measure Largest Contentful Paint (LCP)
 */
export function measureLCP(callback) {
  if (typeof PerformanceObserver === 'undefined') return;
  
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    
    const result = reportWebVital('LCP', lastEntry.startTime);
    callback?.(result);
  });
  
  observer.observe({ type: 'largest-contentful-paint', buffered: true });
  
  return () => observer.disconnect();
}

/**
 * Measure First Input Delay (FID)
 */
export function measureFID(callback) {
  if (typeof PerformanceObserver === 'undefined') return;
  
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const firstEntry = entries[0];
    
    if (firstEntry) {
      const result = reportWebVital('FID', firstEntry.processingStart - firstEntry.startTime);
      callback?.(result);
    }
  });
  
  observer.observe({ type: 'first-input', buffered: true });
  
  return () => observer.disconnect();
}

/**
 * Measure Cumulative Layout Shift (CLS)
 */
export function measureCLS(callback) {
  if (typeof PerformanceObserver === 'undefined') return;
  
  let clsValue = 0;
  let sessionValue = 0;
  let sessionEntries = [];
  
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) {
        const firstSessionEntry = sessionEntries[0];
        const lastSessionEntry = sessionEntries[sessionEntries.length - 1];
        
        if (
          sessionValue &&
          entry.startTime - lastSessionEntry.startTime < 1000 &&
          entry.startTime - firstSessionEntry.startTime < 5000
        ) {
          sessionValue += entry.value;
          sessionEntries.push(entry);
        } else {
          sessionValue = entry.value;
          sessionEntries = [entry];
        }
        
        if (sessionValue > clsValue) {
          clsValue = sessionValue;
          const result = reportWebVital('CLS', clsValue);
          callback?.(result);
        }
      }
    }
  });
  
  observer.observe({ type: 'layout-shift', buffered: true });
  
  return () => observer.disconnect();
}

/**
 * Measure First Contentful Paint (FCP)
 */
export function measureFCP(callback) {
  if (typeof PerformanceObserver === 'undefined') return;
  
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const fcpEntry = entries.find(e => e.name === 'first-contentful-paint');
    
    if (fcpEntry) {
      const result = reportWebVital('FCP', fcpEntry.startTime);
      callback?.(result);
    }
  });
  
  observer.observe({ type: 'paint', buffered: true });
  
  return () => observer.disconnect();
}

/**
 * Measure Time to First Byte (TTFB)
 */
export function measureTTFB(callback) {
  if (typeof performance === 'undefined') return;
  
  const navigationEntry = performance.getEntriesByType('navigation')[0];
  if (navigationEntry) {
    const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
    const result = reportWebVital('TTFB', ttfb);
    callback?.(result);
  }
}

/**
 * Initialize all Web Vitals measurements
 */
export function initWebVitals(callback) {
  const cleanups = [];
  
  cleanups.push(measureLCP(callback));
  cleanups.push(measureFID(callback));
  cleanups.push(measureCLS(callback));
  cleanups.push(measureFCP(callback));
  measureTTFB(callback);
  
  return () => {
    cleanups.forEach(cleanup => cleanup?.());
  };
}

/**
 * Prefetch a route
 */
export function prefetchRoute(path) {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = path;
  document.head.appendChild(link);
}

/**
 * Preload critical resources
 */
export function preloadResource(url, as = 'script') {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = url;
  link.as = as;
  document.head.appendChild(link);
}

/**
 * Measure component render time
 */
export function measureRenderTime(componentName) {
  const start = performance.now();
  
  return () => {
    const duration = performance.now() - start;
    
    if (import.meta.env.DEV && duration > 16) { // Longer than one frame
      logger.warn(`[Render] ${componentName} took ${duration.toFixed(2)}ms`);
    }
    
    trackPerformance(`render_${componentName}`, duration);
  };
}

/**
 * Debounce function with leading/trailing options
 */
export function debounce(fn, delay, { leading = false, trailing = true } = {}) {
  let timeoutId = null;
  let lastArgs = null;
  
  const debounced = (...args) => {
    lastArgs = args;
    
    if (timeoutId === null && leading) {
      fn(...args);
    }
    
    clearTimeout(timeoutId);
    
    timeoutId = setTimeout(() => {
      if (trailing && lastArgs) {
        fn(...lastArgs);
      }
      timeoutId = null;
    }, delay);
  };
  
  debounced.cancel = () => {
    clearTimeout(timeoutId);
    timeoutId = null;
  };
  
  return debounced;
}

/**
 * Throttle function
 */
export function throttle(fn, limit) {
  let inThrottle = false;
  let lastArgs = null;
  
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };
}

/**
 * Request idle callback wrapper
 */
export function requestIdleCallback(callback, options = {}) {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }
  
  // Fallback for Safari
  return setTimeout(() => callback({ timeRemaining: () => 50 }), 1);
}

/**
 * Cancel idle callback
 */
export function cancelIdleCallback(id) {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}

export default {
  initWebVitals,
  measureLCP,
  measureFID,
  measureCLS,
  measureFCP,
  measureTTFB,
  prefetchRoute,
  preloadResource,
  measureRenderTime,
  debounce,
  throttle,
  requestIdleCallback,
  cancelIdleCallback,
};
