/**
 * Enhanced Telegram Auth Component
 * 
 * Uses @telegram-auth/react for the official Telegram Login Widget.
 * Implements custom HMAC verification and creates/links Supabase accounts.
 * 
 * Part of the HotMess OS Integration - First functional "wire" for identity.
 */

import { useCallback, useState } from 'react';
import { LoginButton } from '@telegram-auth/react';
import { motion } from 'framer-motion';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'hotmess_london_bot';

/**
 * Drop initial beacon when user authenticates via Telegram
 */
const dropInitialBeacon = async (telegramId, userData) => {
  try {
    const { data: profile } = await supabase
      .from('User')
      .select('city, lat, lng')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (!profile?.lat || !profile?.lng) {
      console.log('[TelegramAuth] No location data, skipping beacon drop');
      return;
    }

    // Create a "joined" beacon
    await supabase.from('Beacon').insert({
      title: `${userData.first_name} joined HotMess`,
      description: 'New member via Telegram',
      lat: profile.lat,
      lng: profile.lng,
      city: profile.city,
      mode: 'social',
      kind: 'social',
      intensity: 1,
      active: true,
      created_by: telegramId,
      telegram_id: telegramId,
    });

    console.log('[TelegramAuth] Initial beacon dropped');
  } catch (error) {
    console.error('[TelegramAuth] Failed to drop beacon:', error);
  }
};

/**
 * Enhanced TelegramAuth component using @telegram-auth/react
 */
export const TelegramAuth = ({ onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);

  const handleAuth = useCallback(async (data) => {
    console.log('[TelegramAuth] Received auth data:', data);
    setLoading(true);
    setError(null);

    try {
      // Send TG data to Supabase Edge Function to verify and sign in
      const response = await fetch('/api/auth/telegram/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const result = await response.json();

      if (!result.verified) {
        throw new Error('Telegram authentication verification failed');
      }

      // Try to find or create user in Supabase
      const { data: existingUser } = await supabase
        .from('User')
        .select('*')
        .eq('telegram_id', data.id)
        .maybeSingle();

      if (existingUser) {
        // User exists - trigger magic link or session
        if (existingUser.email) {
          const { error: magicLinkError } = await supabase.auth.signInWithOtp({
            email: existingUser.email,
            options: {
              emailRedirectTo: `${window.location.origin}/auth?telegram=linked`,
            },
          });

          if (magicLinkError) throw magicLinkError;

          toast.success('Login link sent to your email!');
        } else {
          toast.info('Please complete your profile setup');
        }
      } else {
        // New user - create profile
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          // Link to existing auth user
          await supabase.from('User').update({
            telegram_id: data.id,
            telegram_username: data.username,
            telegram_first_name: data.first_name,
            telegram_photo_url: data.photo_url,
          }).eq('auth_user_id', authUser.id);
        }

        toast.success('Telegram connected successfully!');
      }

      // Set the session and drop the first beacon
      if (result.user) {
        await dropInitialBeacon(data.id, data);
      }

      setAuthenticated(true);
      onSuccess?.(result);
    } catch (err) {
      console.error('[TelegramAuth] Error:', err);
      setError(err.message || 'Failed to authenticate with Telegram');
      toast.error(err.message || 'Authentication failed');
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [onSuccess, onError]);

  return (
    <div className="auth-overlay space-y-4">
      {/* Telegram Login Button */}
      <LoginButton
        botUsername={TELEGRAM_BOT_USERNAME}
        onAuthCallback={handleAuth}
        buttonSize="large"
        cornerRadius={0} // Brutalist style
        lang="en"
        requestAccess="write"
      />

      {/* Loading State */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-2 text-[#0088cc]"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Authenticating...</span>
        </motion.div>
      )}

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Success State */}
      {authenticated && !error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 p-3 bg-[#0088cc]/10 border border-[#0088cc]/30 rounded text-[#0088cc] text-sm"
        >
          <CheckCircle className="w-5 h-5" />
          <span>Successfully authenticated with Telegram!</span>
        </motion.div>
      )}
    </div>
  );
};

export default TelegramAuth;
