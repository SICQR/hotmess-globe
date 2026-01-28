/**
 * HOTMESS Animation Configuration
 * Spring-based animations for smooth, natural motion
 */

// Spring configurations for different use cases
export const springConfig = {
  // Gentle spring - for subtle movements like hover states
  gentle: { type: "spring" as const, stiffness: 120, damping: 14 },
  
  // Bouncy spring - for playful interactions
  bouncy: { type: "spring" as const, stiffness: 300, damping: 10 },
  
  // Snappy spring - for quick, responsive interactions
  snappy: { type: "spring" as const, stiffness: 500, damping: 30 },
  
  // Slow spring - for smooth, elegant transitions
  slow: { type: "spring" as const, stiffness: 50, damping: 20 },
  
  // Magnetic spring - for magnetic button effects
  magnetic: { type: "spring" as const, stiffness: 150, damping: 15 },
  
  // Smooth spring - balanced for most use cases
  smooth: { type: "spring" as const, stiffness: 200, damping: 20 },
};

// Card hover animation variants
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

// Card tap animation variants
export const cardTap = {
  rest: { scale: 1 },
  tap: { scale: 0.98 },
};

// Button tap animation variants
export const buttonTap = {
  rest: { scale: 1 },
  tap: { scale: 0.97 },
};

// Button hover animation variants
export const buttonHover = {
  rest: { scale: 1 },
  hover: { scale: 1.02 },
};

// Fade in animation variants
export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3 } 
  },
};

// Slide up animation variants
export const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: springConfig.gentle 
  },
};

// Slide down animation variants
export const slideDown = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: springConfig.gentle 
  },
};

// Scale in animation variants
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: springConfig.gentle 
  },
};

// Stagger container variants for list animations
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

// Stagger item variants
export const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springConfig.gentle,
  },
};

// Page transition variants
export const pageTransition = {
  wipe: {
    initial: { clipPath: "inset(0 100% 0 0)" },
    animate: { clipPath: "inset(0 0 0 0)" },
    exit: { clipPath: "inset(0 0 0 100%)" },
  },
  wipeLeft: {
    initial: { clipPath: "inset(0 0 0 100%)" },
    animate: { clipPath: "inset(0 0 0 0)" },
    exit: { clipPath: "inset(0 100% 0 0)" },
  },
  drop: {
    initial: { y: "-100%", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "100%", opacity: 0 },
  },
  shutter: {
    initial: { scaleY: 0 },
    animate: { scaleY: 1 },
    exit: { scaleY: 0 },
  },
  split: {
    initial: { clipPath: "polygon(50% 0, 50% 0, 50% 100%, 50% 100%)" },
    animate: { clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" },
    exit: { clipPath: "polygon(50% 0, 50% 0, 50% 100%, 50% 100%)" },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
};

// Glow pulse animation for special elements
export const glowPulse = {
  initial: { 
    boxShadow: "0 0 15px rgba(255, 20, 147, 0.4)" 
  },
  animate: {
    boxShadow: [
      "0 0 15px rgba(255, 20, 147, 0.4)",
      "0 0 30px rgba(255, 20, 147, 0.7)",
      "0 0 15px rgba(255, 20, 147, 0.4)",
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// Float animation for floating elements
export const float = {
  initial: { y: 0 },
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// Gradient animation config
export const gradientShift = {
  animate: {
    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// Modal animation variants
export const modalOverlay = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export const modalContent = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: springConfig.gentle,
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 10,
    transition: { duration: 0.2 },
  },
};

// Tooltip animation variants
export const tooltip = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.15 },
  },
};

// Drawer/Sheet animation variants
export const drawer = {
  bottom: {
    hidden: { y: "100%" },
    visible: { y: 0 },
    exit: { y: "100%" },
  },
  left: {
    hidden: { x: "-100%" },
    visible: { x: 0 },
    exit: { x: "-100%" },
  },
  right: {
    hidden: { x: "100%" },
    visible: { x: 0 },
    exit: { x: "100%" },
  },
};

// Skeleton loading animation
export const skeleton = {
  animate: {
    backgroundPosition: ["-200% 0", "200% 0"],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "linear",
    },
  },
};

// Helper function to create custom spring
export function createSpring(stiffness: number, damping: number) {
  return { type: "spring" as const, stiffness, damping };
}

// Helper function to create staggered children config
export function createStagger(staggerTime: number = 0.05, delayTime: number = 0) {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerTime,
        delayChildren: delayTime,
      },
    },
  };
}

export default {
  springConfig,
  cardHover,
  cardTap,
  buttonTap,
  buttonHover,
  fadeIn,
  slideUp,
  slideDown,
  scaleIn,
  staggerContainer,
  staggerItem,
  pageTransition,
  glowPulse,
  float,
  gradientShift,
  modalOverlay,
  modalContent,
  tooltip,
  drawer,
  skeleton,
  createSpring,
  createStagger,
};

// ========================================
// LED Brutalist Motion Enhancements
// ========================================

// Check if user prefers reduced motion (accessibility)
export const motionEnabled = typeof window !== 'undefined' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Character animation variant for kinetic text
export const charVariant = (i: number) => ({
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      ...springConfig.snappy,
      delay: i * 0.03, // 30ms stagger
    },
  },
});

// Get motion props conditionally based on reduced-motion preference
export const getMotionProps = <T extends Record<string, any>>(props: T): T | {} =>
  motionEnabled ? props : {};

// Wrap a variant object with reduced-motion fallback
export const withReducedMotion = <T extends Record<string, any>>(variants: T): T =>
  motionEnabled ? variants : ({} as T);
