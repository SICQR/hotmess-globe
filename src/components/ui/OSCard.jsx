import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function OSCard({ 
  children, 
  className,
  imageSrc,
  imageAlt = '',
  locked = false,
  xpRequired,
  grayscaleImage = true,
  hoverGlow = true,
  onClick,
  ...props 
}) {
  return (
    <motion.div
      whileHover={hoverGlow ? { scale: 1.02 } : {}}
      onClick={onClick}
      className={cn(
        'relative bg-black border-2 border-white rounded-none overflow-hidden transition-all duration-300',
        'hover:border-[#FF1493]',
        hoverGlow && 'hover:shadow-[0_0_10px_#FF1493]',
        onClick && 'cursor-pointer',
        className
      )}
      {...props}
    >
      {/* Image Layer */}
      {imageSrc && (
        <div className="relative overflow-hidden">
          <img
            src={imageSrc}
            alt={imageAlt}
            className={cn(
              'w-full h-full object-cover transition-all duration-500',
              grayscaleImage && 'grayscale hover:grayscale-0',
              locked && 'blur-md'
            )}
          />
          {locked && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-center">
                <div className="text-white font-black text-2xl uppercase mb-2">LOCKED</div>
                {xpRequired && (
                  <div className="text-[#FFEB3B] text-sm font-bold">
                    {xpRequired} XP Required
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

export function OSCardImage({ src, alt, locked, grayscale = true, className }) {
  return (
    <div className="relative overflow-hidden">
      <img
        src={src || 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400'}
        alt={alt}
        className={cn(
          'w-full h-full object-cover transition-all duration-500',
          grayscale && 'grayscale group-hover:grayscale-0',
          locked && 'blur-md',
          className
        )}
        onError={(e) => {
          e.target.src = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400';
        }}
      />
    </div>
  );
}

export function OSCardBadge({ children, color = '#FF1493', className }) {
  return (
    <div 
      className={cn('px-2 py-1 text-[10px] font-black uppercase tracking-wider', className)}
      style={{ 
        backgroundColor: `${color}20`,
        border: `2px solid ${color}`,
        color: color
      }}
    >
      {children}
    </div>
  );
}