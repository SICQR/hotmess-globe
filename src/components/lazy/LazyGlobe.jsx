import React, { Suspense, lazy } from 'react';

// Lazy load the heavy Three.js globe component
const EnhancedGlobe3D = lazy(() => import('../globe/EnhancedGlobe3D'));

const GlobeSkeleton = () => (
  <div className="w-full h-full flex items-center justify-center bg-black">
    <div className="relative">
      {/* Globe skeleton */}
      <div className="w-64 h-64 md:w-80 md:h-80 rounded-full bg-gradient-to-br from-zinc-800 via-zinc-900 to-black animate-pulse" />
      {/* Glow effect */}
      <div className="absolute inset-0 rounded-full bg-[#00d9ff]/10 blur-xl animate-pulse" />
      {/* Loading text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white/60 text-sm mb-2">Loading Globe</div>
          <div className="w-24 h-1 bg-zinc-800 rounded overflow-hidden mx-auto">
            <div className="h-full bg-[#00d9ff] animate-[shimmer_1.5s_ease-in-out_infinite]" 
              style={{ 
                width: '30%',
                animation: 'shimmer 1.5s ease-in-out infinite'
              }} 
            />
          </div>
        </div>
      </div>
    </div>
    <style>{`
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(400%); }
      }
    `}</style>
  </div>
);

const LazyGlobe = React.forwardRef((props, ref) => (
  <Suspense fallback={<GlobeSkeleton />}>
    <EnhancedGlobe3D ref={ref} {...props} />
  </Suspense>
));

LazyGlobe.displayName = 'LazyGlobe';

export default LazyGlobe;
