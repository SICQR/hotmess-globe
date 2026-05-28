/**
 * NotificationsScreen — last step of v6 onboarding.
 *
 * Brief: Cowork dispatch T5 (Phil 2026-05-26). Wires the notification
 * channel selector into onboarding so new users pick how to be reached
 * before they land on /pulse.
 *
 * Doctrine (Phil 2026-05-26): opt-in only, no pre-selection, SKIP always
 * available, no dark patterns. Browser push is offered in Settings, NOT
 * here — onboarding only sets the external channel preference.
 */
import React, { useState } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { track } from '@/lib/analytics';

const GOLD = '#C8962C';

export default function NotificationsScreen({ session, onComplete, onBack }) {
  const userId = session?.user?.id;
  const [selected, setSelected] = useState(null); // 'none' | 'whatsapp' | 'telegram'
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const writeChannelAndContinue = async (channel) => {
    if (!userId || saving) return;
    setSaving(true);
    setError('');
    try {
      const update = { notification_channel: channel };
      const { error: dbErr } = await supabase
        .from('profiles')
        .update(update)
        .eq('id', userId);
      if (dbErr) {
        setError('Could not save. Try again.');
        setSaving(false);
        return;
      }
      track('onboarding_notification_channel_set', 'onboarding', channel);
      onComplete();
    } catch {
      setError('Something went wrong.');
      setSaving(false);
    }
  };

  const handleSkip = () => writeChannelAndContinue('none');

  const handleContinue = () => {
    if (!selected) {
      setError('Pick one — or tap Skip.');
      return;
    }
    writeChannelAndContinue(selected);
  };

      const update = { notification_channel: channel };  return (
    <div className="min-h-screen bg-[#050507] text-white flex flex-col">
      {onBack && (
        <div className="px-4 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="text-[12px] uppercase tracking-wider text-white/40 hover:text-white/60"
          >
            ← Back
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center px-6 py-8 max-w-md mx-auto w-full">
        <header className="mb-8 text-center">
          <Bell className="w-8 h-8 mx-auto mb-3" style={{ color: GOLD }} />
          <h1 className="text-2xl font-black tracking-tight uppercase">When does HOTMESS reach out?</h1>
          <p className="text-white/45 text-[13px] mt-2 leading-snug">
            Only three reasons. Pick how — or stay in-app only.
          </p>
          {/* Phase 1 conversion repair (Phil 2026-05-28): 65% of users
              picked 'none' because they didn't know what would trigger a
              message. Tell them up-front. */}
          <ul className="text-white/55 text-[12px] mt-4 leading-snug text-left max-w-[280px] mx-auto space-y-1.5">
            <li className="flex gap-2"><span style={{color: GOLD}}>·</span>Someone you boo'd boos you back</li>
            <li className="flex gap-2"><span style={{color: GOLD}}>·</span>Your SOS contacts ping during a chain</li>
            <li className="flex gap-2"><span style={{color: GOLD}}>·</span>An aftercare check-in you opted into</li>
          </ul>
          <p className="text-white/30 text-[11px] mt-3">
            That's it. Nothing else. Marketing is never one of them.
          </p>
        </header>

        <div className="flex flex-col gap-2.5">
          <Option
            label="In-app only"
            subline="Notifications appear in the bell. No external messages."
            icon={<Bell className="w-4 h-4" />}
            selected={selected === 'none'}
            onClick={() => setSelected('none')}
          />

          {/* M11 (Phil 2026-05-28): WhatsApp + Telegram options stripped from
              onboarding until the general-purpose dispatcher honors
              profile.notification_channel for non-safety notification types.
              Safety dispatcher does honor them; boo / aftercare / general do
              not. Promising channels we can't reliably deliver = Sacred
              Invariant #4 violation. Restore options when M11-followup ships
              the channel routing wire. Both channels remain available from
              Settings → Notifications for users who actively opt in there. */}
        </div>

        {error && (
          <div className="mt-4 text-[12px] text-red-400/85">{error}</div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleSkip}
            disabled={saving}
            className="text-[12px] uppercase tracking-wider text-white/40 hover:text-white/70 disabled:opacity-50"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 h-11 rounded-full text-[12px] font-black uppercase tracking-wider disabled:opacity-50"
            style={{ background: GOLD, color: '#000' }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "I'm in"}
          </button>
        </div>

        <p className="text-[10px] text-white/25 text-center mt-6 leading-snug">
          Browser notifications can be enabled later in Settings.
        </p>
      </div>
    </div>
  );
}

function Option({ label, subline, icon, selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl p-3.5 transition-colors"
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
