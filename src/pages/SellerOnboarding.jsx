import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/components/utils/supabaseClient';
import SellerOnboarding from '@/components/seller/SellerOnboarding';
import { createPageUrl } from '@/utils';
import { logger } from '@/utils/logger';

export default function SellerOnboardingPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth) {
          base44.auth.redirectToLogin(window.location.href);
          return;
        }

        const user = await base44.auth.me();
        setCurrentUser(user);

        // If already onboarded, redirect to dashboard
        if (user.seller_onboarded) {
          navigate(createPageUrl('SellerDashboard'));
          return;
        }
      } catch (error) {
        logger.error('Failed to fetch user', { error: error?.message, context: 'SellerOnboarding' });
        base44.auth.redirectToLogin(window.location.href);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleComplete = () => {
    navigate(createPageUrl('SellerDashboard'));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <SellerOnboarding 
      currentUser={currentUser} 
      onComplete={handleComplete}
    />
  );
}
