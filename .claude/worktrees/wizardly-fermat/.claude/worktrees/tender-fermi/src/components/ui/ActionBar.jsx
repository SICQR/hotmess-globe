import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * ActionBar - Fixed bottom action bar for mobile-friendly CTAs
 * 
 * @param {boolean} show - Whether to show the bar
 * @param {React.ReactNode} children - Action buttons/content
 * @param {string} variant - Visual variant (default, elevated, minimal)
 */
export function ActionBar({
  show = true,
  children,
  variant = "default",
  className,
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe",
            variant === "default" && "bg-black/95 backdrop-blur-xl border-t border-white/10",
            variant === "elevated" && "bg-gradient-to-t from-black via-black/95 to-transparent pt-12 border-0",
            variant === "minimal" && "bg-transparent p-4",
            className
          )}
        >
          <div className="max-w-lg mx-auto flex items-center gap-3">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * ActionBarSpacer - Add spacing at bottom of page content when ActionBar is visible
 */
export function ActionBarSpacer({ className }) {
  return <div className={cn("h-24", className)} />;
}

export default ActionBar;
