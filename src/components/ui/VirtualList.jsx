import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

/**
 * Virtual List Component
 * Efficiently renders large lists by only rendering visible items
 * 
 * Usage:
 * <VirtualList
 *   items={items}
 *   itemHeight={80}
 *   renderItem={(item, index) => <ItemComponent item={item} />}
 * />
 */
export function VirtualList({
  items,
  itemHeight,
  renderItem,
  overscan = 3, // Number of items to render above/below viewport
  className = '',
  loadMore,
  hasMore = false,
  isLoading = false,
  estimatedItemHeight = 80, // For variable height items
  getItemHeight, // Function to get specific item height
  emptyComponent,
  loadingComponent,
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  
  // Calculate total height and visible range
  const { totalHeight, visibleItems, startIndex, endIndex } = useMemo(() => {
    if (items.length === 0) {
      return { totalHeight: 0, visibleItems: [], startIndex: 0, endIndex: 0 };
    }
    
    // Calculate heights
    let totalHeight = 0;
    const itemHeights = [];
    const itemOffsets = [];
    
    for (let i = 0; i < items.length; i++) {
      itemOffsets.push(totalHeight);
      const height = getItemHeight 
        ? getItemHeight(items[i], i) 
        : itemHeight || estimatedItemHeight;
      itemHeights.push(height);
      totalHeight += height;
    }
    
    // Find visible range using binary search
    let startIndex = 0;
    let endIndex = items.length - 1;
    
    // Find start index
    for (let i = 0; i < items.length; i++) {
      if (itemOffsets[i] + itemHeights[i] > scrollTop) {
        startIndex = Math.max(0, i - overscan);
        break;
      }
    }
    
    // Find end index
    const viewportBottom = scrollTop + containerHeight;
    for (let i = startIndex; i < items.length; i++) {
      if (itemOffsets[i] >= viewportBottom) {
        endIndex = Math.min(items.length - 1, i + overscan);
        break;
      }
    }
    
    // Get visible items with their offsets
    const visibleItems = [];
    for (let i = startIndex; i <= endIndex; i++) {
      visibleItems.push({
        item: items[i],
        index: i,
        offset: itemOffsets[i],
        height: itemHeights[i],
      });
    }
    
    return { totalHeight, visibleItems, startIndex, endIndex };
  }, [items, scrollTop, containerHeight, itemHeight, estimatedItemHeight, overscan, getItemHeight]);
  
  // Handle scroll
  const handleScroll = useCallback((e) => {
    const newScrollTop = e.target.scrollTop;
    setScrollTop(newScrollTop);
    
    // Infinite scroll: Load more when near bottom
    if (loadMore && hasMore && !isLoading) {
      const scrollHeight = e.target.scrollHeight;
      const clientHeight = e.target.clientHeight;
      const threshold = clientHeight * 2; // Load when 2x viewport from bottom
      
      if (scrollHeight - newScrollTop - clientHeight < threshold) {
        loadMore();
      }
    }
  }, [loadMore, hasMore, isLoading]);
  
  // Measure container
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    
    observer.observe(containerRef.current);
    setContainerHeight(containerRef.current.clientHeight);
    
    return () => observer.disconnect();
  }, []);
  
  // Empty state
  if (items.length === 0 && !isLoading) {
    if (emptyComponent) return emptyComponent;
    return (
      <div className="flex items-center justify-center py-12 text-white/40">
        No items to display
      </div>
    );
  }
  
  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      onScroll={handleScroll}
    >
      <div 
        style={{ 
          height: totalHeight,
          position: 'relative',
        }}
      >
        {visibleItems.map(({ item, index, offset, height }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: offset,
              left: 0,
              right: 0,
              height,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          {loadingComponent || (
            <Loader2 className="w-6 h-6 text-[#E62020] animate-spin" />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Simple Virtual List
 * For when all items have the same height
 */
export function SimpleVirtualList({
  items,
  itemHeight,
  renderItem,
  overscan = 3,
  className = '',
  loadMore,
  hasMore = false,
  isLoading = false,
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  
  const totalHeight = items.length * itemHeight;
  
  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;
  
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
    
    if (loadMore && hasMore && !isLoading) {
      const { scrollHeight, clientHeight, scrollTop } = e.target;
      if (scrollHeight - scrollTop - clientHeight < clientHeight) {
        loadMore();
      }
    }
  }, [loadMore, hasMore, isLoading]);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      setContainerHeight(entries[0].contentRect.height);
    });
    
    observer.observe(containerRef.current);
    setContainerHeight(containerRef.current.clientHeight);
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => (
            <div key={startIndex + i} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + i)}
            </div>
          ))}
        </div>
      </div>
      
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 text-[#E62020] animate-spin" />
        </div>
      )}
    </div>
  );
}

/**
 * Virtual Grid Component
 * For grid layouts with many items
 */
export function VirtualGrid({
  items,
  columns = 3,
  itemHeight,
  gap = 16,
  renderItem,
  overscan = 2,
  className = '',
  loadMore,
  hasMore = false,
  isLoading = false,
}) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  
  const rows = Math.ceil(items.length / columns);
  const rowHeight = itemHeight + gap;
  const totalHeight = rows * rowHeight;
  const itemWidth = (containerWidth - (columns - 1) * gap) / columns;
  
  // Calculate visible rows
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endRow = Math.min(
    rows - 1,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
  );
  
  // Get items for visible rows
  const visibleItems = [];
  for (let row = startRow; row <= endRow; row++) {
    for (let col = 0; col < columns; col++) {
      const index = row * columns + col;
      if (index < items.length) {
        visibleItems.push({
          item: items[index],
          index,
          row,
          col,
        });
      }
    }
  }
  
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
    
    if (loadMore && hasMore && !isLoading) {
      const { scrollHeight, clientHeight, scrollTop } = e.target;
      if (scrollHeight - scrollTop - clientHeight < clientHeight) {
        loadMore();
      }
    }
  }, [loadMore, hasMore, isLoading]);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      setContainerHeight(entries[0].contentRect.height);
      setContainerWidth(entries[0].contentRect.width);
    });
    
    observer.observe(containerRef.current);
    setContainerHeight(containerRef.current.clientHeight);
    setContainerWidth(containerRef.current.clientWidth);
    
    return () => observer.disconnect();
  }, []);
  
  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, row, col }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: row * rowHeight,
              left: col * (itemWidth + gap),
              width: itemWidth,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
      
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 text-[#E62020] animate-spin" />
        </div>
      )}
    </div>
  );
}

/**
 * Infinite Scroll Wrapper
 * Wraps any content with infinite scroll capability
 */
export function InfiniteScroll({
  children,
  loadMore,
  hasMore,
  isLoading,
  threshold = 200,
  className = '',
  loadingComponent,
}) {
  const containerRef = useRef(null);
  
  const handleScroll = useCallback((e) => {
    if (!hasMore || isLoading) return;
    
    const { scrollHeight, clientHeight, scrollTop } = e.target;
    if (scrollHeight - scrollTop - clientHeight < threshold) {
      loadMore();
    }
  }, [loadMore, hasMore, isLoading, threshold]);
  
  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      onScroll={handleScroll}
    >
      {children}
      
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          {loadingComponent || (
            <Loader2 className="w-6 h-6 text-[#E62020] animate-spin" />
          )}
        </div>
      )}
      
      {!hasMore && !isLoading && (
        <div className="text-center py-4 text-white/40 text-sm">
          No more items to load
        </div>
      )}
    </div>
  );
}

export default VirtualList;
