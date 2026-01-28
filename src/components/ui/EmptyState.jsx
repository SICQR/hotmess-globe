import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * EmptyState - Beautiful empty state component with variants
 * 
 * @param {React.ElementType} icon - Lucide icon component
 * @param {string} title - Main heading
 * @param {string} description - Description text
 * @param {Function} action - Primary action callback
 * @param {string} actionLabel - Primary button label
 * @param {Function} secondaryAction - Secondary action callback
 * @param {string} secondaryLabel - Secondary button label
 * @param {string} variant - Visual variant (default, subtle, bordered)
 * @param {string} size - Size variant (sm, default, lg)
 * @param {string} accentColor - Accent color for icon (neon, cyan, green, yellow, purple)
 */

const accentColors = {
  neon: 'text-[#FF1493] bg-[#FF1493]/10 border-[#FF1493]/30',
  cyan: 'text-[#00D9FF] bg-[#00D9FF]/10 border-[#00D9FF]/30',
  green: 'text-[#39FF14] bg-[#39FF14]/10 border-[#39FF14]/30',
  yellow: 'text-[#FFEB3B] bg-[#FFEB3B]/10 border-[#FFEB3B]/30',
  purple: 'text-[#B026FF] bg-[#B026FF]/10 border-[#B026FF]/30',
  default: 'text-white/30 bg-white/5 border-white/10',
};

const sizes = {
  sm: { container: 'py-8', icon: 'w-12 h-12', iconBox: 'w-16 h-16', title: 'text-lg' },
  default: { container: 'py-16', icon: 'w-10 h-10', iconBox: 'w-20 h-20', title: 'text-xl' },
  lg: { container: 'py-24', icon: 'w-12 h-12', iconBox: 'w-24 h-24', title: 'text-2xl' },
};

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  actionLabel,
  secondaryAction,
  secondaryLabel,
  variant = 'default',
  size = 'default',
  accentColor = 'default',
  className,
}) {
  const sizeStyles = sizes[size] || sizes.default;
  const colorStyles = accentColors[accentColor] || accentColors.default;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center px-4 text-center",
        sizeStyles.container,
        variant === 'bordered' && 'border-2 border-dashed border-white/10 rounded-lg mx-4',
        className
      )}
    >
      {Icon && (
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className={cn(
            "rounded-full flex items-center justify-center mb-6 border-2",
            sizeStyles.iconBox,
            colorStyles
          )}
        >
          <Icon className={cn(sizeStyles.icon)} />
        </motion.div>
      )}
      
      <motion.h3 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={cn("font-black uppercase mb-2", sizeStyles.title)}
      >
        {title}
      </motion.h3>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-white/60 mb-6 max-w-md text-sm"
      >
        {description}
      </motion.p>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        {action && actionLabel && (
          <Button 
            onClick={action} 
            className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black uppercase"
          >
            {actionLabel}
          </Button>
        )}
        {secondaryAction && secondaryLabel && (
          <Button 
            onClick={secondaryAction} 
            variant="outline"
            className="border-white/20 text-white hover:bg-white hover:text-black font-black uppercase"
          >
            {secondaryLabel}
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
}