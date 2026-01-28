import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Interactive Card with built-in micro-interactions
 * Includes hover lift, tilt effect, glow, and magnetic hover
 */
export default function InteractiveCard({
  children,
  className,
  // Interaction options
  enableTilt = true,
  enableGlow = true,
  enableLift = true,
  enableMagnetic = false,
  // Customization
  tiltAmount = 10,
  liftAmount = 4,
  glowColor = 'rgba(255, 20, 147, 0.3)',
  glowSize = 200,
  magneticStrength = 0.3,
  // Animation options
  animationSpeed = 400,
  springConfig = { stiffness: 400, damping: 30 },
  // Event handlers
  onClick,
  onHoverStart,
  onHoverEnd,
  // Styling
  variant = 'default', // 'default', 'glass', 'solid', 'bordered'
  rounded = 'xl', // 'none', 'md', 'lg', 'xl', '2xl', 'full'
  padding = 'default', // 'none', 'sm', 'default', 'lg'
  ...props
}) {
  const cardRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 });
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });
  const [magneticOffset, setMagneticOffset] = useState({ x: 0, y: 0 });

  // Handle mouse move for tilt and glow
  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate tilt
    if (enableTilt) {
      const rotateY = ((mouseX / width) - 0.5) * tiltAmount * 2;
      const rotateX = -((mouseY / height) - 0.5) * tiltAmount * 2;
      setTilt({ rotateX, rotateY });
    }
    
    // Calculate glow position
    if (enableGlow) {
      const x = (mouseX / width) * 100;
      const y = (mouseY / height) * 100;
      setGlowPosition({ x, y });
    }
    
    // Calculate magnetic offset
    if (enableMagnetic) {
      const centerX = rect.left + width / 2;
      const centerY = rect.top + height / 2;
      const x = (e.clientX - centerX) * magneticStrength;
      const y = (e.clientY - centerY) * magneticStrength;
      setMagneticOffset({ x, y });
    }
  }, [enableTilt, enableGlow, enableMagnetic, tiltAmount, magneticStrength]);

  const handleMouseEnter = useCallback((e) => {
    setIsHovered(true);
    onHoverStart?.(e);
  }, [onHoverStart]);

  const handleMouseLeave = useCallback((e) => {
    setIsHovered(false);
    setTilt({ rotateX: 0, rotateY: 0 });
    setGlowPosition({ x: 50, y: 50 });
    setMagneticOffset({ x: 0, y: 0 });
    onHoverEnd?.(e);
  }, [onHoverEnd]);

  // Variant styles
  const variants = {
    default: 'bg-white/5 border border-white/10',
    glass: 'bg-white/5 backdrop-blur-xl border border-white/10',
    solid: 'bg-black border-2 border-white',
    bordered: 'bg-transparent border-2 border-white/20',
  };

  // Rounded styles
  const roundedStyles = {
    none: 'rounded-none',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  };

  // Padding styles
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3',
    default: 'p-4 md:p-6',
    lg: 'p-6 md:p-8',
  };

  // Calculate transform
  const transform = {
    perspective: 1000,
    rotateX: enableTilt ? tilt.rotateX : 0,
    rotateY: enableTilt ? tilt.rotateY : 0,
    translateY: enableLift && isHovered ? -liftAmount : 0,
    translateX: enableMagnetic ? magneticOffset.x : 0,
    ...(enableMagnetic ? { y: magneticOffset.y } : {}),
    scale: isHovered ? 1.02 : 1,
  };

  return (
    <motion.div
      ref={cardRef}
      className={cn(
        "relative overflow-hidden transition-shadow cursor-pointer",
        variants[variant],
        roundedStyles[rounded],
        paddingStyles[padding],
        isHovered && enableLift && "shadow-lg shadow-black/30",
        className
      )}
      style={{
        transformStyle: 'preserve-3d',
      }}
      animate={transform}
      transition={{
        type: "spring",
        ...springConfig,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      {...props}
    >
      {/* Glow effect */}
      {enableGlow && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(${glowSize}px circle at ${glowPosition.x}% ${glowPosition.y}%, ${glowColor}, transparent 50%)`,
          }}
          animate={{
            opacity: isHovered ? 1 : 0,
          }}
          transition={{ duration: 0.3 }}
        />
      )}
      
      {/* Border highlight on hover */}
      {isHovered && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, rgba(255,20,147,0.1), transparent 50%, rgba(0,217,255,0.1))`,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}

// Pre-configured variants
export function GlassCard({ children, ...props }) {
  return (
    <InteractiveCard variant="glass" {...props}>
      {children}
    </InteractiveCard>
  );
}

export function SolidCard({ children, ...props }) {
  return (
    <InteractiveCard variant="solid" enableTilt={false} {...props}>
      {children}
    </InteractiveCard>
  );
}

export function ProfilePreviewCard({ 
  avatar, 
  name, 
  subtitle, 
  tags = [], 
  compatibility,
  onClick,
  ...props 
}) {
  return (
    <InteractiveCard 
      onClick={onClick} 
      glowColor="rgba(176, 38, 255, 0.3)"
      {...props}
    >
      <div className="flex items-center gap-4">
        {avatar && (
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 flex-shrink-0">
            <img src={avatar} alt={name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white truncate">{name}</h3>
          {subtitle && <p className="text-sm text-white/60 truncate">{subtitle}</p>}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.slice(0, 3).map((tag, i) => (
                <span 
                  key={i} 
                  className="px-2 py-0.5 bg-white/10 text-[10px] uppercase tracking-wider rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {compatibility !== undefined && (
          <div 
            className="text-lg font-black"
            style={{ 
              color: compatibility >= 80 ? '#39FF14' : compatibility >= 50 ? '#FFEB3B' : '#FF1493' 
            }}
          >
            {compatibility}%
          </div>
        )}
      </div>
    </InteractiveCard>
  );
}

export function EventPreviewCard({ 
  image, 
  title, 
  date, 
  location, 
  attendees,
  onClick,
  ...props 
}) {
  return (
    <InteractiveCard 
      onClick={onClick} 
      padding="none"
      glowColor="rgba(255, 20, 147, 0.3)"
      {...props}
    >
      {image && (
        <div className="aspect-video w-full overflow-hidden">
          <motion.img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-bold text-white truncate mb-2">{title}</h3>
        {date && <p className="text-sm text-[#FF1493]">{date}</p>}
        {location && <p className="text-sm text-white/60 truncate">{location}</p>}
        {attendees !== undefined && (
          <div className="mt-2 text-xs text-white/40">
            {attendees} going
          </div>
        )}
      </div>
    </InteractiveCard>
  );
}
