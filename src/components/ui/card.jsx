import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * LED BRUTALIST Card Component
 * - No border-radius (brutal edges)
 * - 2px borders
 * - Optional LED glow variants
 */

const Card = React.forwardRef(({ className, variant, ...props }, ref) => {
  const variantStyles = {
    default: "border-2 border-white/20 bg-black",
    hot: "border-2 border-[#E62020] bg-black shadow-[0_0_20px_rgba(255,20,147,0.4)]",
    live: "border-2 border-[#39FF14] bg-black shadow-[0_0_20px_rgba(57,255,20,0.4)]",
    glass: "border-2 border-white/10 bg-white/5 backdrop-blur-xl",
    elevated: "border-2 border-white bg-black",
  };

  return (
    <div
      ref={ref}
      className={cn(
        variantStyles[variant] || variantStyles.default,
        "text-white overflow-hidden",
        className
      )}
      {...props} 
    />
  );
})
Card.displayName = "Card"

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5 p-4 md:p-6 border-b border-white/10",
      className
    )}
    {...props} />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef(({ className, as: Component = 'h3', ...props }, ref) => (
  <Component
    ref={ref}
    className={cn(
      // LED BRUTALIST: Bold uppercase mono
      "font-mono font-bold uppercase tracking-[0.1em] text-white",
      className
    )}
    {...props} />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn(
      // LED BRUTALIST: Smaller mono text
      "font-mono text-xs text-white/60 uppercase tracking-wider",
      className
    )}
    {...props} />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-4 md:p-6", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center p-4 md:p-6 border-t border-white/10",
      className
    )}
    {...props} />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
