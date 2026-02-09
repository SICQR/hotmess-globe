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

  // Show loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#050507]">
        <div className="w-8 h-8 border-4 border-[#39FF14]/20 border-t-[#39FF14] rounded-full animate-spin" />
      </div>
    );
  }

  // Allow these paths without full gates
  const publicPaths = ['/age', '/auth', '/legal', '/help', '/contact', '/terms', '/privacy', '/guidelines'];
  const isPublicPath = publicPaths.some(p => location.pathname.startsWith(p));
  
  if (isPublicPath) {
    return <>{children}</>;
  }

  // Redirect based on boot state
  switch (bootState) {
    case 'AGE_GATE':
      if (location.pathname !== '/age' && location.pathname !== '/AgeGate') {
        return <Navigate to="/age" replace />;
      }
      break;
      
    case 'AUTH':
      if (!location.pathname.startsWith('/auth') && location.pathname !== '/Auth') {
        return <Navigate to="/auth" replace />;
      }
      break;
      
    case 'USERNAME':
    case 'ONBOARDING':
      if (!location.pathname.startsWith('/onboarding') && location.pathname !== '/OnboardingGate') {
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
