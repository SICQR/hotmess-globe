import React, { useRef, useState, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { springConfig } from '@/lib/animations';

interface MagneticButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  children: ReactNode;
  /** Strength of the magnetic pull effect (0-1). Default: 0.15 */
  strength?: number;
  /** Whether the button scales on tap. Default: true */
  scaleOnTap?: boolean;
  /** Custom className */
  className?: string;
  /** Disable the magnetic effect */
  disabled?: boolean;
}

/**
 * MagneticButton - A button that slightly follows the cursor on hover
 * Creates a "magnetic" pull effect for engaging micro-interactions
 * 
 * @example
 * ```tsx
 * <MagneticButton
 *   className="bg-hot text-white px-6 py-3"
 *   onClick={() => console.log('clicked')}
 * >
 *   Hover me!
 * </MagneticButton>
 * ```
 */
export function MagneticButton({
  children,
  strength = 0.15,
  scaleOnTap = true,
  className,
  disabled = false,
  ...props
}: MagneticButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - rect.width / 2) * strength;
    const y = (e.clientY - rect.top - rect.height / 2) * strength;
    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.button
      ref={buttonRef}
      animate={{ 
        x: position.x, 
        y: position.y,
        scale: 1,
      }}
      whileTap={scaleOnTap && !disabled ? { scale: 0.97 } : undefined}
      transition={springConfig.magnetic}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative inline-flex items-center justify-center',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </motion.button>
  );
}

/**
 * MagneticCard - A card variant with magnetic hover effect
 */
interface MagneticCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode;
  strength?: number;
  className?: string;
  disabled?: boolean;
}

export function MagneticCard({
  children,
  strength = 0.1,
  className,
  disabled = false,
  ...props
}: MagneticCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const x = (e.clientX - centerX) * strength;
    const y = (e.clientY - centerY) * strength;
    
    // Calculate rotation based on cursor position
    const rotateX = ((e.clientY - centerY) / (rect.height / 2)) * -5;
    const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * 5;

    setPosition({ x, y });
    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
    setRotation({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={cardRef}
      animate={{ 
        x: position.x, 
        y: position.y,
        rotateX: rotation.x,
        rotateY: rotation.y,
      }}
      transition={springConfig.gentle}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative',
        disabled && 'pointer-events-none',
        className
      )}
      style={{ transformStyle: 'preserve-3d' }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * MagneticIcon - Smaller magnetic effect for icons/small elements
 */
interface MagneticIconProps extends Omit<HTMLMotionProps<'span'>, 'children'> {
  children: ReactNode;
  strength?: number;
  className?: string;
}

export function MagneticIcon({
  children,
  strength = 0.3,
  className,
  ...props
}: MagneticIconProps) {
  const iconRef = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLSpanElement>) => {
    const rect = iconRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = (e.clientX - rect.left - rect.width / 2) * strength;
    const y = (e.clientY - rect.top - rect.height / 2) * strength;
    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.span
      ref={iconRef}
      animate={{ x: position.x, y: position.y }}
      transition={springConfig.snappy}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn('inline-flex items-center justify-center', className)}
      {...props}
    >
      {children}
    </motion.span>
  );
}

export default MagneticButton;
