import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function LazyImage({
  src,
  alt,
  className = '',
  placeholder = 'bg-white/5',
  containerClassName = '',
  fadeIn = true,
  blurUp = false,
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${containerClassName}`}>
      {/* Blur-up: show blurred tiny version or shimmer placeholder */}
      {!isLoaded && (
        blurUp && src ? (
          <img
            src={src}
            alt=""
            aria-hidden
            className={`absolute inset-0 w-full h-full object-cover scale-110 ${className}`}
            style={{ filter: 'blur(20px)', transform: 'scale(1.1)' }}
          />
        ) : (
          <div className={`absolute inset-0 animate-pulse ${placeholder}`} />
        )
      )}
      {isInView && (
        <motion.img
          src={src}
          alt={alt}
          className={className}
          onLoad={() => setIsLoaded(true)}
          initial={fadeIn ? { opacity: 0 } : { opacity: 1 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      )}
    </div>
  );
}