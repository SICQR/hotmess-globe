import { motion, useScroll, useTransform } from 'framer-motion';
import { motionEnabled } from '@/lib/animations';
import { useRef } from 'react';

interface EditorialImageProps {
  src: string;
  alt: string;
  blendMode?: 'screen' | 'multiply' | 'overlay' | 'soft-light' | 'hard-light';
  overlay?: 'hot' | 'cyan' | 'dual' | 'none';
  className?: string;
  parallax?: boolean;
  zoom?: boolean;
}

/**
 * EditorialImage - Enhanced image with mix-blend modes and parallax
 * LED Brutalist styling: Zero radius, hot pink gradients, sharp edges
 */
export function EditorialImage({
  src,
  alt,
  blendMode = 'screen',
  overlay = 'hot',
  className = '',
  parallax = false,
  zoom = false,
}: EditorialImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], ['0%', '20%']);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.1, 1, 0.95]);

  // LED Brutalist overlays - hot pink #FF1493, cyan #00D9FF
  const overlayColors = {
    hot: 'bg-gradient-to-br from-[#FF1493]/40 via-[#FF1493]/20 to-transparent',
    cyan: 'bg-gradient-to-br from-[#00D9FF]/30 via-[#00D9FF]/15 to-transparent',
    dual: 'bg-gradient-to-br from-[#FF1493]/30 via-[#00D9FF]/20 to-[#FF1493]/10',
    none: '',
  };

  const blendModeClass = `mix-blend-${blendMode}`;

  const imageContent = (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      {/* Base image with blend mode */}
      <motion.div
        className="w-full h-full"
        style={parallax && motionEnabled ? { y } : undefined}
      >
        <motion.div
          className="w-full h-full"
          style={zoom && motionEnabled ? { scale } : undefined}
        >
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className={`w-full h-full object-cover ${blendModeClass} opacity-85`}
          />
        </motion.div>
      </motion.div>

      {/* Color overlay with gradient */}
      {overlay !== 'none' && (
        <div className={`absolute inset-0 ${overlayColors[overlay]} mix-blend-multiply`} />
      )}

      {/* Hard-edge vignette (LED Brutalist - not soft) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40" />
      
      {/* Film grain texture overlay */}
      <div 
        className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );

  if (parallax && motionEnabled) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={className}
      >
        {imageContent}
      </motion.div>
    );
  }

  return imageContent;
}
