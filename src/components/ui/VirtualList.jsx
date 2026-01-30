import React, { useRef, useState, useEffect, useCallback } from 'react';

/**
 * Virtual List Component
 * Renders only visible items for performance with long lists
 */
export default function VirtualList({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className = '',
  onEndReached,
  endReachedThreshold = 0.8,
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor(scrollTop / itemHeight) + visibleCount + overscan
  );
  
  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e) => {
    const newScrollTop = e.target.scrollTop;
    setScrollTop(newScrollTop);
    
    // Check if we've scrolled near the end
    if (onEndReached) {
      const scrollPercentage = (newScrollTop + containerHeight) / totalHeight;
      if (scrollPercentage >= endReachedThreshold) {
        onEndReached();
      }
    }
  }, [containerHeight, totalHeight, endReachedThreshold, onEndReached]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Virtual Grid Component
 * For grid layouts with virtualization
 */
export function VirtualGrid({
  items,
  itemWidth,
  itemHeight,
  containerHeight,
  columns,
  renderItem,
  overscan = 2,
  gap = 0,
  className = '',
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  const rowHeight = itemHeight + gap;
  const rowCount = Math.ceil(items.length / columns);
  const totalHeight = rowCount * rowHeight;
  const visibleRowCount = Math.ceil(containerHeight / rowHeight);
  
  const startRowIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endRowIndex = Math.min(
    rowCount - 1,
    Math.floor(scrollTop / rowHeight) + visibleRowCount + overscan
  );
  
  const startItemIndex = startRowIndex * columns;
  const endItemIndex = Math.min(items.length - 1, (endRowIndex + 1) * columns - 1);
  
  const visibleItems = items.slice(startItemIndex, endItemIndex + 1);
  const offsetY = startRowIndex * rowHeight;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div 
          style={{ 
            transform: `translateY(${offsetY}px)`,
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, ${itemWidth}px)`,
            gap: `${gap}px`,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={startItemIndex + index}
              style={{ height: itemHeight, width: itemWidth }}
            >
              {renderItem(item, startItemIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Infinite Scroll Hook
 * For implementing infinite scroll with pagination
 */
export function useInfiniteScroll(callback, options = {}) {
  const { threshold = 100, enabled = true } = options;
  const observerRef = useRef(null);
  const loadingRef = useRef(false);

  const sentinelRef = useCallback((node) => {
    if (!enabled) return;
    
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          loadingRef.current = true;
          Promise.resolve(callback()).finally(() => {
            loadingRef.current = false;
          });
        }
      },
      { rootMargin: `${threshold}px` }
    );

    if (node) {
      observerRef.current.observe(node);
    }
  }, [callback, threshold, enabled]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return sentinelRef;
}

/**
 * Lazy Load Component Wrapper
 * Loads component only when visible
 */
export function LazyLoad({ 
  children, 
  placeholder, 
  rootMargin = '200px',
  className = '' 
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : placeholder}
    </div>
  );
}
