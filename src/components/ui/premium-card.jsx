import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

/**
 * Premium Card Component
 * A glassmorphic card with optional glow effects and hover animations
 */
const PremiumCard = React.forwardRef(({ 
  className, 
  children, 
  glow = null, // 'hot' | 'cyan' | 'purple' | 'gold' | 'green' | null
  hover = true,
  animate = false,
  border = true,
  ...props 
}, ref) => {
  const glowStyles = {
    hot: "hover:shadow-glow-hot",
    cyan: "hover:shadow-glow-cyan",
    purple: "hover:shadow-glow-purple",
    gold: "hover:shadow-glow-gold",
    green: "hover:shadow-glow-green",
  };

  const borderStyles = {
    hot: "border-[#FF1493]/30 hover:border-[#FF1493]/50",
    cyan: "border-[#00D9FF]/30 hover:border-[#00D9FF]/50",
    purple: "border-[#B026FF]/30 hover:border-[#B026FF]/50",
    gold: "border-[#FFD700]/30 hover:border-[#FFD700]/50",
    green: "border-[#39FF14]/30 hover:border-[#39FF14]/50",
  };

  const baseClasses = cn(
    "relative overflow-hidden rounded-xl",
    "bg-white/5 backdrop-blur-sm",
    border && "border",
    border && (glow ? borderStyles[glow] : "border-white/10 hover:border-white/20"),
    hover && "transition-all duration-300",
    hover && "hover:-translate-y-0.5",
    glow && glowStyles[glow],
    className
  );

  if (animate) {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={baseClasses}
        {...props}
      >
        {/* Top shine line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        {children}
      </motion.div>
    );
  }

  return (
    <div ref={ref} className={baseClasses} {...props}>
      {/* Top shine line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      {children}
    </div>
  );
});
PremiumCard.displayName = "PremiumCard";

/**
 * Premium Card Header
 */
const PremiumCardHeader = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pb-0", className)} {...props}>
    {children}
  </div>
));
PremiumCardHeader.displayName = "PremiumCardHeader";

/**
 * Premium Card Content
 */
const PremiumCardContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("p-6", className)} {...props}>
    {children}
  </div>
));
PremiumCardContent.displayName = "PremiumCardContent";

/**
 * Premium Card Footer
 */
const PremiumCardFooter = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props}>
    {children}
  </div>
));
PremiumCardFooter.displayName = "PremiumCardFooter";

/**
 * Premium Card Title
 */
const PremiumCardTitle = React.forwardRef(({ className, children, ...props }, ref) => (
  <h3 ref={ref} className={cn("text-xl font-black uppercase tracking-tight", className)} {...props}>
    {children}
  </h3>
));
PremiumCardTitle.displayName = "PremiumCardTitle";

/**
 * Premium Card Description
 */
const PremiumCardDescription = React.forwardRef(({ className, children, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-white/60", className)} {...props}>
    {children}
  </p>
));
PremiumCardDescription.displayName = "PremiumCardDescription";

/**
 * Gradient Border Card
 * A card with an animated gradient border
 */
const GradientBorderCard = React.forwardRef(({ 
  className, 
  children, 
  gradient = "from-[#FF1493] via-[#B026FF] to-[#00D9FF]",
  ...props 
}, ref) => (
  <div ref={ref} className={cn("relative p-[2px] rounded-xl", className)} {...props}>
    <div className={cn("absolute inset-0 rounded-xl bg-gradient-to-r", gradient, "animate-gradient-shift")} 
         style={{ backgroundSize: '200% 200%' }} />
    <div className="relative bg-black rounded-[10px] h-full">
      {children}
    </div>
  </div>
));
GradientBorderCard.displayName = "GradientBorderCard";

/**
 * Feature Card
 * Specialized card for feature showcases
 */
const FeatureCard = React.forwardRef(({ 
  className, 
  icon: Icon,
  title,
  description,
  color = "hot", // 'hot' | 'cyan' | 'purple' | 'gold' | 'green'
  ...props 
}, ref) => {
  const colors = {
    hot: { bg: "bg-[#FF1493]/20", text: "text-[#FF1493]", border: "border-[#FF1493]/30" },
    cyan: { bg: "bg-[#00D9FF]/20", text: "text-[#00D9FF]", border: "border-[#00D9FF]/30" },
    purple: { bg: "bg-[#B026FF]/20", text: "text-[#B026FF]", border: "border-[#B026FF]/30" },
    gold: { bg: "bg-[#FFD700]/20", text: "text-[#FFD700]", border: "border-[#FFD700]/30" },
    green: { bg: "bg-[#39FF14]/20", text: "text-[#39FF14]", border: "border-[#39FF14]/30" },
  };

  const c = colors[color] || colors.hot;

  return (
    <PremiumCard ref={ref} glow={color} className={cn("p-6", className)} {...props}>
      <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mb-4", c.bg, c.border, "border")}>
        {Icon && <Icon className={cn("w-6 h-6", c.text)} />}
      </div>
      <h3 className="text-lg font-black uppercase mb-2">{title}</h3>
      <p className="text-sm text-white/60">{description}</p>
    </PremiumCard>
  );
});
FeatureCard.displayName = "FeatureCard";

/**
 * Stat Card
 * Card for displaying statistics
 */
const StatCard = React.forwardRef(({ 
  className, 
  label,
  value,
  icon: Icon,
  color = "cyan",
  ...props 
}, ref) => {
  const colors = {
    hot: "text-[#FF1493]",
    cyan: "text-[#00D9FF]",
    purple: "text-[#B026FF]",
    gold: "text-[#FFD700]",
    green: "text-[#39FF14]",
  };

  return (
    <PremiumCard ref={ref} className={cn("p-6", className)} {...props}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-widest text-white/40">{label}</span>
        {Icon && <Icon className={cn("w-4 h-4", colors[color])} />}
      </div>
      <p className={cn("text-3xl font-black", colors[color])}>{value}</p>
    </PremiumCard>
  );
});
StatCard.displayName = "StatCard";

export { 
  PremiumCard, 
  PremiumCardHeader,
  PremiumCardContent,
  PremiumCardFooter,
  PremiumCardTitle,
  PremiumCardDescription,
  GradientBorderCard,
  FeatureCard,
  StatCard
};
