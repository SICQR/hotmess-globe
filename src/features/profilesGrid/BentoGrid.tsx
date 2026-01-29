import React, { useMemo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { staggerContainer, staggerItem } from '@/lib/animations';

export type BentoSize = '1x1' | '1x2' | '2x1' | '2x2';

interface BentoItem {
  id: string;
  size?: BentoSize;
  priority?: number; // Higher priority = larger size potential
  content: ReactNode;
}

interface BentoGridProps {
  items: BentoItem[];
  columns?: 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
  autoSize?: boolean; // Automatically assign sizes based on priority
}

/**
 * BentoGrid - Variable-sized grid layout for dynamic content
 * 
 * @example
 * ```tsx
 * <BentoGrid
 *   columns={4}
 *   items={[
 *     { id: '1', size: '2x2', content: <FeaturedCard /> },
 *     { id: '2', size: '1x1', content: <SmallCard /> },
 *     { id: '3', size: '1x2', content: <TallCard /> },
 *   ]}
 * />
 * ```
 */
export function BentoGrid({
  items,
  columns = 4,
  gap = 'md',
  className,
  autoSize = false,
}: BentoGridProps) {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const columnClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  };

  // Auto-assign sizes based on priority if enabled
  const processedItems = useMemo(() => {
    if (!autoSize) return items;

    return items.map((item, index) => {
      if (item.size) return item; // Keep manually assigned sizes

      const priority = item.priority ?? 50;
      let size: BentoSize = '1x1';

      // First item or very high priority = spotlight
      if (index === 0 || priority >= 90) {
        size = '2x2';
      } else if (priority >= 75) {
        size = index % 2 === 0 ? '2x1' : '1x2';
      }

      return { ...item, size };
    });
  }, [items, autoSize]);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={cn(
        'grid auto-rows-[200px] md:auto-rows-[220px] lg:auto-rows-[240px]',
        columnClasses[columns],
        gapClasses[gap],
        className
      )}
    >
      {processedItems.map((item) => (
        <BentoCell key={item.id} size={item.size}>
          {item.content}
        </BentoCell>
      ))}
    </motion.div>
  );
}

/**
 * BentoCell - Individual cell in the bento grid
 */
interface BentoCellProps {
  size?: BentoSize;
  children: ReactNode;
  className?: string;
}

export function BentoCell({ size = '1x1', children, className }: BentoCellProps) {
  const sizeClasses: Record<BentoSize, string> = {
    '1x1': 'col-span-1 row-span-1',
    '1x2': 'col-span-1 row-span-2',
    '2x1': 'col-span-1 md:col-span-2 row-span-1',
    '2x2': 'col-span-1 md:col-span-2 row-span-1 md:row-span-2',
  };

  return (
    <motion.div
      variants={staggerItem}
      className={cn(
        'relative overflow-hidden',
        sizeClasses[size],
        className
      )}
    >
      {children}
    </motion.div>
  );
}

/**
 * BentoGridSmart - Bento grid with automatic smart sizing
 */
interface BentoGridSmartProps<T> {
  items: T[];
  columns?: 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  renderItem: (item: T, size: BentoSize, index: number) => ReactNode;
  getPriority: (item: T) => number;
  getKey: (item: T) => string;
  className?: string;
}

export function BentoGridSmart<T>({
  items,
  columns = 4,
  gap = 'md',
  renderItem,
  getPriority,
  getKey,
  className,
}: BentoGridSmartProps<T>) {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const columnClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  };

  // Calculate sizes based on priority
  const itemsWithSize = useMemo(() => {
    return items.map((item, index) => {
      const priority = getPriority(item);
      let size: BentoSize = '1x1';

      // First item or very high priority = spotlight
      if (index === 0 || priority >= 90) {
        size = '2x2';
      } else if (priority >= 80) {
        // Alternate between wide and tall for featured items
        size = index % 3 === 1 ? '2x1' : '1x2';
      } else if (priority >= 70) {
        // Occasionally make 2x1 for high-ish priority
        size = index % 5 === 0 ? '2x1' : '1x1';
      }

      return { item, size, key: getKey(item) };
    });
  }, [items, getPriority, getKey]);

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className={cn(
        'grid auto-rows-[180px] md:auto-rows-[200px] lg:auto-rows-[220px]',
        columnClasses[columns],
        gapClasses[gap],
        className
      )}
    >
      {itemsWithSize.map(({ item, size, key }, index) => {
        const sizeClasses: Record<BentoSize, string> = {
          '1x1': 'col-span-1 row-span-1',
          '1x2': 'col-span-1 row-span-2',
          '2x1': 'col-span-1 md:col-span-2 row-span-1',
          '2x2': 'col-span-1 md:col-span-2 row-span-1 md:row-span-2',
        };

        return (
          <motion.div
            key={key}
            variants={staggerItem}
            className={cn('relative overflow-hidden', sizeClasses[size])}
          >
            {renderItem(item, size, index)}
          </motion.div>
        );
      })}
    </motion.div>
  );
}

/**
 * BentoGridMasonry - Masonry-style layout variation
 */
interface BentoGridMasonryProps {
  children: ReactNode[];
  columns?: 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function BentoGridMasonry({
  children,
  columns = 3,
  gap = 'md',
  className,
}: BentoGridMasonryProps) {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  // Distribute children into columns
  const columnArrays = useMemo(() => {
    const cols: ReactNode[][] = Array.from({ length: columns }, () => []);
    children.forEach((child, index) => {
      cols[index % columns].push(child);
    });
    return cols;
  }, [children, columns]);

  return (
    <div
      className={cn(
        'flex',
        gapClasses[gap],
        className
      )}
    >
      {columnArrays.map((col, colIndex) => (
        <div
          key={colIndex}
          className={cn('flex-1 flex flex-col', gapClasses[gap])}
        >
          {col.map((child, childIndex) => (
            <motion.div
              key={childIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (colIndex * col.length + childIndex) * 0.05 }}
            >
              {child}
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Helper: Calculate optimal bento layout
 */
export function calculateBentoLayout(
  itemCount: number,
  options: {
    featuredCount?: number;
    columns?: number;
  } = {}
): BentoSize[] {
  const { featuredCount = 1 } = options;
  const sizes: BentoSize[] = [];

  for (let i = 0; i < itemCount; i++) {
    if (i < featuredCount) {
      sizes.push('2x2');
    } else if (i < featuredCount + 2) {
      sizes.push(i % 2 === 0 ? '2x1' : '1x2');
    } else {
      sizes.push('1x1');
    }
  }

  return sizes;
}

export default BentoGrid;
