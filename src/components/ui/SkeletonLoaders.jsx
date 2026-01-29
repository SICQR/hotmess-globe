import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';

// Profile Card Skeleton
export function ProfileCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-black border-2 border-white/10 p-4"
    >
      <div className="flex items-center gap-4 mb-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-20 w-full mb-3" />
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 flex-1" />
      </div>
    </motion.div>
  );
}

// Event Card Skeleton
export function EventCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-black border-2 border-white/10 overflow-hidden"
    >
      <Skeleton className="w-full h-48" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </motion.div>
  );
}

// Product Card Skeleton
export function ProductCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-black border-2 border-white/10 overflow-hidden"
    >
      <Skeleton className="w-full aspect-square" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-6 w-1/3 mt-2" />
        <Skeleton className="h-10 w-full mt-3" />
      </div>
    </motion.div>
  );
}

// List Item Skeleton
export function ListItemSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 p-4 border-b border-white/10"
    >
      <Skeleton className="w-12 h-12 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="w-8 h-8" />
    </motion.div>
  );
}

// Stats Grid Skeleton
export function StatsGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-black border-2 border-white/10 p-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-6 h-6" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Achievement Card Skeleton
export function AchievementCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-black border-2 border-white/10 p-4"
    >
      <div className="flex items-start gap-4">
        <Skeleton className="w-12 h-12 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2 w-full mt-3" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Feed Item Skeleton
export function FeedItemSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-black border-2 border-white/10 p-4 space-y-3"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-16 w-full" />
      <div className="flex gap-4">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </motion.div>
  );
}

// Grid Skeleton - Generic grid loader
export function GridSkeleton({ 
  count = 6, 
  columns = { base: 1, sm: 2, md: 3 },
  renderItem = () => <Skeleton className="h-64 w-full" />
}) {
  const gridClass = `grid gap-4 ${
    columns.base === 1 ? 'grid-cols-1' : `grid-cols-${columns.base}`
  } ${
    columns.sm ? `sm:grid-cols-${columns.sm}` : ''
  } ${
    columns.md ? `md:grid-cols-${columns.md}` : ''
  }`;

  return (
    <div className={gridClass}>
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          {renderItem(i)}
        </motion.div>
      ))}
    </div>
  );
}

// Page Header Skeleton
export function PageHeaderSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 mb-8"
    >
      <Skeleton className="h-10 w-1/2 md:w-1/3" />
      <Skeleton className="h-4 w-3/4 md:w-1/2" />
    </motion.div>
  );
}
