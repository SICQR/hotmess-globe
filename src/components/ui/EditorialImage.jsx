/**
 * Editorial Image Components
 * 
 * Magazine-style image treatments with parallax, captions, and overlays.
 */

import React, { useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

// ============================================================================
// EditorialImage - Full-bleed image with parallax
// ============================================================================

export function EditorialImage({
  src,
  alt = '',
  caption,
  credit,
  aspectRatio = '16/9', // or '4/5', '1/1', '3/4', 'auto'
  parallax = false,
  parallaxSpeed = 0.3,
  overlay = 'gradient', // 'gradient', 'dark', 'light', 'none'
  overlayOpacity = 0.4,
  grayscale = false,
  hoverZoom = true,
  className = '',
  children,
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(
    scrollYProgress,
    [0, 1],
    parallax ? [-100 * parallaxSpeed, 100 * parallaxSpeed] : [0, 0]
  );

  const overlayStyles = {
    gradient: 'bg-gradient-to-t from-black via-black/30 to-transparent',
    dark: 'bg-black',
    light: 'bg-white',
    none: '',
  };

  const aspectStyles = {
    '16/9': 'aspect-video',
    '4/5': 'aspect-[4/5]',
    '1/1': 'aspect-square',
    '3/4': 'aspect-[3/4]',
    '9/16': 'aspect-[9/16]',
    '21/9': 'aspect-[21/9]',
    auto: '',
  };

  return (
    <figure
      ref={ref}
      className={`relative overflow-hidden ${aspectStyles[aspectRatio] || ''} ${className}`}
      {...props}
    >
      {/* Image */}
      <motion.div
        style={{ y: parallax ? y : 0 }}
        className="absolute inset-0 w-full h-full"
      >
        {!hasError ? (
          <motion.img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={`w-full h-full object-cover transition-all duration-700 ${
              grayscale ? 'grayscale hover:grayscale-0' : ''
            } ${hoverZoom ? 'group-hover:scale-105' : ''} ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            whileHover={hoverZoom ? { scale: 1.05 } : {}}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          />
        ) : (
          <div className="w-full h-full bg-white/5 flex items-center justify-center">
            <span className="text-white/30 text-sm">Image unavailable</span>
          </div>
        )}

        {/* Loading skeleton */}
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 bg-white/5 animate-pulse" />
        )}
      </motion.div>

      {/* Overlay */}
      {overlay !== 'none' && (
        <div
          className={`absolute inset-0 ${overlayStyles[overlay]}`}
          style={{ opacity: overlayOpacity }}
        />
      )}

      {/* Children (overlay content) */}
      {children && (
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
          {children}
        </div>
      )}

      {/* Caption & Credit */}
      {(caption || credit) && (
        <figcaption className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          {caption && (
            <p className="text-sm text-white/90 mb-1">{caption}</p>
          )}
          {credit && (
            <p className="text-xs text-white/50">Photo: {credit}</p>
          )}
        </figcaption>
      )}
    </figure>
  );
}

// ============================================================================
// EditorialQuote - Pull quote with styling
// ============================================================================

export function EditorialQuote({
  quote,
  author,
  role,
  align = 'left', // 'left', 'center', 'right'
  size = 'large', // 'small', 'medium', 'large', 'xl'
  accent = '#E62020',
  className = '',
  ...props
}) {
  const sizeStyles = {
    small: 'text-lg md:text-xl',
    medium: 'text-xl md:text-2xl',
    large: 'text-2xl md:text-4xl',
    xl: 'text-3xl md:text-5xl lg:text-6xl',
  };

  const alignStyles = {
    left: 'text-left',
    center: 'text-center mx-auto',
    right: 'text-right ml-auto',
  };

  return (
    <blockquote
      className={`relative max-w-4xl ${alignStyles[align]} ${className}`}
      {...props}
    >
      {/* Accent mark */}
      <span
        className="absolute -top-4 -left-4 text-8xl font-serif opacity-20 select-none"
        style={{ color: accent }}
      >
        "
      </span>

      {/* Quote text */}
      <p className={`${sizeStyles[size]} font-black italic leading-tight mb-6`}>
        {quote}
      </p>

      {/* Attribution */}
      {(author || role) && (
        <footer className="flex items-center gap-3">
          <span
            className="w-8 h-0.5"
            style={{ backgroundColor: accent }}
          />
          <div>
            {author && (
              <cite className="not-italic font-bold text-sm uppercase tracking-wider">
                {author}
              </cite>
            )}
            {role && (
              <p className="text-xs text-white/50 uppercase tracking-wider">
                {role}
              </p>
            )}
          </div>
        </footer>
      )}
    </blockquote>
  );
}

// ============================================================================
// EditorialGrid - Magazine-style grid layout
// ============================================================================

export function EditorialGrid({
  children,
  layout = 'featured', // 'featured', 'equal', 'masonry'
  gap = 4,
  className = '',
  ...props
}) {
  const layoutStyles = {
    featured: 'grid-cols-1 md:grid-cols-2 [&>*:first-child]:md:col-span-2',
    equal: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    masonry: 'columns-1 md:columns-2 lg:columns-3',
  };

  if (layout === 'masonry') {
    return (
      <div
        className={`${layoutStyles[layout]} gap-${gap} ${className}`}
        {...props}
      >
        {React.Children.map(children, (child, index) => (
          <div key={index} className={`break-inside-avoid mb-${gap}`}>
            {child}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`grid ${layoutStyles[layout]} gap-${gap} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ============================================================================
// EditorialDivider - Styled section divider
// ============================================================================

export function EditorialDivider({
  variant = 'line', // 'line', 'dots', 'icon'
  icon,
  className = '',
  ...props
}) {
  if (variant === 'dots') {
    return (
      <div className={`flex justify-center gap-2 py-8 ${className}`} {...props}>
        <span className="w-1.5 h-1.5 bg-white/30 rounded-full" />
        <span className="w-1.5 h-1.5 bg-white/30 rounded-full" />
        <span className="w-1.5 h-1.5 bg-white/30 rounded-full" />
      </div>
    );
  }

  if (variant === 'icon' && icon) {
    return (
      <div className={`flex justify-center py-8 ${className}`} {...props}>
        <div className="w-12 h-12 border border-white/20 flex items-center justify-center">
          {icon}
        </div>
      </div>
    );
  }

  return (
    <hr
      className={`border-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-16 ${className}`}
      {...props}
    />
  );
}

// ============================================================================
// EditorialCaption - Image caption styling
// ============================================================================

export function EditorialCaption({
  number,
  title,
  description,
  className = '',
  ...props
}) {
  return (
    <div className={`border-l-2 border-white/20 pl-4 ${className}`} {...props}>
      {number && (
        <span className="text-xs text-white/40 uppercase tracking-widest">
          {number}
        </span>
      )}
      {title && (
        <h4 className="text-lg font-bold mt-1">{title}</h4>
      )}
      {description && (
        <p className="text-sm text-white/60 mt-2 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}

export default EditorialImage;
