/**
 * Skeleton Loading Components
 * 
 * Animated placeholders for loading states.
 */

import React from 'react';
import { motion } from 'framer-motion';

// ============================================================================
// Base Skeleton
// ============================================================================

export function Skeleton({ 
  className = '', 
  variant = 'default', // 'default', 'circular', 'rounded', 'text'
  width,
  height,
  animation = 'pulse', // 'pulse', 'wave', 'none'
  'aria-label': ariaLabel = 'Loading...',
  ...props 
}) {
  const variantStyles = {
    default: 'rounded',
    circular: 'rounded-full',
    rounded: 'rounded-lg',
    text: 'rounded h-4',
  };

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'skeleton-wave',
    none: '',
  };

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={ariaLabel}
      className={`bg-white/10 ${variantStyles[variant]} ${animationStyles[animation]} ${className}`}
      style={{ width, height }}
      {...props}
    />
  );
}

// ============================================================================
// Profile Card Skeleton
// ============================================================================

export function ProfileCardSkeleton({ count = 1 }) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white/5 border border-white/10 overflow-hidden">
          {/* Image placeholder */}
          <Skeleton className="aspect-square w-full" />
          
          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Name */}
            <Skeleton className="h-5 w-3/4" />
            
            {/* Location */}
            <Skeleton className="h-3 w-1/2" />
            
            {/* Tags */}
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ============================================================================
// Profile Grid Skeleton
// ============================================================================

export function ProfileGridSkeleton({ columns = 4, count = 8 }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${columns} gap-4`}>
      <ProfileCardSkeleton count={count} />
    </div>
  );
}

// ============================================================================
// Chat Message Skeleton
// ============================================================================

export function ChatMessageSkeleton({ count = 3, align = 'alternating' }) {
  return (
    <div className="space-y-4 p-4">
      {[...Array(count)].map((_, i) => {
        const isLeft = align === 'left' || (align === 'alternating' && i % 2 === 0);
        
        return (
          <div 
            key={i} 
            className={`flex ${isLeft ? 'justify-start' : 'justify-end'}`}
          >
            <div className={`max-w-[70%] ${isLeft ? '' : 'items-end'}`}>
              {isLeft && <Skeleton className="w-8 h-8 rounded-full mb-2" />}
              <Skeleton 
                className={`h-12 ${isLeft ? 'w-48' : 'w-32'} rounded-lg`} 
              />
              <Skeleton className="h-3 w-16 mt-1" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Feed Item Skeleton
// ============================================================================

export function FeedItemSkeleton({ count = 3 }) {
  return (
    <div className="space-y-6">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white/5 border border-white/10 p-4">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          
          {/* Content */}
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-4" />
          
          {/* Image */}
          <Skeleton className="aspect-video w-full mb-4" />
          
          {/* Actions */}
          <div className="flex gap-4">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Product Card Skeleton
// ============================================================================

export function ProductCardSkeleton({ count = 1 }) {
  return (
    <>
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white/5 border border-white/10">
          {/* Image */}
          <Skeleton className="aspect-square w-full" />
          
          {/* Content */}
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex justify-between items-center pt-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-8 w-24 rounded" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ============================================================================
// Table Skeleton
// ============================================================================

export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-4 p-3 bg-white/5">
        {[...Array(columns)].map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {[...Array(rows)].map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 p-3 border-b border-white/5">
          {[...Array(columns)].map((_, colIdx) => (
            <Skeleton key={colIdx} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Stats Card Skeleton
// ============================================================================

export function StatsCardSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white/5 border border-white/10 p-4">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-8 w-24 mb-1" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Page Layout Skeleton
// ============================================================================

export function PageSkeleton({ variant = 'default' }) {
  if (variant === 'profile') {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Hero */}
        <Skeleton className="h-64 w-full" />
        
        <div className="max-w-4xl mx-auto px-4 -mt-16">
          {/* Avatar */}
          <Skeleton className="w-32 h-32 rounded-full border-4 border-black" />
          
          {/* Info */}
          <div className="mt-4 space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
          
          {/* Stats */}
          <div className="flex gap-6 mt-6">
            <Skeleton className="h-12 w-20" />
            <Skeleton className="h-12 w-20" />
            <Skeleton className="h-12 w-20" />
          </div>
          
          {/* Content */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-square" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-4">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        
        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-48" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Inline Loading
// ============================================================================

export function InlineLoader({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
  };

  return (
    <div 
      className={`${sizes[size]} border-[#E62020] border-t-transparent rounded-full animate-spin ${className}`}
    />
  );
}

// Add wave animation CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes skeleton-wave {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .skeleton-wave {
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    background-size: 200% 100%;
    animation: skeleton-wave 1.5s infinite;
  }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(style);
}

export default Skeleton;
