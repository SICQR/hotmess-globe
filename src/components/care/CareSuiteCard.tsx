/**
 * CareSuiteCard — Home surface for the safety stack.
 *
 * Doctrine 11 invariants this card enforces:
 *   - The flows are paid; the assurance is universal.
 *   - Care outranks commerce.
 *
 * The card MUST appear for every authenticated user regardless of tier.
 * Activation is tier-gated. Visibility is not.
 *
 * Status surfaces operational state (active / inactive) the way a battery
 * indicator does — no marketing, no fear, no upsell language. The user
 * understands the system has a real state, not a marketed promise.
 *
 * Phil 2026-05-29.
 */
import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useUserBenefits } from '@/hooks/useUserBenefits';

const GOLD = '#C8962C';
const MUTED = 'rgba(255,255,255,0.45)';

type CareCohort = 'beta' | 'paid' | 'free';

function deriveCohort(benefits: any): CareCohort {
  if (benefits?.beta_cohort_active) return 'beta';
  if (benefits?.has_messaging) return 'paid';
  return 'free';
}

function activationCopy(cohort: CareCohort): string {
  // Doctrine 11: gate copy must read operational, NOT paywall.
  // "Available with HOTMESS" is forbidden — that's SaaS energy.
  if (cohort === 'free') return 'Rolling out during beta';
  return 'Set up →';
}

export default function CareSuiteCard({ onOpen }: { onOpen: () => void }) {
  const benefits = useUserBenefits();
  const cohort = deriveCohort(benefits);
  const [trustedCount, setTrustedCount] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !alive) return;
        const { count } = await supabase
          .from('trusted_contacts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);
        if (alive) setTrustedCount(count ?? 0);
      } catch {
        if (alive) setTrustedCount(0); // fail-safe: treat as inactive
      }
    })();
    return () => { alive = false; };
  }, []);

  // Active = at least one trusted contact configured.
  // Future: also require notification channel verified. Keeping the bar
  // honest-to-state for slice 1 — the dispatcher discipline ships in slice 2.
  const isActive = (trustedCount ?? 0) > 0;
  const canActivate = cohort !== 'free';

  const handleTap = () => {
    if (!canActivate) {
      // Quiet no-op for free tier (the explainer can still fire if we want).
      // Slice 1: tap on disabled state still opens the explainer sheet so the
      // user can READ what the suite does — visibility universal.
      onOpen();
      return;
    }
    onOpen();
  };

  return (
    <section className="px-5 pb-5">
      <button
        onClick={handleTap}
        className="w-full rounded-2xl p-4 text-left active:scale-[0.99] transition-transform"
        style={{
          background: '#141416',
          border: `1px solid rgba(200,150,44,0.${isActive ? '22' : '10'})`,
        }}
        aria-label="Care Suite"
      >
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: isActive ? 'rgba(200,150,44,0.12)' : 'rgba(255,255,255,0.04)',
              border: `1px solid rgba(200,150,44,0.${isActive ? '30' : '15'})`,
            }}
          >
            <ShieldCheck className="w-4 h-4" style={{ color: GOLD, opacity: isActive ? 1 : 0.55 }} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-[14px] leading-tight">Care Suite</p>

            {/* Three-line body — minimum chrome */}
            <div className="mt-2 space-y-0.5">
              <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.62)' }}>
                Trusted contacts.
              </p>
              <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.62)' }}>
                Silent SOS.
              </p>
              <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.62)' }}>
                Aftercare check-ins.
              </p>
            </div>

            {/* Status row + CTA — battery-indicator pattern */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: isActive ? '#30D158' : 'rgba(255,255,255,0.25)',
                  }}
                  aria-hidden
                />
                <span
                  className="text-[11px] uppercase tracking-[0.14em] font-medium"
                  style={{ color: isActive ? '#30D158' : MUTED }}
                >
                  Status: {trustedCount === null ? '…' : isActive ? 'active' : 'inactive'}
                </span>
              </div>

              <span
                className="text-[11px] font-medium"
                style={{
                  color: canActivate ? GOLD : MUTED,
                  letterSpacing: '0.04em',
                }}
              >
                {isActive ? 'Manage →' : activationCopy(cohort)}
              </span>
            </div>
          </div>
        </div>
      </button>
    </section>
  );
}
