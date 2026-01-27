import * as React from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

/**
 * LED BRUTALIST Badge Component
 * - No border-radius
 * - Mono font, uppercase
 * - LED glow effects for status variants
 */
const badgeVariants = cva(
  // Base: LED Brutalist - no rounded corners, mono uppercase
  "inline-flex items-center border-2 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] font-mono transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#E62020] focus:ring-offset-2 focus:ring-offset-black",
  {
    variants: {
      variant: {
        // ============================================
        // LED BRUTALIST PRIMARY VARIANTS
        // ============================================
        default:
          "border-white/30 bg-transparent text-white",
        // LED Hot - Pink glow border
        ledHot:
          "border-[#E62020] bg-transparent text-white shadow-[0_0_12px_rgba(255,20,147,0.8)]",
        // LED Live - Green glow with pulsing dot
        ledLive:
          "border-[#39FF14] bg-transparent text-white shadow-[0_0_12px_rgba(57,255,20,0.8)] animate-led-pulse",
        // LED Solid Hot - Filled
        ledSolidHot:
          "border-[#E62020] bg-[#E62020] text-black font-black shadow-[0_0_12px_rgba(255,20,147,0.6)]",
        // LED Solid Live - Filled green
        ledSolidLive:
          "border-[#39FF14] bg-[#39FF14] text-black font-black shadow-[0_0_12px_rgba(57,255,20,0.6)]",
        // ============================================
        // LEGACY VARIANTS (backwards compatibility)
        // ============================================
        secondary:
          "border-white/20 bg-white/5 text-white/70",
        destructive:
          "border-red-500 bg-red-500/20 text-red-400",
        outline: 
          "border-white/30 bg-transparent text-white",
        // Status variants
        online:
          "border-[#39FF14] bg-transparent text-[#39FF14]",
        offline:
          "border-white/20 bg-transparent text-white/40",
        away:
          "border-yellow-500 bg-transparent text-yellow-500",
        busy:
          "border-red-500 bg-transparent text-red-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  withDot = false,
  dotColor,
  role = 'status',
  ...props
}) {
  return (
    <span 
      role={role}
      className={cn(badgeVariants({ variant }), className)} 
      {...props}
    >
      {/* Optional LED dot indicator */}
      {withDot && (
        <span 
          aria-hidden="true"
          className="w-1.5 h-1.5 mr-2 animate-led-dot-pulse"
          style={{ 
            backgroundColor: dotColor || (variant === 'ledLive' || variant === 'ledSolidLive' ? '#39FF14' : '#E62020'),
            boxShadow: `0 0 8px ${dotColor || (variant === 'ledLive' || variant === 'ledSolidLive' ? '#39FF14' : '#E62020')}`
          }}
        />
      )}
      {props.children}
    </span>
  );
}

export { Badge, badgeVariants }
