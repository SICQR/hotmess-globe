/**
 * UsernamePicker - Post-signup username selection
 * 
 * Validates:
 * - 3-20 chars
 * - Lowercase letters, numbers, underscores only
 * - Can't start with number
 * - Must be unique
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Loader2, AtSign, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

// Reserved usernames
const RESERVED = new Set([
  'admin', 'hotmess', 'support', 'help', 'mod', 'moderator',
  'official', 'staff', 'team', 'london', 'api', 'www', 'app',
  'system', 'null', 'undefined', 'root', 'test', 'demo'
]);

// Validation regex: 3-20 chars, lowercase alphanumeric + underscore, can't start with number
const USERNAME_REGEX = /^[a-z_][a-z0-9_]{2,19}$/;

export default function UsernamePicker({ onComplete, suggestedFromEmail }) {
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null); // null = not checked, true = available, false = taken
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Generate suggestion from email
  useEffect(() => {
    if (suggestedFromEmail && !username) {
      const base = suggestedFromEmail
        .split('@')[0]
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 20);
      // Ensure doesn't start with number
      const safe = /^[0-9]/.test(base) ? `_${base}`.slice(0, 20) : base;
      if (safe.length >= 3) {
        setUsername(safe);
      }
    }
  }, [suggestedFromEmail, username]);

  // Validate format
  const validateFormat = useCallback((value) => {
    if (!value) return { valid: false, error: '' };
    if (value.length < 3) return { valid: false, error: 'At least 3 characters' };
    if (value.length > 20) return { valid: false, error: 'Max 20 characters' };
    if (!USERNAME_REGEX.test(value)) {
      if (/^[0-9]/.test(value)) return { valid: false, error: "Can't start with a number" };
      return { valid: false, error: 'Letters, numbers, underscores only' };
    }
    if (RESERVED.has(value)) return { valid: false, error: 'This username is reserved' };
    return { valid: true, error: '' };
  }, []);

  // Check availability (debounced in effect)
  const checkAvailability = useCallback(async (value) => {
    const { valid, error: formatError } = validateFormat(value);
    if (!valid) {
      setAvailable(null);
      setError(formatError);
      return;
    }

    setChecking(true);
    setError('');
    try {
      const { data, error: dbError } = await supabase
        .from('User')
        .select('id')
        .ilike('username', value)
        .limit(1);

      if (dbError) throw dbError;
      setAvailable(data.length === 0);
      if (data.length > 0) {
        setError('Already taken');
      }
    } catch (err) {
      console.error('Username check failed:', err);
      setError('Could not check availability');
      setAvailable(null);
    } finally {
      setChecking(false);
    }
  }, [validateFormat]);

  // Debounce check
  useEffect(() => {
    if (!username) {
      setAvailable(null);
      setError('');
      return;
    }

    const timer = setTimeout(() => {
      checkAvailability(username);
    }, 400);

    return () => clearTimeout(timer);
  }, [username, checkAvailability]);

  // Handle input change
  const handleChange = (e) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    setUsername(value);
    setAvailable(null);
  };

  // Save username
  const handleSave = async () => {
    if (!available) return;

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('Not authenticated');

      const { error: updateError } = await supabase
        .from('User')
        .update({ 
          username: username.toLowerCase(),
          display_name: session.user.user_metadata?.full_name || username
        })
        .eq('auth_user_id', session.user.id);

      if (updateError) throw updateError;

      toast.success(`You're now @${username}!`);
      onComplete?.(username);
    } catch (err) {
      console.error('Failed to save username:', err);
      toast.error('Failed to save username');
    } finally {
      setSaving(false);
    }
  };

  // Generate random suggestions
  const suggestions = [
    `${username || 'messy'}_${Math.floor(Math.random() * 99)}`,
    `night_${(username || 'owl').slice(0, 10)}`,
    `${(username || 'london').slice(0, 8)}_vibes`,
  ].filter(s => USERNAME_REGEX.test(s));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center"
        >
          <AtSign className="w-10 h-10 text-white" />
        </motion.div>
        <h1 className="text-3xl font-black uppercase mb-2">Claim Your Username</h1>
        <p className="text-white/60 text-sm">This is how people will find you</p>
      </div>

      <div className="glass-glow-hot rounded-2xl p-8">
        {/* Input */}
        <div className="relative mb-4">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-bold">@</div>
          <Input
            value={username}
            onChange={handleChange}
            placeholder="username"
            className="pl-10 pr-12 h-14 text-lg bg-black/50 border-white/20 font-mono"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {checking && <Loader2 className="w-5 h-5 animate-spin text-white/40" />}
            {!checking && available === true && <Check className="w-5 h-5 text-[#39FF14]" />}
            {!checking && available === false && <X className="w-5 h-5 text-red-500" />}
          </div>
        </div>

        {/* Status */}
        <div className="h-6 mb-6">
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-400"
            >
              {error}
            </motion.p>
          )}
          {!error && available && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-[#39FF14] flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              @{username} is available!
            </motion.p>
          )}
        </div>

        {/* Suggestions */}
        {username && !available && suggestions.length > 0 && (
          <div className="mb-6">
            <p className="text-xs text-white/40 uppercase mb-2">Try these:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setUsername(s)}
                  className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-full hover:bg-white/10 hover:border-white/20 transition-colors"
                >
                  @{s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        <Button
          onClick={handleSave}
          disabled={!available || saving}
          variant="hotGlow"
          className="w-full h-14 text-lg font-black uppercase"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>

        {/* Skip option */}
        <p className="text-center text-xs text-white/30 mt-4">
          You can change this later in Settings
        </p>
      </div>
    </motion.div>
  );
}
