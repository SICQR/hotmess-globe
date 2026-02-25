import React from 'react';
import { motion } from 'framer-motion';

/**
 * Spinner - Simple animated spinner
 */
export function Spinner({ size = 40, color = '#C8962C', className = '' }) {
  return (
    <motion.div
      className={`inline-block ${className}`}
      style={{ width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear'
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 50 50"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
        />
      </svg>
    </motion.div>
  );
}

/**
 * PulseLoader - Three dots that pulse in sequence
 */
export function PulseLoader({ color = '#C8962C', size = 12, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          style={{
            width: size,
            height: size,
            backgroundColor: color,
            borderRadius: '50%'
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: index * 0.2,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );
}

/**
 * BarLoader - Animated horizontal bars
 */
export function BarLoader({ color = '#C8962C', className = '' }) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[0, 1, 2, 3, 4].map((index) => (
        <motion.div
          key={index}
          className="w-1 rounded-full"
          style={{ backgroundColor: color }}
          animate={{
            height: [10, 30, 10]
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: index * 0.1,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );
}

/**
 * RingLoader - Circular loading ring
 */
export function RingLoader({ size = 40, color = '#C8962C', thickness = 4, className = '' }) {
  return (
    <motion.div
      className={`inline-block ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 50 50"
        xmlns="http://www.w3.org/2000/svg"
      >
        <motion.circle
          cx="25"
          cy="25"
          r={20}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
          initial={{ rotate: 0 }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear'
          }}
          style={{ transformOrigin: 'center' }}
        />
      </svg>
    </motion.div>
  );
}

/**
 * XPLoader - Themed loader for XP-related actions
 */
export function XPLoader({ className = '' }) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <motion.div
        animate={{
          rotate: [0, 360],
          scale: [1, 1.2, 1]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        className="text-[#FFEB3B]"
      >
        ⚡
      </motion.div>
      <PulseLoader color="#FFEB3B" />
    </div>
  );
}

/**
 * FullPageLoader - Full-screen loading overlay
 */
export function FullPageLoader({ message = 'Loading...', show = true }) {
  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-xl"
    >
      <div className="text-center">
        <Spinner size={60} color="#C8962C" />
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-4 text-white/60 text-sm uppercase tracking-wider"
        >
          {message}
        </motion.p>
      </div>
    </motion.div>
  );
}

/**
 * InlineLoader - Compact inline loader
 */
export function InlineLoader({ text = 'Loading', color = '#C8962C' }) {
  return (
    <div className="inline-flex items-center gap-2">
      <Spinner size={16} color={color} />
      <span className="text-sm text-white/60">{text}</span>
    </div>
  );
}

export default Spinner;
