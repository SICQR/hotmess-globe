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
  // Base: LUX BRUTALIST - no rounded corners, uppercase, harsh transitions
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold uppercase tracking-[0.1em] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E62020] focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] select-none touch-manipulation",
  {
    variants: {
      variant: {
        // ============================================
        // LUX BRUTALIST CHROME LUXURY VARIANTS
        // ============================================
        // Default - Red outline (Primary style)
        default:
          "bg-transparent border-2 border-[#E62020] text-[#E62020] hover:bg-[#E62020] hover:text-white",
        // LUX Primary - Red outline, fills on hover
        luxPrimary:
          "bg-transparent border-2 border-[#E62020] text-[#E62020] hover:bg-[#E62020] hover:text-white",
        // LUX Secondary - Gold filled, outlines on hover
        luxSecondary:
          "bg-[#E5A820] border-2 border-[#E5A820] text-black font-bold hover:bg-transparent hover:text-[#E5A820]",
        // LUX Tertiary - Ghost style
        luxTertiary:
          "bg-[#0D0D0D] border-2 border-white/30 text-white/90 hover:border-white hover:bg-white/5",
        // LUX Solid Red - Filled red
        luxSolid:
          "bg-[#E62020] border-2 border-[#E62020] text-white font-bold hover:bg-[#c41b1b]",
        // ============================================
        // LED VARIANTS (legacy - now uses Chrome Red)
        // ============================================
        ledPrimary:
          "bg-transparent border-2 border-[#E62020] text-white shadow-[0_0_20px_rgba(230,32,32,0.6)] hover:shadow-[0_0_30px_rgba(230,32,32,0.8)] hover:bg-[#E62020]/10",
        ledSecondary:
          "bg-transparent border-2 border-white text-white hover:bg-white hover:text-black",
        ledLive:
          "bg-transparent border-2 border-[#39FF14] text-white shadow-[0_0_20px_rgba(57,255,20,0.8),0_0_40px_rgba(57,255,20,0.4)] hover:shadow-[0_0_30px_rgba(57,255,20,1),0_0_60px_rgba(57,255,20,0.6)] hover:bg-[#39FF14]/10",
        ledSolidHot:
          "bg-[#E62020] border-2 border-[#E62020] text-white font-black shadow-[0_0_20px_rgba(230,32,32,0.6)] hover:shadow-[0_0_40px_rgba(230,32,32,0.8)]",
        ledSolidWhite:
          "bg-white border-2 border-white text-black font-black hover:bg-white/90",
        // ============================================
        // LEGACY VARIANTS (for backwards compatibility)
        // ============================================
        hot:
          "bg-[#E62020] text-black shadow hover:bg-white border-2 border-[#E62020]",
        cyan:
          "bg-[#00D9FF] text-black shadow hover:bg-white border-2 border-[#00D9FF]",
        glass:
          "bg-white/5 text-white border-2 border-white/20 hover:bg-white/10 hover:border-white/40",
        // Premium gradient variants for luxury CTAs
        premium:
          "bg-gradient-to-r from-[#FFD700] to-[#FF6B35] text-black font-bold shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 hover:brightness-110 border-2 border-transparent",
        hotGradient:
          "bg-gradient-to-r from-[#E62020] to-[#B026FF] text-white font-bold shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:brightness-110 border-2 border-transparent",
        cyanGradient:
          "bg-gradient-to-r from-[#00D9FF] to-[#3B82F6] text-white font-bold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:brightness-110 border-2 border-transparent",
        // Glow variants - animated pulsing glow effect
        hotGlow:
          "bg-[#E62020] text-white font-semibold shadow-[0_0_20px_rgba(255,20,147,0.5)] hover:shadow-[0_0_30px_rgba(255,20,147,0.7)] animate-glow-pulse border-2 border-[#E62020]",
        cyanGlow:
          "bg-[#00D9FF] text-black font-semibold shadow-[0_0_20px_rgba(0,217,255,0.5)] hover:shadow-[0_0_30px_rgba(0,217,255,0.7)] border-2 border-[#00D9FF]",
        goldGlow:
          "bg-[#FFD700] text-black font-semibold shadow-[0_0_20px_rgba(255,215,0,0.5)] hover:shadow-[0_0_30px_rgba(255,215,0,0.7)] border-2 border-[#FFD700]",
        // Ghost gradient - subtle glass with gradient border
        ghostGradient:
          "bg-gradient-to-r from-white/5 to-white/10 text-white border-2 border-white/10 hover:from-white/10 hover:to-white/15 hover:border-white/20",
        // Outline variants with brand colors
        outlineHot:
          "border-2 border-[#E62020] text-[#E62020] bg-transparent hover:bg-[#E62020] hover:text-black",
        outlineCyan:
          "border-2 border-[#00D9FF] text-[#00D9FF] bg-transparent hover:bg-[#00D9FF] hover:text-black",
        destructive:
          "bg-red-600 text-white border-2 border-red-600 shadow-sm hover:bg-red-700",
        outline:
          "border-2 border-white/20 bg-transparent shadow-sm hover:bg-white/5 hover:border-white/40 text-white",
        secondary:
          "bg-white/10 text-white border-2 border-white/20 shadow-sm hover:bg-white/20",
        ghost: "hover:bg-white/10 text-white border-2 border-transparent hover:border-white/20",
        link: "text-[#E62020] underline-offset-4 hover:underline border-none",
      },
      size: {
        // LED BRUTALIST: Generous padding, 44px minimum for touch
        default: "h-12 px-6 py-3 md:h-11",
        sm: "h-10 px-4 text-xs md:h-9",
        lg: "h-14 px-8 md:h-12",
        xl: "h-16 px-10 text-base md:h-14 md:text-lg",
        // Icon buttons - 44px minimum for touch
        icon: "h-12 w-12 md:h-10 md:w-10",
        // Compact size for dense UIs (use sparingly)
        xs: "h-8 px-3 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, type = "button", ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      type={!asChild ? type : undefined}
      className={cn(forceBlackTextOnWhiteBg(buttonVariants({ variant, size, className })))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
