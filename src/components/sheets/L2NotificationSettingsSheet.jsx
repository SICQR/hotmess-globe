/**
 * L2NotificationSettingsSheet — Notification channel + browser-push settings.
 *
 * Three-option channel picker (in-app / WhatsApp / Telegram) with instant
 * persist on selection (no Save button). Browser-push toggle lives in a
 * separate section below.
 *
 * Channel writes:
 *   - in-app   → profiles.notification_channel = 'none'
 *   - whatsapp → profiles.notification_channel = 'whatsapp' (+ phone field)
 *   - telegram → profiles.notification_channel = 'telegram',
 *                generates fresh telegram_link_token if not connected
 *
 * Browser push delegates to @/hooks/usePushSubscription (PR 2). When the
 * hook is not yet shipped, the section degrades to a read-only notice
 * showing the current Notification.permission value.
 */
import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { Bell, MessageCircle, Send, Globe, Loader2, CheckCircle2 } from 'lucide-react';

const GOLD = '#C8962C';
const BG   = '#050507';

const E164_RE = /^\+\d{8,15}$/;
const normalisePhone = (raw) => (raw || '').replace(/[^\d+]/g, '');

// ─────────────────────────────────────────────────────────────────────────
// Browser-push UI — lazy import the consumer module. If PR 2 hasn't
// merged, the import fails and we render the degraded notice.
// ─────────────────────────────────────────────────────────────────────────
const PushToggle = lazy(() =>
  import('@/hooks/usePushSubscription')
    .then((mod) => {
      const useHook = mod.default || mod.usePushSubscription;
      return {
        default: function PushToggleImpl() {
          const state = useHook();
          const subscribed = !!state?.subscribed;
          const loading    = !!state?.loading;
          const permission = state?.permission ??
            (typeof Notification !== 'undefined' ? Notification.permission : 'default');
          const denied = permission === 'denied';

          return (
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-mono uppercase tracking-[0.16em] font-bold text-white">
                  Browser push
                </div>
                <p className="text-[11px] text-white/45 mt-0.5">
                  {denied
                    ? 'Enable in browser settings — we cannot re-prompt.'
                    : subscribed
                      ? 'You will receive notifications in this browser.'
                      : 'Get notified even when the app is closed.'}
                </p>
              </div>
              {denied ? (
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-red-400 px-2 py-1 border border-red-400/40 rounded">
                  Blocked
                </span>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    if (loading) return;
                    if (subscribed) await state.unsubscribe?.();
                    else await state.subscribe?.();
                  }}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-[0.15em] transition-colors disabled:opacity-40"
                  style={{
                    background: subscribed ? 'transparent' : GOLD,
                    color:      subscribed ? GOLD : BG,
                    border:     subscribed ? `1px solid ${GOLD}` : 'none',
                  }}
                >
                  {loading ? '…' : subscribed ? 'Off' : 'On'}
                </button>
              )}
            </div>
          );
        },
      };
    })
    .catch(() => ({
      // Hook not shipped yet — render a degraded notice
      default: function PushToggleFallback() {
        const permission = typeof Notification !== 'undefined'
          ? Notification.permission
          : 'default';
        return (
          <div className="text-xs text-white/45 leading-relaxed">
            Browser push is shipping soon. Permission is currently{' '}
            <span className="font-mono text-white/70">{permission}</span>.
          </div>
        );
      },
    }))
);

