/**
 * Performance Monitoring Utilities
 * 
 * Track and report Core Web Vitals and custom performance metrics.
 * Also provides debounce/throttle utilities for performance optimization.
 */

import { trackEvent } from '@/components/utils/analytics';

/**
 * Debounce a function - delays execution until after wait ms have elapsed
 * since the last time the function was invoked.
 * @param {Function} fn - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @param {boolean} [immediate=false] - Execute immediately on first call
 * @returns {Function} Debounced function with cancel() method
 */
export function debounce(fn, wait, immediate = false) {
  let timeout = null;
  let result;

  function debounced(...args) {
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      timeout = null;
      if (!immediate) {
        result = fn.apply(this, args);
      }
    }, wait);
    
    if (callNow) {
      result = fn.apply(this, args);
    }
    
    return result;
  }

  debounced.cancel = function() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
}

/**
 * Throttle a function - ensures the function is called at most once in a 
 * specified time period.
 * @param {Function} fn - Function to throttle
 * @param {number} wait - Minimum milliseconds between calls
 * @param {Object} [options] - Options
 * @param {boolean} [options.leading=true] - Execute on leading edge
 * @param {boolean} [options.trailing=true] - Execute on trailing edge
 * @returns {Function} Throttled function with cancel() method
 */
export function throttle(fn, wait, options = {}) {
  const { leading = true, trailing = true } = options;
  let timeout = null;
  let lastArgs = null;
  let lastThis = null;
  let lastCallTime = 0;
  let result;

  function invokeFunc(time) {
    const args = lastArgs;
    const thisArg = lastThis;
    lastArgs = lastThis = null;
    lastCallTime = time;
    result = fn.apply(thisArg, args);
    return result;
  }

  function shouldInvoke(time) {
    const timeSinceLastCall = time - lastCallTime;
    return lastCallTime === 0 || timeSinceLastCall >= wait;
  }

  function trailingEdge(time) {
    timeout = null;
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = null;
    return result;
  }

  function throttled(...args) {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;

    if (isInvoking) {
      if (timeout === null && leading) {
        lastCallTime = time;
        result = fn.apply(this, args);
        lastArgs = lastThis = null;
      }
      if (timeout === null && trailing) {
        timeout = setTimeout(() => trailingEdge(Date.now()), wait);
      }
    }

    return result;
  }

  throttled.cancel = function() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    lastCallTime = 0;
    lastArgs = lastThis = null;
  };

  return throttled;
}

// Performance thresholds (based on Google's recommendations)
const THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint
  FID: { good: 100, needsImprovement: 300 },   // First Input Delay
  CLS: { good: 0.1, needsImprovement: 0.25 },  // Cumulative Layout Shift
  FCP: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint
  TTFB: { good: 800, needsImprovement: 1800 }, // Time to First Byte
  INP: { good: 200, needsImprovement: 500 },   // Interaction to Next Paint
};

// Collected metrics
const collectedMetrics = new Map();

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
 * Report a web vital metric
 */
function reportMetric(metric, value, id) {
  const rating = getRating(metric, value);
  
  collectedMetrics.set(metric, {
    value,
    rating,
    id,
    timestamp: Date.now(),
  });
  
  // Track in analytics
  trackEvent('web_vital', {
    metric,
    value: Math.round(value),
    rating,
    id,
    navigation_type: getNavigationType(),
  });
  
  // Log in development
  if (import.meta.env.DEV) {
    const color = rating === 'good' ? '✅' : rating === 'needs-improvement' ? '⚠️' : '❌';
    console.log(`[Performance] ${color} ${metric}: ${Math.round(value)}ms (${rating})`);
  }
}

/**
 * Get navigation type
 */
function getNavigationType() {
  if (performance?.getEntriesByType) {
    const navEntry = performance.getEntriesByType('navigation')[0];
    return navEntry?.type || 'unknown';
  }
  return 'unknown';
}

/**
 * Initialize Core Web Vitals monitoring
 */
export function initWebVitals() {
  if (typeof window === 'undefined') return;
  
  // Dynamic import to avoid bundling in development
  import('web-vitals').then(({ onCLS, onFID, onLCP, onFCP, onTTFB, onINP }) => {
    onCLS((metric) => reportMetric('CLS', metric.value * 1000, metric.id)); // Convert to ms-like
    onFID((metric) => reportMetric('FID', metric.value, metric.id));
    onLCP((metric) => reportMetric('LCP', metric.value, metric.id));
    onFCP((metric) => reportMetric('FCP', metric.value, metric.id));
    onTTFB((metric) => reportMetric('TTFB', metric.value, metric.id));
    onINP?.((metric) => reportMetric('INP', metric.value, metric.id));
  }).catch(() => {
    // web-vitals not installed, use manual tracking
    manualWebVitalsTracking();
  });
}

/**
 * Manual web vitals tracking (fallback)
 */
