import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * StatsCard - Display a single metric/KPI with optional trend
 * 
 * @param {string} label - Metric label
 * @param {string|number} value - Main value to display
 * @param {string} suffix - Optional suffix (e.g., "XP", "%", "km")
 * @param {number} change - Percentage change (positive = up, negative = down)
 * @param {React.ElementType} icon - Optional icon component
 * @param {string} variant - Color variant (default, neon, cyan, green, yellow, purple)
 * @param {boolean} compact - Compact mode for smaller spaces
 */

const variants = {
  default: {
    border: "border-white/10",
    iconBg: "bg-white/10",
    iconColor: "text-white/60",
    valueColor: "text-white",
  },
  neon: {
    border: "border-[#FF1493]/30",
    iconBg: "bg-[#FF1493]/20",
    iconColor: "text-[#FF1493]",
    valueColor: "text-[#FF1493]",
  },
  cyan: {
    border: "border-[#00D9FF]/30",
    iconBg: "bg-[#00D9FF]/20",
    iconColor: "text-[#00D9FF]",
    valueColor: "text-[#00D9FF]",
  },
  green: {
    border: "border-[#39FF14]/30",
    iconBg: "bg-[#39FF14]/20",
    iconColor: "text-[#39FF14]",
    valueColor: "text-[#39FF14]",
  },
  yellow: {
    border: "border-[#FFEB3B]/30",
    iconBg: "bg-[#FFEB3B]/20",
    iconColor: "text-[#FFEB3B]",
    valueColor: "text-[#FFEB3B]",
  },
  purple: {
    border: "border-[#B026FF]/30",
    iconBg: "bg-[#B026FF]/20",
    iconColor: "text-[#B026FF]",
    valueColor: "text-[#B026FF]",
  },
};

export function StatsCard({
  label,
  value,
  suffix,
  change,
  icon: Icon,
  variant = "default",
  compact = false,
  className,
}) {
  const styles = variants[variant] || variants.default;

  const TrendIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  const trendColor = change > 0 ? "text-[#39FF14]" : change < 0 ? "text-red-400" : "text-white/40";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "bg-black/50 backdrop-blur-sm border-2 rounded-lg transition-all",
        styles.border,
        compact ? "p-3" : "p-4",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-white/60 uppercase tracking-wider font-medium truncate",
            compact ? "text-[10px]" : "text-xs"
          )}>
            {label}
          </p>
          
          <div className="flex items-baseline gap-1 mt-1">
            <motion.span
              key={value}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "font-black",
                compact ? "text-xl" : "text-2xl md:text-3xl",
                styles.valueColor
              )}
            >
              {typeof value === 'number' ? value.toLocaleString() : value}
            </motion.span>
            
            {suffix && (
              <span className={cn(
                "text-white/40 uppercase font-bold",
                compact ? "text-xs" : "text-sm"
              )}>
                {suffix}
              </span>
            )}
          </div>

          {change !== undefined && change !== null && (
            <div className={cn("flex items-center gap-1 mt-2", trendColor)}>
              <TrendIcon className="w-3 h-3" />
              <span className="text-xs font-bold">
                {change > 0 ? '+' : ''}{change}%
              </span>
            </div>
          )}
        </div>

        {Icon && (
          <div className={cn(
            "rounded-lg flex items-center justify-center flex-shrink-0",
            styles.iconBg,
            compact ? "w-8 h-8" : "w-10 h-10"
          )}>
            <Icon className={cn(
              styles.iconColor,
              compact ? "w-4 h-4" : "w-5 h-5"
            )} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

/**
 * StatsGrid - Grid container for StatsCard components
 */
export function StatsGrid({ children, columns = 4, className }) {
  return (
    <div className={cn(
      "grid gap-3 md:gap-4",
      columns === 2 && "grid-cols-2",
      columns === 3 && "grid-cols-2 md:grid-cols-3",
      columns === 4 && "grid-cols-2 md:grid-cols-4",
      className
    )}>
      {children}
    </div>
  );
}

export default StatsCard;
