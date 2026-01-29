/**
 * Lazy Page Loader
 * 
 * Provides a consistent loading experience for code-split pages
 */

import { Suspense } from 'react';
import { motion } from 'framer-motion';

// Loading spinner with HOTMESS branding
export function PageLoader() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center"
      >
        <motion.div
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="w-12 h-12 border-4 border-white/10 border-t-[#FF1493] rounded-full mx-auto mb-4"
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-white/40 text-sm uppercase tracking-wider"
        >
          Loading...
        </motion.p>
      </motion.div>
    </div>
  );
}

// Wrapper for lazy-loaded pages
export function LazyPage({ children }) {
  return (
    <Suspense fallback={<PageLoader />}>
      {children}
    </Suspense>
  );
}

// HOC for lazy loading
export function withLazyLoading(Component) {
  return function LazyLoadedPage(props) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

export default PageLoader;