function manualWebVitalsTracking() {
  // Track LCP using PerformanceObserver
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          reportMetric('LCP', lastEntry.startTime, 'manual');
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      // Not supported
    }
    
    try {
      // Track FID
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.processingStart) {
            const delay = entry.processingStart - entry.startTime;
            reportMetric('FID', delay, 'manual');
          }
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      // Not supported
    }
    
    try {
      // Track CLS
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      
      // Report CLS on page hide
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          reportMetric('CLS', clsValue * 1000, 'manual');
        }
      });
    } catch (e) {
      // Not supported
    }
  }
  
  // Track FCP from paint timing
  if (performance?.getEntriesByName) {
    const fcpEntry = performance.getEntriesByName('first-contentful-paint')[0];
    if (fcpEntry) {
      reportMetric('FCP', fcpEntry.startTime, 'manual');
    }
  }
  
  // Track TTFB from navigation timing
  if (performance?.getEntriesByType) {
    const navEntry = performance.getEntriesByType('navigation')[0];
    if (navEntry?.responseStart) {
      reportMetric('TTFB', navEntry.responseStart, 'manual');
    }
  }
}

/**
 * Custom Performance Marker
 */
export function mark(name) {
  if (performance?.mark) {
    performance.mark(name);
  }
}

/**
 * Measure between two marks
 */
export function measure(name, startMark, endMark) {
  if (performance?.measure) {
    try {
      performance.measure(name, startMark, endMark || undefined);
      const entries = performance.getEntriesByName(name, 'measure');
      const entry = entries[entries.length - 1];
      
      if (entry) {
        trackEvent('performance_measure', {
          name,
          duration: Math.round(entry.duration),
        });
        
        if (import.meta.env.DEV) {
          console.log(`[Performance] ${name}: ${Math.round(entry.duration)}ms`);
        }
        
        return entry.duration;
      }
    } catch (e) {
      // Mark not found
    }
  }
  return null;
}

/**
 * Measure component render time
 */
export function measureRender(componentName) {
  const startMark = `${componentName}-render-start`;
  const endMark = `${componentName}-render-end`;
  const measureName = `${componentName}-render`;
  
  return {
    start: () => mark(startMark),
    end: () => {
      mark(endMark);
      return measure(measureName, startMark, endMark);
    },
  };
}

/**
 * Track long tasks
 */
export function trackLongTasks() {
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Task longer than 50ms
            trackEvent('long_task', {
              duration: Math.round(entry.duration),
              startTime: Math.round(entry.startTime),
            });
            
            if (import.meta.env.DEV) {
              console.warn(`[Performance] Long task detected: ${Math.round(entry.duration)}ms`);
            }
          }
        }
      });
      observer.observe({ type: 'longtask', buffered: true });
    } catch (e) {
      // Not supported
    }
  }
}

/**
 * Get current performance summary
 */
export function getPerformanceSummary() {
  const summary = {};
  
  for (const [metric, data] of collectedMetrics) {
    summary[metric] = {
      value: Math.round(data.value),
      rating: data.rating,
    };
  }
  
  // Add navigation timing
  if (performance?.timing) {
    const timing = performance.timing;
    summary.pageLoad = timing.loadEventEnd - timing.navigationStart;
    summary.domReady = timing.domContentLoadedEventEnd - timing.navigationStart;
  }
  
  // Add memory info if available
  if (performance?.memory) {
    summary.memory = {
      usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
      totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
    };
  }
  
  return summary;
}

/**
 * Performance budget check
 */
export function checkBudget(budgets = {}) {
  const defaults = {
    LCP: 2500,
    FID: 100,
    CLS: 0.1,
    bundleSize: 300, // KB
  };
  
  const merged = { ...defaults, ...budgets };
  const violations = [];
  
  for (const [metric, threshold] of Object.entries(merged)) {
    const data = collectedMetrics.get(metric);
    if (data && data.value > threshold) {
      violations.push({
        metric,
        value: data.value,
        threshold,
        overage: data.value - threshold,
      });
    }
  }
  
  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Resource timing analysis
 */
export function analyzeResources() {
  if (!performance?.getEntriesByType) return [];
  
  const resources = performance.getEntriesByType('resource');
  
  return resources.map(r => ({
    name: r.name.split('/').pop(),
    type: r.initiatorType,
    duration: Math.round(r.duration),
    size: r.transferSize || 0,
    cached: r.transferSize === 0,
  })).sort((a, b) => b.duration - a.duration);
}

/**
 * Get slow resources
 */
export function getSlowResources(threshold = 500) {
  return analyzeResources().filter(r => r.duration > threshold);
}

/**
 * Performance observer hook for React components
 */
export function usePerformanceObserver(callback) {
  if (typeof window === 'undefined') return;
  
  import('react').then(({ useEffect }) => {
    useEffect(() => {
      if (!('PerformanceObserver' in window)) return;
      
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      
      observer.observe({ entryTypes: ['measure', 'paint', 'navigation'] });
      
      return () => observer.disconnect();
    }, [callback]);
  });
}

/**
 * Initialize all performance monitoring
 */
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return;
  
  // Initialize web vitals
  initWebVitals();
  
  // Track long tasks
  trackLongTasks();
  
  // Report on page unload
  window.addEventListener('beforeunload', () => {
    const summary = getPerformanceSummary();
    
    // Use sendBeacon to ensure data is sent
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/performance', JSON.stringify(summary));
    }
  });
  
  // Log summary in development
  if (import.meta.env.DEV) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        console.group('[Performance Summary]');
        console.table(getPerformanceSummary());
        
        const slowResources = getSlowResources();
        if (slowResources.length > 0) {
          console.warn('Slow resources:', slowResources);
        }
        console.groupEnd();
      }, 3000);
    });
  }
}

// All functions are exported individually as named exports above
