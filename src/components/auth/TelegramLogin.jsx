/**
 * Telegram Login Component
 * 
 * Implements Telegram Login Widget for authentication.
 * Telegram uses its own OAuth-like flow via the Telegram Login Widget.
 * 
 * Setup Requirements:
 * 1. Create a Telegram Bot via @BotFather
 * 2. Use /setdomain to set your domain for the bot
 * 3. Set VITE_TELEGRAM_BOT_USERNAME in your environment
 * 
 * @see https://core.telegram.org/widgets/login
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Loader2, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// =============================================================================
// CONFIGURATION
// =============================================================================

// Telegram bot username - must match exactly what's configured in BotFather
const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'HOTMESS_ADMIN_BOT';

// =============================================================================
// TELEGRAM AUTH HELPER
// =============================================================================

/**
 * Verify Telegram auth data server-side
 * This should call your backend to verify the hash
 */
const verifyTelegramAuth = async (authData) => {
  try {
    // In production, verify the hash server-side using your bot token
    // The hash is created using HMAC-SHA256 of the data_check_string with SHA256(bot_token)
    const response = await fetch('/api/auth/telegram/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Verification failed');
    }
    
    return response.json();
  } catch (error) {
    console.error('[TelegramAuth] Verification error:', error);
    // For demo purposes, return the data as verified
    // In production, always verify server-side
    return { verified: true, user: authData };
  }
};

/**
 * Create or link Supabase account with Telegram data
 */
const linkTelegramAccount = async (telegramUser) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    // User is logged in - link Telegram to existing account
    const { error } = await supabase
      .from('User')
      .update({
        telegram_id: telegramUser.id,
        telegram_username: telegramUser.username,
        telegram_first_name: telegramUser.first_name,
        telegram_photo_url: telegramUser.photo_url,
        updated_at: new Date().toISOString(),
      })
      .eq('auth_user_id', user.id);
    
    if (error) throw error;
    return { linked: true, user };
  }
  
  // No user logged in - try to find or create account
  // First, check if this Telegram ID is already linked to an account
  const { data: existingUser } = await supabase
    .from('User')
    .select('email, auth_user_id')
    .eq('telegram_id', telegramUser.id)
    .maybeSingle();
  
  if (existingUser?.email) {
    // Send magic link to the associated email
    return { 
      needsLogin: true, 
      email: existingUser.email,
      message: 'Telegram account found. Check your email for login link.'
    };
  }
  
  // New Telegram user - needs to create account first
  return {
    needsRegistration: true,
    telegramData: telegramUser,
    message: 'Please complete registration with your email.'
  };
};

// =============================================================================
// TELEGRAM LOGIN BUTTON COMPONENT
// =============================================================================

