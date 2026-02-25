import React, { Suspense as ReactSuspense } from 'react';
import { motion } from 'framer-motion';

// Loading fallback for lazy-loaded components
export function LoadingFallback({ text = 'Loading...' }) {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <div className="w-16 h-16 border-4 border-[#C8962C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/60 text-sm uppercase tracking-wider">{text}</p>
      </motion.div>
    </div>
  );
}

// Wrapper for lazy-loaded pages
export default function Suspense({ children, fallback }) {
  return (
    <ReactSuspense fallback={fallback || <LoadingFallback />}>
      {children}
    </ReactSuspense>
  );
}