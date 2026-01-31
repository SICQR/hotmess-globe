import { motion } from 'framer-motion';

/**
 * LoadingSkeleton - Shimmer loading states
 * LED Brutalist styling: Zero radius, fast shimmer, hard edges
 */

const shimmerVariants = {
  initial: { x: '-100%' },
  animate: {
    x: '100%',
    transition: {
      repeat: Infinity,
      duration: 1.2,
      ease: 'linear',
    },
  },
};

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`relative overflow-hidden bg-white/5 ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        variants={shimmerVariants}
        initial="initial"
        animate="animate"
      />
    </div>
  );
}

/**
 * ProfileCardSkeleton - Loading state for ProfileCard
 * Matches ProfileCard dimensions (aspect-[4/5])
 */
export function ProfileCardSkeleton() {
  return (
    <div className="w-full aspect-[4/5] relative">
      <Skeleton className="w-full h-full" />
      
      {/* Top badges placeholder */}
      <div className="absolute top-3 left-3 flex gap-2">
        <Skeleton className="w-16 h-6" />
        <Skeleton className="w-20 h-6" />
      </div>

      {/* Bottom info placeholder */}
      <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
        <Skeleton className="w-3/4 h-6" />
        <Skeleton className="w-1/2 h-4" />
      </div>
    </div>
  );
}

/**
 * ProductCardSkeleton - Loading state for ProductCard
 */
export function ProductCardSkeleton() {
  return (
    <div className="w-full space-y-3">
      <Skeleton className="w-full aspect-square" />
      <Skeleton className="w-3/4 h-5" />
      <Skeleton className="w-1/2 h-4" />
      <div className="flex gap-2">
        <Skeleton className="w-20 h-8" />
        <Skeleton className="w-20 h-8" />
      </div>
    </div>
  );
}

/**
 * ImageSkeleton - Generic image loading state
 */
export function ImageSkeleton({ className = '' }: SkeletonProps) {
  return <Skeleton className={`aspect-square ${className}`} />;
}
