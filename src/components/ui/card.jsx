import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-lg border transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-white/5 border-white/10 hover:border-white/20",
        solid: "bg-[#111111] border-white/10 hover:border-white/20",
        glass: "bg-white/5 backdrop-blur-lg border-white/10 hover:border-white/20",
        outline: "bg-transparent border-white/20 hover:border-white/30",
        ghost: "bg-transparent border-transparent hover:bg-white/5",
        elevated: "bg-[#0A0A0A] border-white/10 shadow-lg",
        primary: "bg-[#FF1493]/10 border-[#FF1493]/30 hover:border-[#FF1493]/50",
        success: "bg-[#39FF14]/10 border-[#39FF14]/30 hover:border-[#39FF14]/50",
        warning: "bg-[#FFEB3B]/10 border-[#FFEB3B]/30 hover:border-[#FFEB3B]/50",
        premium: "bg-gradient-to-br from-[#FFD700]/10 to-[#FF1493]/10 border-[#FFD700]/30 hover:border-[#FFD700]/50",
      },
      size: {
        default: "",
        sm: "p-3",
        md: "p-4",
        lg: "p-6",
      },
      interactive: {
        true: "cursor-pointer hover:scale-[1.01] active:scale-[0.99]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      interactive: false,
    },
  }
)

const Card = React.forwardRef(({ className, variant, size, interactive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(cardVariants({ variant, size, interactive }), className)}
    {...props} />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props} />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props} />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props} />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props} />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
