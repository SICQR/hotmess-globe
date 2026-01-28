import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden",
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
        glow: "bg-[#FF1493] text-black shadow-[0_0_20px_rgba(255,20,147,0.5)] hover:shadow-[0_0_30px_rgba(255,20,147,0.7)] hover:bg-white",
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
);

// Ripple effect component
const Ripple = ({ x, y, size }) => (
  <motion.span
    initial={{ scale: 0, opacity: 0.5 }}
    animate={{ scale: 4, opacity: 0 }}
    transition={{ duration: 0.6, ease: "easeOut" }}
    className="absolute rounded-full bg-white/30 pointer-events-none"
    style={{
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
    }}
  />
);

const AnimatedButton = React.forwardRef(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    enableRipple = true,
    enableHover = true,
    children,
    ...props 
  }, ref) => {
    const [ripples, setRipples] = React.useState([]);
    const buttonRef = React.useRef(null);

    const handleClick = (e) => {
      if (!enableRipple) return;
      
      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const size = Math.max(rect.width, rect.height) * 0.5;

      const id = Date.now();
      setRipples(prev => [...prev, { id, x, y, size }]);

      // Clean up ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id));
      }, 600);
    };

    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <motion.button
        ref={(node) => {
          buttonRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn(buttonVariants({ variant, size, className }))}
        onClick={(e) => {
          handleClick(e);
          props.onClick?.(e);
        }}
        whileHover={enableHover ? { 
          scale: 1.02,
          transition: { duration: 0.2 },
        } : undefined}
        whileTap={enableHover ? { 
          scale: 0.98,
          transition: { duration: 0.1 },
        } : undefined}
        {...props}
      >
        {/* Ripple effects */}
        {ripples.map(ripple => (
          <Ripple key={ripple.id} {...ripple} />
        ))}
        
        {/* Hover glow effect for certain variants */}
        {(variant === 'hot' || variant === 'cyan' || variant === 'glow') && (
          <motion.span
            className="absolute inset-0 rounded-md opacity-0"
            style={{
              background: variant === 'hot' 
                ? 'radial-gradient(circle at center, rgba(255,20,147,0.3), transparent 70%)'
                : variant === 'cyan'
                  ? 'radial-gradient(circle at center, rgba(0,217,255,0.3), transparent 70%)'
                  : 'radial-gradient(circle at center, rgba(255,20,147,0.3), transparent 70%)',
            }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}
        
        {/* Content */}
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>
      </motion.button>
    );
  }
);

AnimatedButton.displayName = "AnimatedButton";

export { AnimatedButton, buttonVariants };
