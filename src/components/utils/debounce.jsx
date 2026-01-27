/**
 * Performance optimization utilities
 * 
 * Re-exports debounce and throttle from the canonical performance module
 * to maintain backwards compatibility with existing imports.
 */

// Re-export from the canonical source
export { debounce, throttle } from '@/utils/performance';

// Additional utilities kept here for backwards compatibility

// Memoization helper
export function memoize(fn) {
  const cache = new Map();
  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

// Lazy load images with intersection observer
export function lazyLoadImage(img, src) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          img.src = src;
          observer.unobserve(img);
        }
      });
    });
    observer.observe(img);
  } else {
    // Fallback for browsers without IntersectionObserver
    img.src = src;
  }
}

// Batch multiple state updates
export function batchUpdates(updates) {
  return Promise.all(updates);
}

// Request animation frame wrapper for smooth animations
export function smoothUpdate(callback) {
  if (window.requestAnimationFrame) {
    return window.requestAnimationFrame(callback);
  }
  return setTimeout(callback, 16); // ~60fps fallback
}

// Cancel scheduled animation frame
export function cancelUpdate(id) {
  if (window.cancelAnimationFrame) {
    window.cancelAnimationFrame(id);
  } else {
    clearTimeout(id);
  }
}