/**
 * L2NotificationSettingsSheet — channel preference + browser push toggle.
 *
 * Brief: PR 3 of the HOTMESS notification stack (Phil 2026-05-26).
 * Doctrine: opt-in only, no auto-prompts, no dark patterns. User clicks
 * what they want; everything writes to profiles immediately.
 *
 * Channel options (single select):
 *   IN-APP ONLY  → notification_channel = 'none'
 *   WHATSAPP     → notification_channel = 'whatsapp'  + profiles.phone
 *   TELEGRAM     → notification_channel = 'telegram'  + telegram_link_token
 *
 * Browser push is a SEPARATE section (not part of the radio). Per the
 * doctrine it is assistive only — never the sole path for critical/high.
 */

import React from 'react';
import { Bell, MessageCircle, Send, Globe, Check, ExternalLink } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { usePushSubscription } from '@/hooks/usePushSubscription';

const GOLD = '#C8962C';

type Channel = 'none' | 'whatsapp' | 'telegram';

interface ProfileRow {
  notification_channel: Channel | null;
  phone: string | null;
  telegram_chat_id: number | null;
  telegram_link_token: string | null;
}

export default function L2NotificationSettingsSheet() {
  const [userId, setUserId] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<ProfileRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [savingChannel, setSavingChannel] = React.useState(false);
  const [phoneInput, setPhoneInput] = React.useState('');
  const [savingPhone, setSavingPhone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const push = usePushSubscription();

  // Load current user + profile
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess?.session?.user?.id ?? null;
        if (!uid) {
          if (!cancelled) {
            setLoading(false);
            setError('Sign in to manage notifications.');
          }
          return;
        }
        if (!cancelled) setUserId(uid);
        const { data, error: err } = await supabase
          .from('profiles')
          .select('notification_channel, phone, telegram_chat_id, telegram_link_token')
          .eq('id', uid)
          .maybeSingle();
        if (cancelled) return;
        if (err) {
          setError('Could not load your settings.');
        } else if (data) {
          setProfile(data as ProfileRow);
          setPhoneInput(data.phone || '');
        }
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError('Something went wrong loading notifications.');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentChannel: Channel = (profile?.notification_channel as Channel) || 'none';

  const writeChannel = async (next: Channel) => {
    if (!userId || savingChannel) return;
    setSavingChannel(true);
    setError(null);
    try {
      const update: Record<string, any> = { notification_channel: next };
      // If switching AWAY from telegram, leave chat_id intact (so reconnecting
      // skips the deep link). If switching TO telegram and no chat_id, we
      // generate a token below in the Telegram CTA, not here.
      const { error: err } = await supabase
        .from('profiles')
        .update(update)
        .eq('id', userId);
      if (err) {
        setError('Could not save.');
      } else {
        setProfile((p) => (p ? { ...p, notification_channel: next } : p));
      }
    } catch {
      setError('Could not save.');
    } finally {
      setSavingChannel(false);
    }
  };

  const savePhone = async () => {
    if (!userId || savingPhone) return;
    // Light E.164 validation
    const trimmed = phoneInput.trim();
    if (!/^\+?[1-9]\d{6,14}$/.test(trimmed)) {
      setError('Enter a valid phone number (e.g. +44 7700 900123).');
      return;
    }
    setSavingPhone(true);
    setError(null);
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({ phone: trimmed })
        .eq('id', userId);
      if (err) {
        setError('Could not save number.');
      } else {
        setProfile((p) => (p ? { ...p, phone: trimmed } : p));
      }
    } finally {
      setSavingPhone(false);
    }
  };

  const generateTelegramLink = async (): Promise<string | null> => {
    if (!userId) return null;
    // Reuse existing token if one is already pending
    if (profile?.telegram_link_token) {
      return `https://t.me/HOTMESSBot?start=${profile.telegram_link_token}`;
    }
    const token =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    const { error: err } = await supabase
      .from('profiles')
      .update({ telegram_link_token: token })
      .eq('id', userId);
    if (err) {
      setError('Could not generate Telegram link.');
      return null;
    }
    setProfile((p) => (p ? { ...p, telegram_link_token: token } : p));
    return `https://t.me/HOTMESSBot?start=${token}`;
  };

  const openTelegram = async () => {
    const url = await generateTelegramLink();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const togglePush = async () => {
    if (push.subscribed) {
      const r = await push.unsubscribe();
      if (!r.ok) setError(r.error || 'Could not turn off browser notifications.');
    } else {
      const r = await push.subscribe();
      if (!r.ok && r.error !== 'permission_denied') {
        setError(r.error || 'Could not turn on browser notifications.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-white/40 text-sm">Loading…</div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <header className="flex items-center gap-2 mb-1">
        <Bell className="w-4 h-4" style={{ color: GOLD }} />
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">
          How should we reach you?
        </h2>
      </header>

      <p className="text-[12px] text-white/45 leading-snug -mt-2">
        Opt in to one external channel. Safety alerts go there first. Browser notifications are offered separately below.
      </p>

      {/* Channel radio */}
      <div className="flex flex-col gap-2">
        {/* In-app only */}
        <ChannelOption
          label="In-app only"
          subline="Notifications appear in the bell. No external messages."
          selected={currentChannel === 'none'}
          icon={<Bell className="w-4 h-4" />}
          disabled={savingChannel}
          onClick={() => writeChannel('none')}
        />

        {/* WhatsApp */}
        <ChannelOption
          label="WhatsApp"
          subline="Safety alerts + key updates sent to your number."
          selected={currentChannel === 'whatsapp'}
          icon={<MessageCircle className="w-4 h-4" />}
          disabled={savingChannel}
          onClick={() => writeChannel('whatsapp')}
        >
          {currentChannel === 'whatsapp' && (
            <div className="flex gap-2 mt-3">
              <input
                type="tel"
                inputMode="tel"
                placeholder="+44 7700 900123"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="flex-1 bg-black border border-white/15 rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/30 focus:outline-none focus:border-[#C8962C]/60"
              />
              <button
                type="button"
                onClick={savePhone}
                disabled={savingPhone || !phoneInput.trim()}
                className="px-4 h-9 rounded-lg text-[12px] font-bold uppercase tracking-wider disabled:opacity-50"
                style={{ background: GOLD, color: '#000' }}
              >
                {savingPhone ? '…' : 'Save'}
              </button>
            </div>
          )}
        </ChannelOption>

        {/* Telegram */}
        <ChannelOption
          label="Telegram"
          subline="Connect @HOTMESSBot to receive updates."
          selected={currentChannel === 'telegram'}
          icon={<Send className="w-4 h-4" />}
          disabled={savingChannel}
          onClick={() => writeChannel('telegram')}
        >
          {currentChannel === 'telegram' && (
            <div className="mt-3">
              {profile?.telegram_chat_id ? (
                <div className="flex items-center gap-2 text-[12px] text-[#C8962C]">
                  <Check className="w-4 h-4" />
                  Connected ✓
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openTelegram}
                  className="inline-flex items-center gap-2 px-4 h-9 rounded-lg text-[12px] font-bold uppercase tracking-wider"
                  style={{ background: GOLD, color: '#000' }}
                >
                  Open Telegram <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </ChannelOption>
      </div>

      {/* Browser push — separate section */}
      <section className="mt-5 pt-5 border-t border-white/10 flex flex-col gap-2">
        <header className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-white/60" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-white">Browser push</h3>
        </header>
        <p className="text-[12px] text-white/45 leading-snug">
          Assistive only — never the sole path for safety. Works in this browser only.
        </p>

        {!push.isSupported && (
          <div className="text-[12px] text-white/40">
            Your browser doesn&rsquo;t support push notifications.
          </div>
        )}

        {push.isSupported && push.permission === 'denied' && (
          <div className="text-[12px] text-white/55 leading-snug">
            Notifications are blocked in browser settings. Re-enable there to turn this on.
          </div>
        )}

        {push.isSupported && push.permission !== 'denied' && (
          <button
            type="button"
            onClick={togglePush}
            className="self-start inline-flex items-center gap-2 px-4 h-9 rounded-lg text-[12px] font-bold uppercase tracking-wider border"
            style={{
              background: push.subscribed ? 'transparent' : GOLD,
              color: push.subscribed ? '#fff' : '#000',
              borderColor: push.subscribed ? 'rgba(255,255,255,0.20)' : GOLD,
            }}
          >
            {push.subscribed ? 'Turn off' : 'Turn on'}
          </button>
        )}
      </section>

      {error && (
        <div className="text-[12px] text-red-400/80 mt-2">{error}</div>
      )}
    </div>
  );
}

function ChannelOption({
  label,
  subline,
  selected,
  icon,
  disabled,
  onClick,
  children,
}: {
  label: string;
  subline: string;
  selected: boolean;
  icon: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-left rounded-xl p-3 transition-colors"
      style={{
        background: selected ? 'rgba(200,150,44,0.10)' : 'rgba(255,255,255,0.025)',
        border: selected
          ? '1px solid rgba(200,150,44,0.55)'
          : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
          style={{
            background: selected ? 'rgba(200,150,44,0.18)' : 'rgba(255,255,255,0.05)',
            color: selected ? GOLD : 'rgba(255,255,255,0.55)',
          }}
        >
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <div
            className="text-[13px] font-bold uppercase tracking-wider"
            style={{ color: selected ? GOLD : '#fff' }}
          >
            {label}
          </div>
          <div className="text-[11px] text-white/45 leading-snug mt-0.5">{subline}</div>
        </div>
        {selected && <Check className="w-4 h-4 mt-1 text-[#C8962C]" />}
      </div>
      {children}
    </button>
  );
}
