import React, { useState, useEffect } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';

/**
 * ScrollProgress - Displays a progress bar indicating scroll position
 * 
 * Shows a thin line at the top of the viewport that fills as the user
 * scrolls down the page.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (latest) => {
      // Only show when user has scrolled past initial viewport
      setIsVisible(latest > 0.01);
    });

    return () => unsubscribe();
  }, [scrollYProgress]);

  if (!isVisible) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF1493] via-[#B026FF] to-[#00D9FF] origin-left z-[100]"
      style={{ scaleX }}
    />
  );
}

export default ScrollProgress;
