import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function LazyImage({ 
  src, 
  alt, 
  className = '', 
  placeholder = 'bg-white/5',
  containerClassName = '',
  fadeIn = true 
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
      { rootMargin: '50px' }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={`relative overflow-hidden ${containerClassName}`}>
      {!isLoaded && <div className={`absolute inset-0 animate-pulse ${placeholder}`} />}
      {isInView && (
        <motion.img
          src={src}
          alt={alt}
          className={className}
          onLoad={() => setIsLoaded(true)}
          initial={fadeIn ? { opacity: 0 } : { opacity: 1 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </div>
  );
}