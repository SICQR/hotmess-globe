import React, { Suspense, lazy } from 'react';

/**
 * Lazy loading utility with skeleton fallback
 * Provides code splitting for heavy pages with nice loading states
 */

// Base skeleton component
export function PageSkeleton({ variant = 'default' }) {
  if (variant === 'grid') {
    return (
      <div className="min-h-screen bg-black p-4 animate-pulse">
        <div className="max-w-7xl mx-auto">
          <div className="h-8 w-48 bg-white/10 rounded mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-white/5 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <div className="min-h-screen bg-black p-4 animate-pulse">
        <div className="max-w-7xl mx-auto">
          <div className="h-10 w-64 bg-white/10 rounded mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-white/5 rounded-lg" />
            ))}
          </div>
          <div className="h-64 bg-white/5 rounded-lg" />
        </div>
      </div>
    );
  }

  if (variant === 'profile') {
    return (
      <div className="min-h-screen bg-black animate-pulse">
        <div className="h-48 bg-white/5" />
        <div className="max-w-4xl mx-auto px-4 -mt-16">
          <div className="w-32 h-32 rounded-full bg-white/10 border-4 border-black" />
          <div className="mt-4 space-y-3">
            <div className="h-8 w-48 bg-white/10 rounded" />
            <div className="h-4 w-64 bg-white/5 rounded" />
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-white/5 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'globe') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="relative">
          <div className="w-64 h-64 rounded-full bg-gradient-to-br from-white/10 to-white/5 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white/40 text-sm uppercase tracking-wider">
              Loading Globe...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'messages') {
    return (
      <div className="min-h-screen bg-black animate-pulse">
        <div className="max-w-4xl mx-auto">
          <div className="h-16 bg-white/5 mb-2" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4 border-b border-white/5">
              <div className="w-12 h-12 rounded-full bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-white/10 rounded" />
                <div className="h-3 w-48 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'marketplace') {
    return (
      <div className="min-h-screen bg-black p-4 animate-pulse">
        <div className="max-w-7xl mx-auto">
          <div className="h-48 bg-white/5 rounded-lg mb-6" />
          <div className="flex gap-2 mb-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 w-24 bg-white/10 rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-square bg-white/5 rounded-lg" />
                <div className="h-4 w-3/4 bg-white/10 rounded" />
                <div className="h-4 w-1/2 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'events') {
    return (
      <div className="min-h-screen bg-black p-4 animate-pulse">
        <div className="max-w-7xl mx-auto">
          <div className="h-64 bg-white/5 rounded-lg mb-6" />
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-20 w-16 bg-white/10 rounded-lg flex-shrink-0" />
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-4 p-4 bg-white/5 rounded-lg">
                <div className="w-24 h-24 bg-white/10 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-3/4 bg-white/10 rounded" />
                  <div className="h-4 w-1/2 bg-white/5 rounded" />
                  <div className="h-4 w-1/4 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default skeleton
  return (
    <div className="min-h-screen bg-black p-4 animate-pulse">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-48 bg-white/10 rounded" />
        <div className="h-4 w-full bg-white/5 rounded" />
        <div className="h-4 w-3/4 bg-white/5 rounded" />
        <div className="h-64 w-full bg-white/5 rounded-lg mt-8" />
      </div>
    </div>
  );
}

/**
 * Create a lazy-loaded component with a skeleton fallback
 * @param {Function} importFn - Dynamic import function
 * @param {string} variant - Skeleton variant for loading state
 */
export function lazyWithSkeleton(importFn, variant = 'default') {
  const LazyComponent = lazy(importFn);

  return function LazyWithFallback(props) {
    return (
      <Suspense fallback={<PageSkeleton variant={variant} />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * Pre-configured lazy loaders for common page types
 */
export const lazyPage = {
  grid: (importFn) => lazyWithSkeleton(importFn, 'grid'),
  dashboard: (importFn) => lazyWithSkeleton(importFn, 'dashboard'),
  profile: (importFn) => lazyWithSkeleton(importFn, 'profile'),
  globe: (importFn) => lazyWithSkeleton(importFn, 'globe'),
  messages: (importFn) => lazyWithSkeleton(importFn, 'messages'),
  marketplace: (importFn) => lazyWithSkeleton(importFn, 'marketplace'),
  events: (importFn) => lazyWithSkeleton(importFn, 'events'),
  default: (importFn) => lazyWithSkeleton(importFn, 'default'),
};

export default lazyWithSkeleton;
