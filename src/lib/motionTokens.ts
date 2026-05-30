/**
 * motionTokens — Shared Framer Motion animation primitives for HOTMESS OS
 *
 * Usage:
 *   import { motionTokens, getMotion, useReducedMotion } from '@/lib/motionTokens';
 *   const reduced = useReducedMotion();
 *   <motion.div {...getMotion('fadeUpSm', reduced)} />
 */

export const motionTokens = {
  fadeUpSm: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
  fadeUpMd: {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
  staggerFast: {
    transition: { staggerChildren: 0.06 },
  },
  staggerMd: {
    transition: { staggerChildren: 0.1 },
  },
  panelEnter: {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 40 },
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
  },
  sheetEnter: {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
    transition: { type: 'spring' as const, damping: 28, stiffness: 300 },
  },
  pulseBreath: {
    animate: { opacity: [0.7, 1, 0.7] as number[] },
    transition: { duration: 4.5, repeat: Infinity, ease: 'linear' as const },
  },
  statusDotPulse: {
    animate: { scale: [1, 1.3, 1] as number[], opacity: [0.6, 1, 0.6] as number[] },
    transition: { duration: 2.5, repeat: Infinity },
  },
  cardFloat: {
    animate: { y: [0, -2, 0] as number[] },
    transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' as const },
  },
  nodeBurst: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: [0.8, 1.2, 1] as number[], opacity: [0, 1, 0.8] as number[] },
    transition: { duration: 0.6 },
  },
};

/** Checks prefers-reduced-motion media query (SSR-safe) */
export function useReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Returns motion props that collapse to instant opacity:1 when reduced motion is preferred */
export function getMotion(token: keyof typeof motionTokens, reduced: boolean) {
  if (reduced) {
    return {
      initial: { opacity: 1 },
      animate: { opacity: 1 },
      transition: { duration: 0 },
    };
  }
  return motionTokens[token];
}
