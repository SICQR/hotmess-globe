/**
 * ScrollReveal Components
 * 
 * Intersection Observer-based scroll animations for editorial layouts.
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion, useInView, useSpring, useTransform, useScroll } from 'framer-motion';

// ============================================================================
// ScrollReveal - Fade in on scroll
// ============================================================================

export function ScrollReveal({ 
  children, 
  className = '', 
  delay = 0,
  duration = 0.6,
  direction = 'up', // 'up', 'down', 'left', 'right', 'none'
  distance = 40,
  once = true,
  threshold = 0.1,
  ...props 
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: threshold });

  const directions = {
    up: { y: distance, x: 0 },
    down: { y: -distance, x: 0 },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
    none: { x: 0, y: 0 },
  };

  const initial = { 
    opacity: 0, 
    ...directions[direction] 
  };

  const animate = isInView 
    ? { opacity: 1, x: 0, y: 0 } 
    : initial;

  return (
    <motion.div
      ref={ref}
      initial={initial}
      animate={animate}
      transition={{ 
        duration, 
        delay,
        ease: [0.25, 0.1, 0.25, 1] // Custom easing
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// ScrollParallax - Parallax effect on scroll
// ============================================================================

export function ScrollParallax({ 
  children, 
  className = '',
  speed = 0.5, // -1 to 1, negative = opposite direction
  direction = 'y', // 'x' or 'y'
  ...props 
}) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start']
  });

  const range = 100 * speed;
  const transform = useTransform(scrollYProgress, [0, 1], [-range, range]);

  const style = direction === 'y' 
    ? { y: transform } 
    : { x: transform };

  return (
    <motion.div
      ref={ref}
      style={style}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ============================================================================
// StaggerChildren - Stagger animate children on scroll
// ============================================================================

export function StaggerChildren({ 
  children, 
  className = '',
  staggerDelay = 0.1,
  duration = 0.5,
  once = true,
  threshold = 0.1,
  ...props 
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: threshold });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration, ease: [0.25, 0.1, 0.25, 1] },
    },
  };

  return (
    <motion.div
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={className}
      {...props}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

// ============================================================================
// CountUp - Animated number counter
// ============================================================================

export function CountUp({ 
  end, 
  start = 0, 
  duration = 2,
  delay = 0,
  decimals = 0,
  suffix = '',
  prefix = '',
  className = '',
  once = true,
  ...props 
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: 0.5 });
  const [displayValue, setDisplayValue] = useState(start);

  const springValue = useSpring(start, {
    damping: 30,
    stiffness: 100,
    duration: duration * 1000,
  });

  useEffect(() => {
    if (isInView) {
      const timeout = setTimeout(() => {
        springValue.set(end);
      }, delay * 1000);
      return () => clearTimeout(timeout);
    }
  }, [isInView, end, delay, springValue]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (value) => {
      setDisplayValue(value.toFixed(decimals));
    });
    return () => unsubscribe();
  }, [springValue, decimals]);

  return (
    <span ref={ref} className={className} {...props}>
      {prefix}{displayValue}{suffix}
    </span>
  );
}

// ============================================================================
// TextReveal - Character by character reveal
// ============================================================================

export function TextReveal({ 
  children, 
  className = '',
  delay = 0,
  staggerDelay = 0.03,
  once = true,
  ...props 
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: 0.5 });
  const text = typeof children === 'string' ? children : '';

  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delay,
      },
    },
  };

  const charVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      rotateX: -90,
    },
    visible: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1],
      },
    },
  };

  return (
    <motion.span
      ref={ref}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={`inline-block ${className}`}
      aria-label={text}
      {...props}
    >
      {text.split('').map((char, index) => (
        <motion.span
          key={index}
          variants={charVariants}
          className="inline-block"
          style={{ 
            whiteSpace: char === ' ' ? 'pre' : 'normal',
            transformOrigin: 'bottom center',
          }}
        >
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
}

// ============================================================================
// ScrollProgress - Progress indicator based on scroll
// ============================================================================

export function ScrollProgress({ 
  className = '',
  color = '#E62020',
  height = 3,
  position = 'top', // 'top' or 'bottom'
  ...props 
}) {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      style={{
        scaleX: scrollYProgress,
        transformOrigin: 'left',
        backgroundColor: color,
        height,
      }}
      className={`fixed left-0 right-0 z-50 ${position === 'top' ? 'top-0' : 'bottom-0'} ${className}`}
      {...props}
    />
  );
}

// ============================================================================
// FadeInWhenVisible - Simple fade in when visible
// ============================================================================

export function FadeInWhenVisible({ children, className = '', ...props }) {
  return (
    <ScrollReveal direction="none" className={className} {...props}>
      {children}
    </ScrollReveal>
  );
}

export default ScrollReveal;
