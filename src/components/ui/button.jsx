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
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        // Solid brand colors
        hot:
          "bg-[#FF1493] text-black shadow hover:bg-white hover:shadow-lg",
        cyan:
          "bg-[#00D9FF] text-black shadow hover:bg-white hover:shadow-lg",
        purple:
          "bg-[#B026FF] text-white shadow hover:bg-white hover:text-black hover:shadow-lg",
        gold:
          "bg-[#FFD700] text-black shadow hover:bg-white hover:shadow-lg",
        green:
          "bg-[#39FF14] text-black shadow hover:bg-white hover:shadow-lg",
        // Gradient variants
        hotGradient:
          "bg-gradient-to-r from-[#FF1493] via-[#FF69B4] to-[#FF1493] text-white shadow-lg hover:brightness-110 hover:shadow-glow-hot border-0",
        cyanGradient:
          "bg-gradient-to-r from-[#00D9FF] to-[#0891B2] text-white shadow-lg hover:brightness-110 hover:shadow-glow-cyan border-0",
        purpleGradient:
          "bg-gradient-to-r from-[#B026FF] to-[#FF1493] text-white shadow-lg hover:brightness-110 hover:shadow-glow-purple border-0",
        goldGradient:
          "bg-gradient-to-r from-[#FFD700] to-[#FF6B35] text-black shadow-lg hover:brightness-110 hover:shadow-glow-gold border-0",
        premium:
          "bg-gradient-to-r from-[#FFD700] via-[#FF6B35] to-[#FFD700] text-black shadow-lg hover:brightness-110 hover:shadow-glow-gold border-0 font-black",
        fire:
          "bg-gradient-to-r from-[#FF1493] via-[#FF6B35] to-[#FFD700] text-white shadow-lg hover:brightness-110 border-0",
        // Glow variants
        hotGlow:
          "bg-[#FF1493] text-white shadow-glow-hot hover:shadow-glow-hot-lg hover:brightness-110",
        cyanGlow:
          "bg-[#00D9FF] text-black shadow-glow-cyan hover:shadow-glow-cyan-lg hover:brightness-110",
        purpleGlow:
          "bg-[#B026FF] text-white shadow-glow-purple hover:shadow-glow-purple-lg hover:brightness-110",
        // Glass variants
        glass:
          "bg-white/5 backdrop-blur-sm text-white border border-white/10 hover:bg-white/10 hover:border-white/20",
        glassHot:
          "bg-[#FF1493]/10 backdrop-blur-sm text-[#FF1493] border border-[#FF1493]/30 hover:bg-[#FF1493]/20 hover:border-[#FF1493]/50",
        glassCyan:
          "bg-[#00D9FF]/10 backdrop-blur-sm text-[#00D9FF] border border-[#00D9FF]/30 hover:bg-[#00D9FF]/20 hover:border-[#00D9FF]/50",
        glassPurple:
          "bg-[#B026FF]/10 backdrop-blur-sm text-[#B026FF] border border-[#B026FF]/30 hover:bg-[#B026FF]/20 hover:border-[#B026FF]/50",
        // Outline variants
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        outlineHot:
          "border-2 border-[#FF1493] text-[#FF1493] bg-transparent hover:bg-[#FF1493] hover:text-white",
        outlineCyan:
          "border-2 border-[#00D9FF] text-[#00D9FF] bg-transparent hover:bg-[#00D9FF] hover:text-black",
        outlinePurple:
          "border-2 border-[#B026FF] text-[#B026FF] bg-transparent hover:bg-[#B026FF] hover:text-white",
        outlineWhite:
          "border-2 border-white text-white bg-transparent hover:bg-white hover:text-black",
        outlineGold:
          "border-2 border-[#FFD700] text-[#FFD700] bg-transparent hover:bg-[#FFD700] hover:text-black",
        // Standard variants
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: 
          "hover:bg-accent hover:text-accent-foreground",
        ghostHot:
          "hover:bg-[#FF1493]/10 hover:text-[#FF1493]",
        ghostCyan:
          "hover:bg-[#00D9FF]/10 hover:text-[#00D9FF]",
        link: 
          "text-primary underline-offset-4 hover:underline",
        linkHot:
          "text-[#FF1493] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        xl: "h-12 md:h-14 rounded-md px-6 text-base md:text-lg",
        "2xl": "h-14 md:h-16 rounded-md px-8 text-lg md:text-xl",
        icon: "h-9 w-9",
        iconSm: "h-8 w-8",
        iconLg: "h-10 w-10",
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
