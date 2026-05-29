import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useBootGuard } from '@/contexts/BootGuardContext';

/**
 * Boot Guard Gate
 * Wraps protected routes and redirects based on boot state
 */
export function BootGuardGate({ children }) {
  const { bootState, isLoading } = useBootGuard();
  const location = useLocation();
  const pathname = location?.pathname || '/';

  // Show loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#050507]">
        <div className="w-8 h-8 border-4 border-[#39FF14]/20 border-t-[#39FF14] rounded-full animate-spin" />
      </div>
    );
  }

  // Allow these paths without full gates
  // Doctrine 11: /auth removed from public paths — it redirects to / now.
  const publicPaths = ['/age', '/legal', '/help', '/contact', '/terms', '/privacy', '/guidelines'];
  const isPublicPath = publicPaths.some(p => pathname.startsWith(p));
  
  if (isPublicPath) {
    return <>{children}</>;
  }

  // Redirect based on boot state
  switch (bootState) {
    case 'AGE_GATE':
      if (pathname !== '/age' && pathname !== '/AgeGate') {
        return <Navigate to="/age" replace />;
      }
      break;
      
    case 'AUTH':
      // Doctrine 11 (Single Auth Authority): canonical entry is / not /auth.
      if (pathname !== '/') {
        return <Navigate to="/" replace />;
      }
      break;
      
    case 'USERNAME':
    case 'ONBOARDING':
      if (!pathname.startsWith('/onboarding') && pathname !== '/OnboardingGate') {
        return <Navigate to="/onboarding" replace />;
      }
      break;
      
    case 'OS':
      // All gates passed - allow access
      break;
      
    default:
      // Unknown state - show loading
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#050507]">
          <div className="w-8 h-8 border-4 border-[#39FF14]/20 border-t-[#39FF14] rounded-full animate-spin" />
        </div>
      );
  }

  return <>{children}</>;
}

export default BootGuardGate;
