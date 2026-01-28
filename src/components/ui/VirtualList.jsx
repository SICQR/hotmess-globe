/**
 * Virtual Scrolling Component
 * Efficiently renders large lists by only rendering visible items
 * Improves performance for discovery, events, and long lists
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * VirtualList Component
 * 
 * @param {Object} props
 * @param {Array} props.items - Array of items to render
 * @param {Function} props.renderItem - Function to render each item (item, index) => ReactNode
 * @param {number} props.itemHeight - Height of each item in pixels
 * @param {number} props.height - Height of the container in pixels
 * @param {number} props.overscan - Number of items to render outside visible area (default: 3)
 * @param {string} props.className - Additional CSS classes for the container
 */
export function VirtualList({
  items = [],
  renderItem,
  itemHeight = 80,
  height = 600,
  overscan = 3,
  className = '',
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  // Calculate visible range
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + height) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);

  // Handle scroll
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  // Scroll to specific index
  const scrollToIndex = useCallback((index) => {
    if (containerRef.current) {
      containerRef.current.scrollTop = index * itemHeight;
    }
  }, [itemHeight]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-auto ${className}`}
      style={{ height: `${height}px` }}
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        {visibleItems.map((item, i) => {
          const actualIndex = startIndex + i;
          return (
            <div
              key={actualIndex}
              style={{
                position: 'absolute',
                top: `${actualIndex * itemHeight}px`,
                left: 0,
                right: 0,
                height: `${itemHeight}px`,
              }}
            >
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * VirtualGrid Component
 * Virtual scrolling for grid layouts
 * 
 * @param {Object} props
 * @param {Array} props.items - Array of items to render
 * @param {Function} props.renderItem - Function to render each item (item, index) => ReactNode
 * @param {number} props.itemHeight - Height of each row in pixels
 * @param {number} props.columns - Number of columns in the grid
 * @param {number} props.gap - Gap between items in pixels (default: 16)
 * @param {number} props.height - Height of the container in pixels
 * @param {number} props.overscan - Number of rows to render outside visible area (default: 2)
 * @param {string} props.className - Additional CSS classes for the container
 */
export function VirtualGrid({
  items = [],
  renderItem,
  itemHeight = 200,
  columns = 3,
  gap = 16,
  height = 600,
  overscan = 2,
  className = '',
}) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  // Calculate grid layout
  const rows = Math.ceil(items.length / columns);
  const rowHeight = itemHeight + gap;
  const totalHeight = rows * rowHeight;

  // Calculate visible range
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endRow = Math.min(
    rows - 1,
    Math.ceil((scrollTop + height) / rowHeight) + overscan
  );

  const startIndex = startRow * columns;
  const endIndex = Math.min(items.length - 1, (endRow + 1) * columns - 1);
  const visibleItems = items.slice(startIndex, endIndex + 1);

  // Handle scroll
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={`overflow-auto ${className}`}
      style={{ height: `${height}px` }}
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        {visibleItems.map((item, i) => {
          const actualIndex = startIndex + i;
          const row = Math.floor(actualIndex / columns);
          const col = actualIndex % columns;
          
          return (
            <div
              key={actualIndex}
              style={{
                position: 'absolute',
                top: `${row * rowHeight}px`,
                left: `calc(${(col / columns) * 100}% + ${col > 0 ? gap / 2 : 0}px)`,
                width: `calc(${100 / columns}% - ${gap}px)`,
                height: `${itemHeight}px`,
              }}
            >
              {renderItem(item, actualIndex)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * useVirtualScroll Hook
 * Custom hook for implementing virtual scrolling
 * 
 * @param {Object} options
 * @param {number} options.itemCount - Total number of items
 * @param {number} options.itemHeight - Height of each item in pixels
 * @param {number} options.containerHeight - Height of the container in pixels
 * @param {number} options.overscan - Number of items to render outside visible area
 * @returns {Object} - Virtual scroll state and helpers
 */
export function useVirtualScroll({
  itemCount = 0,
  itemHeight = 80,
  containerHeight = 600,
  overscan = 3,
} = {}) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const totalHeight = itemCount * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    itemCount - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  const scrollToIndex = useCallback((index) => {
    if (containerRef.current) {
      containerRef.current.scrollTop = index * itemHeight;
    }
  }, [itemHeight]);

  return {
    containerRef,
    scrollTop,
    startIndex,
    endIndex,
    totalHeight,
    handleScroll,
    scrollToIndex,
  };
}

export default VirtualList;