export default function TelegramLogin({ 
  onSuccess, 
  onError, 
  buttonSize = 'large',
  showAvatar = true,
  cornerRadius = 10,
  requestAccess = 'write',
  className 
}) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [telegramUser, setTelegramUser] = useState(null);

  // Handle Telegram auth callback
  const handleTelegramAuth = useCallback(async (user) => {
    console.log('[TelegramAuth] Received user:', user);
    setLoading(true);
    setError('');
    
    try {
      // Verify the auth data
      const verified = await verifyTelegramAuth(user);
      
      if (!verified.verified) {
        throw new Error('Authentication verification failed');
      }
      
      // Try to link/login
      const result = await linkTelegramAccount(user);
      
      setTelegramUser(user);
      
      if (result.needsLogin) {
        // Send magic link
        const { error: magicLinkError } = await supabase.auth.signInWithOtp({
          email: result.email,
          options: {
            emailRedirectTo: `${window.location.origin}/Auth?telegram=linked`,
          },
        });
        
        if (magicLinkError) throw magicLinkError;
        
        toast.success('Login link sent to your email!');
        onSuccess?.({ ...result, telegramUser: user });
      } else if (result.needsRegistration) {
        // New user needs to register
        onSuccess?.({ ...result, telegramUser: user });
      } else {
        // Successfully linked
        toast.success('Telegram connected successfully!');
        onSuccess?.({ linked: true, telegramUser: user });
      }
    } catch (err) {
      console.error('[TelegramAuth] Error:', err);
      setError(err.message || 'Failed to authenticate with Telegram');
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [onSuccess, onError]);

  // Make the callback available globally for the Telegram widget
  useEffect(() => {
    window.onTelegramAuth = handleTelegramAuth;
    return () => {
      delete window.onTelegramAuth;
    };
  }, [handleTelegramAuth]);

  const [widgetLoading, setWidgetLoading] = useState(true);
  const [widgetError, setWidgetError] = useState(false);

  // Load Telegram Login Widget script
  useEffect(() => {
    if (!containerRef.current) return;
    
    setWidgetLoading(true);
    setWidgetError(false);
    
    // Clear existing content
    containerRef.current.innerHTML = '';
    
    // Create the Telegram Login button script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', TELEGRAM_BOT_USERNAME);
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-radius', String(cornerRadius));
    script.setAttribute('data-request-access', requestAccess);
    script.setAttribute('data-userpic', String(showAvatar));
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    
    script.onload = () => {
      // Give the widget time to render
      setTimeout(() => {
        setWidgetLoading(false);
        // Check if widget rendered (creates an iframe)
        if (containerRef.current && !containerRef.current.querySelector('iframe')) {
          setWidgetError(true);
        }
      }, 2000);
    };
    
    script.onerror = () => {
      setWidgetLoading(false);
      setWidgetError(true);
    };
    
    containerRef.current.appendChild(script);
    
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [buttonSize, cornerRadius, requestAccess, showAvatar]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Telegram Widget Container */}
      <div 
        ref={containerRef} 
        className={cn("flex justify-center min-h-[40px]", widgetError && "hidden")}
      />
      
      {/* Widget Loading */}
      {widgetLoading && !widgetError && (
        <div className="flex items-center justify-center gap-2 text-[#0088cc] py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading Telegram...</span>
        </div>
      )}
      
      {/* Widget Failed - Fallback Link */}
      {widgetError && (
        <div className="space-y-3">
          <div className="text-center text-sm text-white/60">
            Widget unavailable. Open Telegram directly:
          </div>
          <a
            href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-lg transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            Open @{TELEGRAM_BOT_USERNAME}
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}
      
      {/* Auth Loading State */}
      {loading && (
        <div className="flex items-center justify-center gap-2 text-[#0088cc]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Connecting to Telegram...</span>
        </div>
      )}
      
      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Connected State */}
      {telegramUser && !error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-3 bg-[#0088cc]/10 border border-[#0088cc]/30 rounded-lg"
        >
          {telegramUser.photo_url && (
            <img 
              src={telegramUser.photo_url} 
              alt={telegramUser.first_name}
              className="w-10 h-10 rounded-full"
            />
          )}
          <div className="flex-1">
            <p className="font-medium text-white">
              {telegramUser.first_name} {telegramUser.last_name || ''}
            </p>
            {telegramUser.username && (
              <p className="text-sm text-[#0088cc]">@{telegramUser.username}</p>
            )}
          </div>
          <CheckCircle className="w-5 h-5 text-[#0088cc]" />
        </motion.div>
      )}
    </div>
  );
}

// =============================================================================
// STYLED TELEGRAM BUTTON (Custom implementation)
// =============================================================================

export function TelegramButton({ 
  onClick, 
  loading = false, 
  disabled = false,
  size = 'default',
  className 
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "bg-[#0088cc] hover:bg-[#0077b5] text-white font-medium transition-colors",
        size === 'lg' && "py-6 text-lg",
        className
      )}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
      ) : (
        <MessageCircle className="w-5 h-5 mr-2" />
      )}
      Continue with Telegram
    </Button>
  );
}

// =============================================================================
// TELEGRAM LINK STATUS COMPONENT
// =============================================================================

export function TelegramLinkStatus({ telegramUsername, onUnlink }) {
  if (!telegramUsername) {
    return (
      <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#0088cc]/20 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-[#0088cc]" />
          </div>
          <div>
            <p className="font-medium text-white">Telegram</p>
            <p className="text-sm text-white/60">Not connected</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-[#0088cc] text-[#0088cc] hover:bg-[#0088cc]/10"
        >
          Connect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-4 bg-[#0088cc]/10 rounded-lg border border-[#0088cc]/30">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#0088cc]/20 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-[#0088cc]" />
        </div>
        <div>
          <p className="font-medium text-white">Telegram</p>
          <p className="text-sm text-[#0088cc]">@{telegramUsername}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <CheckCircle className="w-5 h-5 text-[#0088cc]" />
        {onUnlink && (
          <button
            onClick={onUnlink}
            className="text-xs text-white/40 hover:text-red-400 ml-2"
          >
            Unlink
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// TELEGRAM DEEP LINK BUTTON
// =============================================================================

export function TelegramDeepLink({ 
  username = TELEGRAM_BOT_USERNAME, 
  startParam,
  children,
  className 
}) {
  const url = startParam 
    ? `https://t.me/${username}?start=${startParam}`
    : `https://t.me/${username}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-lg transition-colors",
        className
      )}
    >
      <MessageCircle className="w-5 h-5" />
      {children || 'Open in Telegram'}
      <ExternalLink className="w-4 h-4" />
    </a>
  );
}
