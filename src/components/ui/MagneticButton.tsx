import React, { useRef, useState, useCallback, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { springConfig } from '@/lib/animations';

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  strength?: number;
  disabled?: boolean;
  onClick?: () => void;
  as?: 'button' | 'div' | 'a';
  href?: string;
}

/**
 * MagneticButton - A button that subtly follows the cursor
 * Creates an engaging "magnetic" pull effect on hover
 */
export function MagneticButton({
  children,
  className,
  strength = 0.15,
  disabled = false,
  onClick,
  as = 'button',
  href,
}: MagneticButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | HTMLDivElement | HTMLAnchorElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      
      const el = buttonRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const x = (e.clientX - centerX) * strength;
      const y = (e.clientY - centerY) * strength;
      
      setPosition({ x, y });
    },
    [disabled, strength]
  );

  const handleMouseLeave = useCallback(() => {
    setPosition({ x: 0, y: 0 });
  }, []);

  const MotionComponent = motion[as] as typeof motion.button;

  return (
    <MotionComponent
      ref={buttonRef as any}
      animate={{ x: position.x, y: position.y }}
      transition={springConfig.magnetic}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      disabled={disabled}
      href={as === 'a' ? href : undefined}
      className={cn(
        'relative inline-flex items-center justify-center',
        'transition-colors duration-200',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
    >
      {children}
    </MotionComponent>
  );
}

/**
 * MagneticWrapper - Wrap any element to add magnetic effect
 */
export function MagneticWrapper({
  children,
  className,
  strength = 0.1,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const el = wrapperRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const x = (e.clientX - centerX) * strength;
      const y = (e.clientY - centerY) * strength;
      
      setPosition({ x, y });
    },
    [strength]
  );

  const handleMouseLeave = useCallback(() => {
    setPosition({ x: 0, y: 0 });
  }, []);

  return (
    <motion.div
      ref={wrapperRef}
      animate={{ x: position.x, y: position.y }}
      transition={springConfig.magnetic}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn('inline-block', className)}
    >
      {children}
    </motion.div>
  );
}

export default MagneticButton;
