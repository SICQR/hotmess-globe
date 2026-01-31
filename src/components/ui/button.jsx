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
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        hot:
          "bg-[#FF1493] text-black shadow hover:bg-white",
        hotGradient:
          "bg-gradient-to-r from-[#FF1493] via-[#FF69B4] to-[#FF1493] text-white shadow-lg hover:brightness-110 border-0",
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
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        xl: "h-12 md:h-14 rounded-md px-6 text-base md:text-lg",
        icon: "h-9 w-9",
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
