import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

function forceBlackTextOnWhiteBg(className) {
  if (!className) return className;

  const tokens = String(className).split(/\s+/).filter(Boolean);

  const hasBaseWhiteBg = tokens.some((token) => {
    if (token.includes(':')) return false;
    return /^bg-white(?:\/(?:8\d|9\d|100))?$/.test(token);
  });

  if (!hasBaseWhiteBg) return className;

  const hasBaseTextBlack = tokens.some((token) => {
    if (token.includes(':')) return false;
    return token === 'text-black';
  });

  if (hasBaseTextBlack) return className;

  return `${className} text-black`;
}

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        hot:
          "bg-[#FF1493] text-black shadow hover:bg-white",
        cyan:
          "bg-[#00D9FF] text-black shadow hover:bg-white",
        glass:
          "bg-white/5 text-white border border-white/10 hover:bg-white/10",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        
        // Gradient variants
        hotGradient:
          "bg-gradient-to-r from-[#FF1493] to-[#B026FF] text-white shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-[0.98]",
        cyanGradient:
          "bg-gradient-to-r from-[#00D9FF] to-[#3B82F6] text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98]",
        premium:
          "bg-gradient-to-r from-[#FFD700] to-[#FF6B35] text-black shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 hover:scale-[1.02] active:scale-[0.98] font-black",
        purpleGradient:
          "bg-gradient-to-r from-[#B026FF] to-[#FF1493] text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]",
        greenGradient:
          "bg-gradient-to-r from-[#39FF14] to-[#00D9FF] text-black shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-[1.02] active:scale-[0.98]",
        
        // Glow variants
        hotGlow:
          "bg-[#FF1493] text-white shadow-[0_0_20px_rgba(255,20,147,0.5)] hover:shadow-[0_0_30px_rgba(255,20,147,0.7)] animate-glow-pulse",
        cyanGlow:
          "bg-[#00D9FF] text-black shadow-[0_0_20px_rgba(0,217,255,0.5)] hover:shadow-[0_0_30px_rgba(0,217,255,0.7)]",
        goldGlow:
          "bg-[#FFD700] text-black shadow-[0_0_20px_rgba(255,215,0,0.5)] hover:shadow-[0_0_30px_rgba(255,215,0,0.7)]",
        greenGlow:
          "bg-[#39FF14] text-black shadow-[0_0_20px_rgba(57,255,20,0.5)] hover:shadow-[0_0_30px_rgba(57,255,20,0.7)]",
        
        // Ghost gradient (subtle)
        ghostGradient:
          "bg-gradient-to-r from-white/5 to-white/10 text-white border border-white/10 hover:from-white/10 hover:to-white/15 hover:border-white/20",
        
        // Outline variants with color
        outlineHot:
          "border-2 border-[#FF1493] text-[#FF1493] bg-transparent hover:bg-[#FF1493] hover:text-black",
        outlineCyan:
          "border-2 border-[#00D9FF] text-[#00D9FF] bg-transparent hover:bg-[#00D9FF] hover:text-black",
        outlineGold:
          "border-2 border-[#FFD700] text-[#FFD700] bg-transparent hover:bg-[#FFD700] hover:text-black",
        outlineWhite:
          "border-2 border-white text-white bg-transparent hover:bg-white hover:text-black",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        xl: "h-12 md:h-14 rounded-md px-6 text-base md:text-lg",
        "2xl": "h-14 md:h-16 rounded-md px-8 text-lg md:text-xl font-black",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(forceBlackTextOnWhiteBg(buttonVariants({ variant, size, className })))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