// ─────────────────────────────────────────────────────────────────────────
// Main sheet component
// ─────────────────────────────────────────────────────────────────────────
export default function L2NotificationSettingsSheet() {
  const [userId, setUserId]       = useState(null);
  const [channel, setChannel]     = useState(null);       // 'none' | 'whatsapp' | 'telegram'
  const [phone, setPhone]         = useState('');
  const [telegramChatId, setTelegramChatId] = useState(null);
  const [telegramToken, setTelegramToken] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [savingFor, setSavingFor] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;
      setUserId(user.id);
      const { data } = await supabase
        .from('profiles')
        .select('notification_channel, phone, telegram_chat_id, telegram_link_token')
        .eq('id', user.id)
        .single();
      if (!mounted || !data) { setLoading(false); return; }
      setChannel(data.notification_channel || 'none');
      setPhone(data.phone || '');
      setTelegramChatId(data.telegram_chat_id || null);
      setTelegramToken(data.telegram_link_token || null);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const selectChannel = useCallback(async (next) => {
    if (!userId || savingFor) return;
    setSavingFor(next);
    setChannel(next);

    const patch = {
      notification_channel: next,
      updated_at: new Date().toISOString(),
    };

    if (next === 'telegram' && !telegramChatId) {
      const token = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      patch.telegram_link_token = token;
      setTelegramToken(token);
    }

    try {
      await supabase.from('profiles').update(patch).eq('id', userId);
    } catch (e) {
      console.warn('[NotifSettings] channel write failed:', e?.message);
    }
    setSavingFor(null);
  }, [userId, savingFor, telegramChatId]);

  const handlePhoneBlur = useCallback(async () => {
    if (!userId || channel !== 'whatsapp') return;
    const normalised = normalisePhone(phone);
    if (!E164_RE.test(normalised)) return;
    setSavingFor('phone');
    try {
      await supabase
        .from('profiles')
        .update({ phone: normalised, updated_at: new Date().toISOString() })
        .eq('id', userId);
    } catch (e) {
      console.warn('[NotifSettings] phone write failed:', e?.message);
    }
    setSavingFor(null);
  }, [userId, channel, phone]);

  const handleOpenTelegram = useCallback(() => {
    if (!telegramToken) return;
    window.open(`https://t.me/HOTMESSBot?start=${telegramToken}`, '_blank', 'noopener,noreferrer');
  }, [telegramToken]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-7 h-7 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  const phoneValid = E164_RE.test(normalisePhone(phone));

  return (
    <div className="flex flex-col px-5 py-4">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-4 h-4 text-[#C8962C]" />
        <span className="text-sm font-semibold text-white">Notifications</span>
        <span
          className="ml-auto text-[10px] font-mono uppercase tracking-[0.15em] px-2 py-0.5 rounded"
          style={{
            background: 'rgba(200,150,44,0.12)',
            color: GOLD,
          }}
        >
          {channel === 'none' ? 'In-app' : channel}
        </span>
      </div>

      <div className="space-y-3">
        <Row
          icon={Bell}
          label="IN-APP ONLY"
          blurb="Notifications appear in the bell. No external messages."
          selected={channel === 'none'}
          saving={savingFor === 'none'}
          onClick={() => selectChannel('none')}
        />

        <Row
          icon={MessageCircle}
          label="WHATSAPP"
          blurb="Safety alerts + key updates sent to your number."
          selected={channel === 'whatsapp'}
          saving={savingFor === 'whatsapp'}
          onClick={() => selectChannel('whatsapp')}
        >
          {channel === 'whatsapp' && (
            <div className="mt-3">
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={handlePhoneBlur}
                placeholder="+44 7700 900123"
                className="w-full px-3 py-2 rounded-md bg-black/60 border text-sm text-white placeholder:text-white/30 outline-none font-mono"
                style={{
                  borderColor: !phone || phoneValid ? 'rgba(255,255,255,0.12)' : '#ef4444',
                }}
              />
              {phone && !phoneValid && (
                <p className="text-[11px] text-red-400 mt-1.5 font-mono">
                  Use full E.164 — e.g. +447700900123
                </p>
              )}
              {savingFor === 'phone' && (
                <p className="text-[11px] text-white/40 mt-1.5 font-mono">Saving…</p>
              )}
            </div>
          )}
        </Row>

        <Row
          icon={Send}
          label="TELEGRAM"
          blurb={telegramChatId
            ? 'Connected. Updates go to your Telegram.'
            : 'Connect @HOTMESSBot to receive updates.'}
          selected={channel === 'telegram'}
          saving={savingFor === 'telegram'}
          badge={telegramChatId ? 'Connected' : null}
          onClick={() => selectChannel('telegram')}
        >
          {channel === 'telegram' && !telegramChatId && (
            <button
              type="button"
              onClick={handleOpenTelegram}
              disabled={!telegramToken}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-md text-xs font-mono uppercase tracking-[0.15em] transition-colors"
              style={{
                background: GOLD,
                color: BG,
                opacity: telegramToken ? 1 : 0.5,
              }}
            >
              Open Telegram →
            </button>
          )}
          {channel === 'telegram' && telegramChatId && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.15em] text-green-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Connected
            </div>
          )}
        </Row>
      </div>

      {/* Browser push — separate section below channel selector */}
      <div className="mt-6 pt-5 border-t border-white/[0.07]">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-3.5 h-3.5 text-white/50" />
          <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-white/50">
            Browser Push
          </span>
        </div>
        <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <Suspense fallback={<div className="text-xs text-white/30 font-mono">Loading…</div>}>
            <PushToggle />
          </Suspense>
        </div>
      </div>

      <p className="text-[11px] text-white/30 mt-6 leading-relaxed">
        Changes save automatically. Telegram + browser-push need a one-off setup.
      </p>
    </div>
  );
}

function Row({ icon: Icon, label, blurb, selected, saving, badge, onClick, children }) {
  return (
    <div
      className="rounded-lg p-4 cursor-pointer transition-all"
      style={{
        background: selected ? 'rgba(200,150,44,0.08)' : 'rgba(255,255,255,0.02)',
        boxShadow: selected ? `inset 0 0 0 1.5px ${GOLD}` : 'none',
      }}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-1 w-4 h-4 rounded-full flex-shrink-0 transition-colors"
          style={{
            border: `1.5px solid ${selected ? GOLD : 'rgba(255,255,255,0.25)'}`,
            background: selected ? GOLD : 'transparent',
            boxShadow: selected ? `0 0 0 3px ${BG}, 0 0 0 4.5px ${GOLD}` : 'none',
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="w-3.5 h-3.5" style={{ color: selected ? GOLD : 'rgba(255,255,255,0.5)' }} />
            <span
              className="text-[13px] font-mono uppercase tracking-[0.16em] font-bold"
              style={{ color: selected ? GOLD : '#fff' }}
            >
              {label}
            </span>
            {saving && <Loader2 className="w-3 h-3 animate-spin text-white/40" />}
            {badge && (
              <span className="ml-auto text-[10px] font-mono uppercase tracking-[0.15em] text-green-400">
                {badge}
              </span>
            )}
          </div>
          <p className="text-[12px] text-white/55 mt-0.5 leading-snug">{blurb}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
