import React from 'react';
import { cn } from "@/lib/utils";

// Base skeleton with shimmer effect
export function Skeleton({ className, variant = 'default', ...props }) {
  const variants = {
    default: 'bg-white/10',
    light: 'bg-white/5',
    dark: 'bg-white/20',
    accent: 'bg-[#FF1493]/10',
  };

  return (
    <div
      className={cn(
        "animate-pulse rounded-md relative overflow-hidden",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

// Avatar skeleton with ring
export function AvatarSkeleton({ size = 'md', className }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  return (
    <div className={cn("relative", className)}>
      <Skeleton className={cn("rounded-full", sizes[size])} />
      <div className={cn(
        "absolute inset-0 rounded-full border-2 border-white/10 animate-pulse"
      )} />
    </div>
  );
}

// Text line skeleton
export function TextSkeleton({ lines = 1, className, widths = [] }) {
  const defaultWidths = ['100%', '80%', '60%', '90%', '70%'];
  
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4 rounded"
          style={{ width: widths[i] || defaultWidths[i % defaultWidths.length] }}
        />
      ))}
    </div>
  );
}

// Card skeleton with header and content
export function CardSkeleton({ className, showAvatar = true, showActions = false }) {
  return (
    <div className={cn(
      "bg-white/5 border border-white/10 rounded-xl p-6 animate-pulse",
      className
    )}>
      <div className="flex items-start gap-4">
        {showAvatar && <AvatarSkeleton />}
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-3/4 rounded" />
          <Skeleton className="h-4 w-1/2 rounded" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-5/6 rounded" />
      </div>
      {showActions && (
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      )}
    </div>
  );
}

// Profile card skeleton
export function ProfileCardSkeleton({ className }) {
  return (
    <div className={cn(
      "bg-white/5 border-2 border-white/10 p-4 space-y-4",
      className
    )}>
      {/* Image */}
      <Skeleton className="aspect-square w-full rounded-none" />
      
      {/* Info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-5 w-16 rounded" />
        </div>
        <Skeleton className="h-4 w-24 rounded" />
      </div>
      
      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
    </div>
  );
}

// Event card skeleton
export function EventCardSkeleton({ className }) {
  return (
    <div className={cn(
      "bg-white/5 border border-white/10 rounded-xl overflow-hidden",
      className
    )}>
      {/* Image */}
      <Skeleton className="aspect-video w-full rounded-none" />
      
      {/* Content */}
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4 rounded" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-48 rounded" />
        </div>
        <div className="flex gap-2 mt-4">
          <Skeleton className="h-8 flex-1 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  );
}

// Stats grid skeleton
export function StatsGridSkeleton({ count = 6, className }) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-black border-2 border-white/10 p-4 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-6 h-6 rounded" />
            <div>
              <Skeleton className="h-8 w-16 rounded mb-1" />
              <Skeleton className="h-3 w-12 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// List skeleton
export function ListSkeleton({ count = 3, className }) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// Grid skeleton
export function GridSkeleton({ count = 6, columns = 3, className }) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns] || gridCols[3], className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

// Profile page skeleton
export function ProfileSkeleton({ className }) {
  return (
    <div className={cn("animate-pulse space-y-6", className)}>
      {/* Header */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-8">
        <div className="flex items-center gap-6">
          <AvatarSkeleton size="xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-48 rounded" />
            <Skeleton className="h-4 w-64 rounded" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-4 w-20 rounded" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <StatsGridSkeleton count={6} />
      
      {/* Content */}
      <GridSkeleton count={6} />
    </div>
  );
}

// Chat/message skeleton
export function MessageSkeleton({ isOwn = false, className }) {
  return (
    <div className={cn(
      "flex gap-3",
      isOwn ? "flex-row-reverse" : "flex-row",
      className
    )}>
      {!isOwn && <AvatarSkeleton size="sm" />}
      <div className={cn(
        "max-w-[70%] space-y-1",
        isOwn ? "items-end" : "items-start"
      )}>
        <Skeleton 
          className={cn(
            "h-12 rounded-2xl",
            isOwn ? "rounded-br-sm w-48" : "rounded-bl-sm w-64"
          )} 
        />
        <Skeleton className="h-3 w-16 rounded" />
      </div>
    </div>
  );
}

// Chat list skeleton
export function ChatListSkeleton({ count = 5, className }) {
  return (
    <div className={cn("space-y-4 p-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <MessageSkeleton key={i} isOwn={i % 3 === 0} />
      ))}
    </div>
  );
}

// Table skeleton
export function TableSkeleton({ rows = 5, cols = 4, className }) {
  return (
    <div className={cn("border border-white/10 rounded-lg overflow-hidden", className)}>
      {/* Header */}
      <div className="bg-white/5 p-4 border-b border-white/10">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 rounded" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="p-4 border-b border-white/5 last:border-b-0"
        >
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className="h-4 rounded"
                style={{ width: `${60 + Math.random() * 40}%` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Export all for convenience
export {
  Skeleton as default,
};
