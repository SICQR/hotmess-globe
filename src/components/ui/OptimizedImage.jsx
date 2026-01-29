import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

/**
 * OptimizedImage - Image component with lazy loading and blur-up effect
 * 
 * Features:
 * - Intersection Observer for lazy loading
 * - Blur-up placeholder effect
 * - Loading skeleton
 * - Error fallback
 * - Aspect ratio support
 * 
 * @param {string} src - Image source URL
 * @param {string} alt - Alt text for accessibility
 * @param {string} placeholder - Low-res placeholder image or color
 * @param {string} aspectRatio - CSS aspect ratio (e.g., "1/1", "16/9", "4/5")
 * @param {string} className - Additional CSS classes
 * @param {boolean} priority - If true, loads immediately without lazy loading
 * @param {Function} onLoad - Callback when image loads
 * @param {Function} onError - Callback when image fails to load
 */
export function OptimizedImage({
  src,
  alt = '',
  placeholder,
  aspectRatio = '1/1',
  className = '',
  priority = false,
  objectFit = 'cover',
  onLoad,
  onError,
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px', // Start loading 200px before entering viewport
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  // Generate a simple colored placeholder if none provided
  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    // Generate a subtle gradient placeholder
    return 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)';
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden bg-white/5',
        className
      )}
      style={{ aspectRatio }}
      {...props}
    >
      {/* Placeholder/skeleton */}
      <div
        className={cn(
          'absolute inset-0 transition-opacity duration-500',
          isLoaded ? 'opacity-0' : 'opacity-100'
        )}
        style={{
          background: getPlaceholder(),
        }}
      >
        {/* Skeleton pulse animation */}
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        )}
      </div>

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/5">
          <div className="text-center text-white/40">
            <svg
              className="w-8 h-8 mx-auto mb-2 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-[10px] uppercase tracking-wider">Failed to load</span>
          </div>
        </div>
      )}

      {/* Actual image */}
      {isInView && !hasError && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className={cn(
            'absolute inset-0 w-full h-full transition-opacity duration-500',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          style={{ objectFit }}
        />
      )}
    </div>
  );
}

/**
 * Avatar with optimized loading
 */
export function OptimizedAvatar({
  src,
  alt = '',
  size = 'md',
  className = '',
  fallbackInitials = '',
  ...props
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[8px]',
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-14 h-14 text-sm',
    xl: 'w-20 h-20 text-base',
    '2xl': 'w-32 h-32 text-lg',
  };

  const showFallback = !src || hasError;

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden bg-white/10 flex items-center justify-center',
        sizeClasses[size] || sizeClasses.md,
        className
      )}
      {...props}
    >
      {/* Fallback initials */}
      {showFallback && (
        <span className="font-bold text-white/60 uppercase">
          {fallbackInitials || '?'}
        </span>
      )}

      {/* Image */}
      {src && !hasError && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          loading="lazy"
          decoding="async"
          className={cn(
            'absolute inset-0 w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}

      {/* Loading state */}
      {src && !isLoaded && !hasError && (
        <div className="absolute inset-0 animate-pulse bg-white/10" />
      )}
    </div>
  );
}

/**
 * Background image with blur-up effect
 */
export function OptimizedBackgroundImage({
  src,
  placeholder,
  className = '',
  children,
  overlay = true,
  overlayClassName = '',
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView || !src) return;

    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.src = src;
  }, [isInView, src]);

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      {/* Placeholder */}
      <div
        className={cn(
          'absolute inset-0 bg-cover bg-center transition-opacity duration-700',
          isLoaded ? 'opacity-0' : 'opacity-100'
        )}
        style={{
          backgroundImage: placeholder ? `url(${placeholder})` : undefined,
          backgroundColor: !placeholder ? 'rgba(255,255,255,0.05)' : undefined,
          filter: 'blur(20px)',
          transform: 'scale(1.1)',
        }}
      />

      {/* Main image */}
      {isInView && (
        <div
          className={cn(
            'absolute inset-0 bg-cover bg-center transition-opacity duration-700',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          style={{ backgroundImage: `url(${src})` }}
        />
      )}

      {/* Overlay */}
      {overlay && (
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent',
            overlayClassName
          )}
        />
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default OptimizedImage;
