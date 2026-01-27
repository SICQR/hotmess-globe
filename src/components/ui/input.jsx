import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * @typedef {import('react').ComponentPropsWithoutRef<'input'>} InputProps
 */

/**
 * LED BRUTALIST Input Component
 * - No border-radius (brutal edges)
 * - Mono font with uppercase placeholder
 * - LED glow on focus
 * - 2px borders
 * - Accessible error states with aria-invalid and aria-describedby
 */
const InputImpl = ({ className, type, error, errorId, ...props }, ref) => (
  <input
    type={type}
    aria-invalid={error ? 'true' : undefined}
    aria-describedby={errorId}
    className={cn(
      // LED BRUTALIST base styles
      "flex h-12 w-full border-2 border-white/30 bg-transparent px-4 py-3",
      // Typography: mono font, uppercase
      "font-mono text-sm text-white uppercase tracking-wider",
      // Placeholder styling
      "placeholder:text-white/30 placeholder:uppercase placeholder:tracking-[0.1em]",
      // Focus: LED hot pink glow
      "focus-visible:outline-none focus-visible:border-[#E62020] focus-visible:shadow-[0_0_20px_rgba(255,20,147,0.8),0_0_40px_rgba(255,20,147,0.4)]",
      // Hover state
      "hover:border-white/50",
      // Transition
      "transition-all duration-150",
      // File input styling
      "file:border-0 file:bg-transparent file:text-sm file:font-bold file:text-white file:uppercase file:tracking-wider",
      // Disabled state
      "disabled:cursor-not-allowed disabled:opacity-50 disabled:border-white/10",
      // Error state
      error && "border-red-500 focus-visible:border-red-500 focus-visible:shadow-[0_0_20px_rgba(239,68,68,0.8),0_0_40px_rgba(239,68,68,0.4)]",
      className
    )}
    ref={ref}
    {...props}
  />
);

const Input = React.forwardRef(InputImpl)
Input.displayName = "Input"

export { Input }
