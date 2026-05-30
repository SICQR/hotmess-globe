/**
 * CareSuiteExplainer — short sheet describing what's in the Care Suite.
 *
 * Three rows. One per feature. Infrastructure tone. No fear, no sales.
 *
 * Phil 2026-05-29.
 */
import React from 'react';
import { Users, ShieldAlert, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

const GOLD = '#C8962C';
const MUTED = 'rgba(255,255,255,0.55)';

type Cohort = 'beta' | 'paid' | 'free';

function ctaCopy(cohort: Cohort) {
  if (cohort === 'free') return 'Rolling out during beta';
  return 'Set up trusted contacts';
}

export default function CareSuiteExplainer({
  cohort = 'beta',
  onSetup,
  onClose,
}: {
  cohort?: Cohort;
  onSetup: () => void;
  onClose: () => void;
}) {
  const canSetup = cohort !== 'free';
  return (
    <div className="px-6 py-8" style={{ color: '#fff' }}>
      <p className="text-[10px] font-medium uppercase tracking-[0.3em] mb-1" style={{ color: GOLD }}>
        Care Suite
      </p>
      <h2 className="text-[22px] font-medium leading-tight">The system that's protecting you.</h2>
      <p className="text-[13px] mt-2" style={{ color: MUTED }}>
        Always on for every account. Activation is set up by you.
      </p>

      <div className="mt-7 space-y-5">
        <Row
          icon={<Users className="w-4 h-4" style={{ color: GOLD }} />}
          title="Trusted contacts"
          body="The people who hear if something goes off. Telegram first, SMS as fallback. Up to 3 during beta."
        />
        <Row
          icon={<ShieldAlert className="w-4 h-4" style={{ color: GOLD }} />}
          title="Silent SOS"
          body="One tap from anywhere. No noise. Your trusted contacts get a quiet ping with your last-known approximate location."
        />
        <Row
          icon={<Heart className="w-4 h-4" style={{ color: GOLD }} />}
          title="Aftercare check-ins"
          body="A gentle check after a meetup. Skip it, snooze it, or confirm you're good. No pressure — just a soft anchor."
        />
      </div>

      <div className="mt-8 flex flex-col gap-2">
        <Button
          onClick={canSetup ? onSetup : onClose}
          className="w-full h-12 rounded-2xl text-sm font-medium"
          style={{
            background: canSetup ? GOLD : 'rgba(255,255,255,0.06)',
            color: canSetup ? '#000' : MUTED,
          }}
          aria-label={ctaCopy(cohort)}
        >
          {ctaCopy(cohort)}
        </Button>
        <Button
          onClick={onClose}
          className="w-full h-11 rounded-2xl text-sm font-medium"
          style={{ background: 'transparent', color: MUTED }}
        >
          Not now
        </Button>
      </div>
    </div>
  );
}

function Row({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5"
        style={{ background: 'rgba(200,150,44,0.10)', border: '1px solid rgba(200,150,44,0.20)' }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-[14px] leading-tight">{title}</p>
        <p className="text-[12.5px] mt-1 leading-snug" style={{ color: MUTED }}>{body}</p>
      </div>
    </div>
  );
}
