import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * GlowCard - A card component with hover glow effects
 * 
 * Variants:
 * - default: Subtle white glow
 * - neon: Pink neon glow (brand primary)
 * - cyber: Cyan cyber glow
 * - success: Green success glow
 * - warning: Yellow warning glow
 */

const glowVariants = {
  default: {
    borderColor: "border-white/10",
    hoverBorder: "hover:border-white/30",
    glowColor: "hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]",
  },
  neon: {
    borderColor: "border-[#C8962C]/30",
    hoverBorder: "hover:border-[#C8962C]",
    glowColor: "hover:shadow-[0_0_30px_rgba(255,20,147,0.4)]",
  },
  cyber: {
    borderColor: "border-[#00D9FF]/30",
    hoverBorder: "hover:border-[#00D9FF]",
    glowColor: "hover:shadow-[0_0_30px_rgba(0,217,255,0.4)]",
  },
  success: {
    borderColor: "border-[#39FF14]/30",
    hoverBorder: "hover:border-[#39FF14]",
    glowColor: "hover:shadow-[0_0_30px_rgba(57,255,20,0.4)]",
  },
  warning: {
    borderColor: "border-[#FFEB3B]/30",
    hoverBorder: "hover:border-[#FFEB3B]",
    glowColor: "hover:shadow-[0_0_30px_rgba(255,235,59,0.4)]",
  },
  purple: {
    borderColor: "border-[#B026FF]/30",
    hoverBorder: "hover:border-[#B026FF]",
    glowColor: "hover:shadow-[0_0_30px_rgba(176,38,255,0.4)]",
  },
};

const GlowCard = React.forwardRef(
  ({ className, variant = "default", interactive = true, children, ...props }, ref) => {
    const variantStyles = glowVariants[variant] || glowVariants.default;

    return (
      <motion.div
        ref={ref}
        whileHover={interactive ? { scale: 1.02, y: -2 } : undefined}
        whileTap={interactive ? { scale: 0.98 } : undefined}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(
          "bg-black/50 backdrop-blur-sm border-2 rounded-lg p-4 transition-all duration-300",
          variantStyles.borderColor,
          interactive && variantStyles.hoverBorder,
          interactive && variantStyles.glowColor,
          interactive && "cursor-pointer",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
GlowCard.displayName = "GlowCard";

/**
 * GlowCardHeader - Header section for GlowCard
 */
const GlowCardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-between mb-3", className)}
    {...props}
  />
));
GlowCardHeader.displayName = "GlowCardHeader";

/**
 * GlowCardTitle - Title for GlowCard
 */
const GlowCardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-black uppercase text-sm tracking-wider", className)}
    {...props}
  />
));
GlowCardTitle.displayName = "GlowCardTitle";

/**
 * GlowCardContent - Content section for GlowCard
 */
const GlowCardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-white/80", className)} {...props} />
));
GlowCardContent.displayName = "GlowCardContent";

/**
 * GlowCardFooter - Footer section for GlowCard
 */
const GlowCardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-between mt-4 pt-3 border-t border-white/10", className)}
    {...props}
  />
));
GlowCardFooter.displayName = "GlowCardFooter";

export { GlowCard, GlowCardHeader, GlowCardTitle, GlowCardContent, GlowCardFooter };
