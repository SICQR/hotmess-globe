/**
 * Animation configurations for Framer Motion
 * Smart spring physics and transition presets
 * LED Brutalist motion system - snappy, sharp, accessible
 */

// Check if user prefers reduced motion (accessibility)
export const motionEnabled = typeof window !== 'undefined' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Spring configurations for natural motion
export const springConfig = {
  // Gentle - for subtle UI feedback
  gentle: { type: "spring" as const, stiffness: 120, damping: 14 },
  // Bouncy - for playful interactions
  bouncy: { type: "spring" as const, stiffness: 300, damping: 10 },
  // Snappy - for quick, responsive actions
  snappy: { type: "spring" as const, stiffness: 500, damping: 30 },
  // Slow - for dramatic reveals
  slow: { type: "spring" as const, stiffness: 50, damping: 20 },
  // Magnetic - for magnetic button effect
  magnetic: { type: "spring" as const, stiffness: 150, damping: 15 },
};

// Card hover animations
export const cardHover = {
  rest: { 
    scale: 1, 
    y: 0,
    transition: springConfig.gentle 
  },
  hover: { 
    scale: 1.02, 
    y: -4,
    transition: springConfig.gentle 
  },
};

// Card tap animation
export const cardTap = {
  rest: { scale: 1 },
  tap: { scale: 0.98 },
};

// Button animations
export const buttonHover = {
  rest: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.97 },
};

// Fade in from bottom
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { duration: 0.2 }
  },
};

// Scale in animation
export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: springConfig.gentle
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.15 }
  },
};

// Stagger children animations
export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  },
};

// Glow pulse animation variants
export const glowPulse = {
  rest: {
    boxShadow: '0 0 20px rgba(255, 20, 147, 0.3)',
  },
  pulse: {
    boxShadow: [
      '0 0 20px rgba(255, 20, 147, 0.3)',
      '0 0 40px rgba(255, 20, 147, 0.6)',
      '0 0 20px rgba(255, 20, 147, 0.3)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Badge pop animation
export const badgePop = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: springConfig.bouncy
  },
};

// Slide in from side
export const slideInFromRight = {
  initial: { x: 100, opacity: 0 },
  animate: { 
    x: 0, 
    opacity: 1,
    transition: springConfig.gentle
  },
  exit: { 
    x: 100, 
    opacity: 0,
    transition: { duration: 0.2 }
  },
};

export const slideInFromLeft = {
  initial: { x: -100, opacity: 0 },
  animate: { 
    x: 0, 
    opacity: 1,
    transition: springConfig.gentle
  },
  exit: { 
    x: -100, 
    opacity: 0,
    transition: { duration: 0.2 }
  },
};

// Shimmer effect for loading states
export const shimmer = {
  initial: { backgroundPosition: '-200% 0' },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// Number counter animation helper
export const counterAnimation = (value: number) => ({
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.5 },
  },
});

// Viewport animation trigger options
export const viewportOptions = {
  once: true,
  margin: '-50px',
  amount: 0.3,
};

// Gradient border animation
export const gradientBorder = {
  initial: { backgroundPosition: '0% 50%' },
  animate: {
    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

// Travel mode selector transition
export const travelModeTransition = {
  initial: { opacity: 0, height: 0 },
  animate: { 
    opacity: 1, 
    height: 'auto',
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  exit: { 
    opacity: 0, 
    height: 0,
    transition: { duration: 0.2, ease: 'easeIn' }
  },
};

// Utility: Create stagger delay for list items
export const createStaggerDelay = (index: number, baseDelay = 0.05) => ({
  transition: { delay: index * baseDelay },
});

// Character animation for kinetic headline (LED Brutalist - snappy)
export const charVariant = (i: number) => ({
  hidden: { 
    y: 60, 
    opacity: 0,
    scale: 0.8,
  },
  show: { 
    y: 0, 
    opacity: 1,
    scale: 1,
    transition: {
      delay: 0.08 + i * 0.035, // Faster cascade than Design Brief
      type: "spring" as const,
      stiffness: 500, // Snappier
      damping: 30,
    }
  }
});

// Utility to conditionally return motion props (accessibility)
export function getMotionProps<T extends Record<string, any>>(props: T): T | {} {
  return motionEnabled ? props : {};
}

// Reduced motion fallback utility
export function withReducedMotion<T>(
  normalVariants: T,
  reducedVariants: Partial<T>
): T {
  return motionEnabled ? normalVariants : { ...normalVariants, ...reducedVariants };
}
