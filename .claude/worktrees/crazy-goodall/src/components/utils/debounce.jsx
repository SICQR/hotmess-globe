/**
 * Performance optimization utilities
 */

// Debounce function for search inputs and API calls
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function for scroll/resize events
export function throttle(func, limit = 100) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

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