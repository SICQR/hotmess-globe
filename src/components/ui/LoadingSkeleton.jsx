import React from 'react';

export function CardSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-white/10 rounded-full" />
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-white/10 rounded w-3/4" />
          <div className="h-3 bg-white/10 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-white/5 border border-white/10 rounded-xl p-8 mb-6">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-white/10 rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="h-6 bg-white/10 rounded w-48" />
            <div className="h-4 bg-white/10 rounded w-64" />
            <div className="flex gap-4">
              <div className="h-3 bg-white/10 rounded w-20" />
              <div className="h-3 bg-white/10 rounded w-20" />
              <div className="h-3 bg-white/10 rounded w-20" />
            </div>
          </div>
        </div>
      </div>
      <GridSkeleton count={6} />
    </div>
  );
}