/**
 * Page Skeleton Components
 * 
 * Consistent loading states across the application
 */

import { cn } from '@/lib/utils';

// Base skeleton with shimmer effect
export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn(
        "animate-pulse bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] rounded",
        className
      )}
      {...props}
    />
  );
}

// Profile card skeleton
export function ProfileCardSkeleton({ className }) {
  return (
    <div className={cn("p-4 bg-white/5 border border-white/10 rounded-lg", className)}>
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-8 w-20 rounded" />
        <Skeleton className="h-8 w-20 rounded" />
      </div>
    </div>
  );
}

// Profile grid skeleton
export function ProfileGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array(count).fill(0).map((_, i) => (
        <ProfileCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Event card skeleton
export function EventCardSkeleton({ className }) {
  return (
    <div className={cn("bg-white/5 border border-white/10 rounded-lg overflow-hidden", className)}>
      <Skeleton className="aspect-video w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded-full" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Event list skeleton
export function EventListSkeleton({ count = 4 }) {
  return (
    <div className="space-y-4">
      {Array(count).fill(0).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Product card skeleton
export function ProductCardSkeleton({ className }) {
  return (
    <div className={cn("bg-white/5 border border-white/10 rounded-lg overflow-hidden", className)}>
      <Skeleton className="aspect-square w-full" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </div>
    </div>
  );
}

// Product grid skeleton
export function ProductGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array(count).fill(0).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Message thread skeleton
export function MessageThreadSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Received message */}
      <div className="flex gap-3">
        <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-16 w-48 rounded-lg rounded-tl-none" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      {/* Sent message */}
      <div className="flex gap-3 justify-end">
        <div className="space-y-2 text-right">
          <Skeleton className="h-12 w-40 rounded-lg rounded-tr-none ml-auto" />
          <Skeleton className="h-3 w-16 ml-auto" />
        </div>
      </div>
      {/* Another received */}
      <div className="flex gap-3">
        <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-20 w-56 rounded-lg rounded-tl-none" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

// Conversation list skeleton
export function ConversationListSkeleton({ count = 5 }) {
  return (
    <div className="divide-y divide-white/10">
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="p-4 flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Beacon/Map marker skeleton
export function BeaconListSkeleton({ count = 4 }) {
  return (
    <div className="space-y-3">
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
          <Skeleton className="w-12 h-12 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// Stats card skeleton
export function StatsCardSkeleton() {
  return (
    <div className="p-6 bg-white/5 border border-white/10 rounded-lg">
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-8 w-16 mb-4" />
      <Skeleton className="h-2 w-full rounded-full" />
    </div>
  );
}

// Stats grid skeleton
export function StatsGridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array(count).fill(0).map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Feed/Activity skeleton
export function FeedSkeleton({ count = 5 }) {
  return (
    <div className="space-y-4">
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4 mb-4" />
          <Skeleton className="aspect-video w-full rounded-lg mb-3" />
          <div className="flex gap-4">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Full page loading skeleton
export function PageLoadingSkeleton({ type = 'default' }) {
  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <Skeleton className="h-10 w-48" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-10 rounded" />
          <Skeleton className="h-10 w-10 rounded" />
        </div>
      </div>
      
      {/* Content based on type */}
      {type === 'profiles' && <ProfileGridSkeleton count={8} />}
      {type === 'events' && <EventListSkeleton count={4} />}
      {type === 'products' && <ProductGridSkeleton count={8} />}
      {type === 'messages' && <ConversationListSkeleton count={6} />}
      {type === 'feed' && <FeedSkeleton count={4} />}
      {type === 'default' && (
        <div className="space-y-6">
          <StatsGridSkeleton count={4} />
          <FeedSkeleton count={3} />
        </div>
      )}
    </div>
  );
}

// Inline loading (for within components)
export function InlineLoader({ text = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center gap-3 p-8">
      <div className="w-5 h-5 border-2 border-white/20 border-t-[#FF1493] rounded-full animate-spin" />
      <span className="text-white/60 text-sm">{text}</span>
    </div>
  );
}

// Empty state with skeleton hint
export function EmptyStateSkeleton({ message = 'Nothing here yet' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
        <Skeleton className="w-10 h-10 rounded" />
      </div>
      <p className="text-white/40 text-sm">{message}</p>
    </div>
  );
}

export default {
  Skeleton,
  ProfileCardSkeleton,
  ProfileGridSkeleton,
  EventCardSkeleton,
  EventListSkeleton,
  ProductCardSkeleton,
  ProductGridSkeleton,
  MessageThreadSkeleton,
  ConversationListSkeleton,
  BeaconListSkeleton,
  StatsCardSkeleton,
  StatsGridSkeleton,
  FeedSkeleton,
  PageLoadingSkeleton,
  InlineLoader,
  EmptyStateSkeleton,
};
