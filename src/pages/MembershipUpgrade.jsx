import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/components/utils/supabaseClient';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '../utils';

import {
  HERO_MOVE_DEEPER,
  TIER_ROWS,
  CONFIRMATION_LANDED,
  CANCELLATION_CONFIRMED,
  CHECKOUT_CANCELLED_MID_FLOW,
  CHECKOUT_SESSION_FAILED,
  CHECKOUT_AUTH_REQUIRED,
  CANCELLATION_FAILED,
  CANCELLATION_MODAL_TITLE,
  CANCELLATION_MODAL_BODY,
  CANCELLATION_MODAL_KEEP,
  CANCELLATION_MODAL_CONFIRM,
  SUBSCRIPTION_TERMS,
  PAYMENT_SECURITY,
} from '@/lib/lang/upgrade';

/**
 * MembershipUpgrade — /upgrade route.
 *
 * Doctrine: D35 — Language Operating System §3.4 SurfaceMeta declaration.
 *
 * SURFACE_META below declares the page's tonal contract. The page mixes
 * two surface layers by design:
 *
 *   - The hero + the MESS / HOTMESS consumer tier rows are Layer B,
 *     energy 5, intent `invitation_to_participate`. This is the
 *     part of the page that lives closest to nightlife: an open door
 *     into deeper participation in the network.
 *   - The CONNECTED / PROMOTER / VENUE operator tier rows are
 *     Layer A, energy 2-3, intent `operational_access`. These tiers
 *     describe operational capability — selling, running nights,
 *     running a venue — and per Phil's classification (D35
 *     2026-05-31 amendment) they need infrastructure trust, not
 *     nightlife poetry. A £99/month VENUE operator reads the
 *     VENUE row at the lowest energy on the whole page.
 *   - The Stripe checkout transition, the cancellation flow, and
 *     every toast string are Layer A, energy 1, intent
 *     `reassurance` / `respectful_acknowledgment`. They are the
 *     load-bearing infrastructure of the page and they speak
 *     accordingly: direct, low-theatre, no "premium features"
 *     framing, no "we'll miss you" manipulation.
 *
 * The SurfaceMeta declared here is the page-level contract; the
 * mixed-layer reality is captured row-by-row in TIER_ROWS from
 * src/lib/lang/upgrade.ts. Future lint rules read both.
 *
 * Phil 2026-05-31 — PR #761, the first real purge of the old platform
 * psychology. Replaces the BASIC / PLUS / CHROME / "Night King
 * Challenge" / "Stealth Mode" / "Premium support" / "Custom profile
 * gradient" surface that predated D35 entirely.
 *
 * Stripe wiring (the create-checkout-session API call, the
 * cancel-subscription API call, the success/canceled URL handling,
 * the dev-mode fallback) is preserved verbatim. Only the philosophy
 * and the tier identity have changed.
 */
export const SURFACE_META = /** @type {const} */ ({
  tone_layer: 'B', // hero + consumer rows govern the page; operator rows are tightened per-row
  energy_level: 5, // page-level band; operator rows drop to 2-3, transaction surfaces drop to 1
  emotional_intent: 'invitation_to_participate',
  inherits: ['D02', 'D04', 'D05', 'D21', 'D22', 'D28', 'D31'],
});

// ─────────────────────────────────────────────────────────────────────────────
// Canonical tier-id normalisation.
//
// The DB historically stored 'basic' and 'free' as the free tier; the
// canonical name post-tier-truth-PR is 'mess'. Always normalise on read.
// ─────────────────────────────────────────────────────────────────────────────
const normaliseTierId = (raw) => {
  if (raw === 'basic' || raw === 'free' || !raw) return 'mess';
  return raw;
};

// Per-tier accent colour. Keep the gold/cyan/purple identity from the
// MembershipBadge, but consciously NOT used to denote prestige — the
// colour is identity, not hierarchy. VENUE is amber-red because it is
// the operator-anchor tier; PROMOTER is purple because it is
// orchestration; CONNECTED is cyan because it is commerce access.
const TIER_ACCENT = {
  mess: '#FFFFFF',
  hotmess: '#C8962C',
  connected: '#22D3EE', // cyan
  promoter: '#A78BFA', // purple
  venue: '#EF4444', // amber-red anchor
};

export default function MembershipUpgrade() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        let { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          user = null;
        } else {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          user = {
            ...user,
            ...(profile || {}),
            auth_user_id: user.id,
            email: user.email || profile?.email,
          };
        }
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();

    // Handle Stripe redirect — Layer A reassurance / acknowledgment toasts.
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');

    if (success === 'true') {
      toast.success(CONFIRMATION_LANDED);
      navigate(createPageUrl('MembershipUpgrade'), { replace: true });
    } else if (canceled === 'true') {
      toast(CHECKOUT_CANCELLED_MID_FLOW);
      navigate(createPageUrl('MembershipUpgrade'), { replace: true });
    }
  }, [searchParams, navigate]);

  const handleStepInto = async (tierId) => {
    if (tierId === 'mess') {
      // Stepping "down" to MESS = cancel flow; route through the modal.
      setShowCancelModal(true);
      return;
    }

    const tier = TIER_ROWS.find((t) => t.id === tierId);
    if (!tier) return;

    setLoading(true);
    setSelectedTier(tierId);

    try {
      const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      const priceId = tier.stripePriceIdEnvVar
        ? import.meta.env[tier.stripePriceIdEnvVar]
        : null;

      if (stripeKey && priceId) {
        const { data: { session: authSession } } = await supabase.auth.getSession();
        const token = authSession?.access_token;

        if (!token) {
          toast.error(CHECKOUT_AUTH_REQUIRED);
          setLoading(false);
          setSelectedTier(null);
          return;
        }

        const response = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            priceId,
            tierId,
            successUrl: `${window.location.origin}${createPageUrl('MembershipUpgrade')}?success=true`,
            cancelUrl: `${window.location.origin}${createPageUrl('MembershipUpgrade')}?canceled=true`,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create checkout session');
        }

        if (result?.url) {
          window.location.href = result.url;
          return;
        }
      }

      // Dev-mode fallback: write the tier directly. Logged so it is
      // never silently invoked in production. Layer A toast.
      console.warn(
        '[MembershipUpgrade] Stripe price not configured for tier',
        tierId,
        '— updating profile directly (dev mode only).',
      );
      const updatePayload = { membership_tier: tierId };
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.auth.updateUser({ data: updatePayload });
      await supabase.from('profiles').update(updatePayload).eq('id', user.id);

      toast.success(CONFIRMATION_LANDED);
      navigate(createPageUrl('Profile'));
    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error(CHECKOUT_SESSION_FAILED);
    } finally {
      setLoading(false);
      setSelectedTier(null);
    }
  };

  const handleCancelSubscription = async () => {
    setLoading(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const token = authSession?.access_token;

      if (!token) {
        toast.error(CHECKOUT_AUTH_REQUIRED);
        return;
      }

      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel subscription');
      }

      // Mirror the cancel locally — drop back to MESS at end of period.
      const updatePayload = { membership_tier: 'mess' };
      let { data: { user } } = await supabase.auth.getUser();
      await supabase.auth.updateUser({ data: updatePayload });
      await supabase.from('profiles').update(updatePayload).eq('id', user.id);

      toast.success(CANCELLATION_CONFIRMED);
      setShowCancelModal(false);

      // Refresh local user state.
      const updatedUser = { ...user };
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        Object.assign(updatedUser, profile || {}, {
          auth_user_id: user.id,
          email: user.email || profile?.email,
        });
      }
      setCurrentUser(updatedUser);
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error(CANCELLATION_FAILED);
    } finally {
      setLoading(false);
    }
  };

  const currentTier = normaliseTierId(currentUser?.membership_tier);
  const hasActiveSubscription = currentTier !== 'mess';

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="mb-6 text-white/60 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Hero — Layer B, energy 5, invitation_to_participate.
            No urgency, no theatre, no pricing in the hero, no
            "UPGRADE YOUR NIGHT" caps-into-italics noise.

            Phil swagger pass (2026-05-31): no subtitle. The hero stands
            alone above the tier grid by design. "A strong HOTMESS line
            should sometimes be allowed to sit in silence. That silence
            creates authority." The grid below is the answer; another
            sentence dilutes the energy. */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
            {HERO_MOVE_DEEPER}
          </h1>
        </motion.div>

        {/*
          Tier card hierarchy — Phil's 2026-05-31 amendment to D35 §3.4.
          Each card runs:
            1. Identity (tier name, accent-coloured)
            2. Why this tier exists — step-into line, the emotional centre,
               the largest copy block on the card. Italic for Layer B
               consumer tiers; plain for Layer A operator tiers.
            3. Role chip — a single phrase naming the relationship to
               the ecosystem (Open entry / Full participation /
               Commerce access / Event orchestration / Infrastructure
               presence). Subtle, not status.
            4. Capability prose — a single supporting paragraph
               (deliberately NOT a bulleted feature checklist; the
               checklist layout is one of the quietest ways SaaS drift
               sneaks back in).
            5. Price + action — at the bottom, functional, quiet.
          The goal: the eye lands on WHY this tier exists, not on a
          feature competition between the columns.
        */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {TIER_ROWS.map((tier, idx) => {
            const accent = TIER_ACCENT[tier.id] || '#FFFFFF';
            const isCurrentTier = currentTier === tier.id;
            const isOperatorTier = tier.tone_layer === 'A';

            return (
              <motion.div
                key={tier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="bg-black border-2 p-5 md:p-6 h-full flex flex-col"
                style={
                  isCurrentTier
                    ? { borderColor: accent, boxShadow: `0 0 20px ${accent}40` }
                    : { borderColor: 'rgba(255,255,255,0.15)' }
                }
              >
                {/* 1. Identity */}
                <h2
                  className="text-xl md:text-2xl font-black uppercase leading-none break-words mb-4"
                  style={{ color: accent }}
                >
                  {tier.displayName}
                </h2>

                {/* 2. Step-into line — the emotional centre of the card.
                       Layer B consumer tiers (MESS, HOTMESS) read italic
                       to carry the seductive register. Layer A operator
                       tiers (CONNECTED, PROMOTER, VENUE) read plain to
                       carry the operational trust register. */}
                <p
                  className={
                    isOperatorTier
                      ? 'text-white/90 text-base leading-relaxed mb-5'
                      : 'text-white/90 text-base italic leading-relaxed mb-5'
                  }
                >
                  {tier.stepIntoLine}
                </p>

                {/* 3. Role chip — the single-phrase relationship. */}
                <div
                  className="self-start inline-block px-2.5 py-1 border border-white/15 text-[10px] uppercase tracking-[0.2em] text-white/55 mb-5"
                >
                  {tier.roleLine}
                </div>

                {/* 4. Capability — supporting prose, single paragraph,
                       deliberately NOT a bulleted feature list. */}
                <p className="text-xs text-white/45 leading-relaxed mb-6 flex-1">
                  {tier.capabilityLine}
                </p>

                {/* 5. Price + action — at the bottom, quiet. The price is
                       not the hook; it is the contractual fact. */}
                <div className="mt-auto">
                  <p className="text-white/65 text-sm mb-3 font-medium">
                    {tier.priceLabel}
                  </p>
                  <Button
                    onClick={() => handleStepInto(tier.id)}
                    disabled={isCurrentTier || loading}
                    className={`w-full font-bold tracking-wide border-2 ${
                      isCurrentTier
                        ? 'bg-white/10 text-white/50 border-white/15 cursor-not-allowed'
                        : 'text-black border-white hover:bg-white/90'
                    }`}
                    style={!isCurrentTier ? { backgroundColor: accent } : {}}
                  >
                    {isCurrentTier ? (
                      'You are here'
                    ) : loading && selectedTier === tier.id ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Opening checkout
                      </span>
                    ) : tier.id === 'mess' ? (
                      'Step back to MESS'
                    ) : (
                      `Step into ${tier.displayName}`
                    )}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Subscription footer — Layer A, energy 1. */}
        <div className="mt-10 bg-white/[0.04] border border-white/10 p-5 text-center rounded">
          <p className="text-white/70 text-sm mb-3">{SUBSCRIPTION_TERMS}</p>
          {hasActiveSubscription && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="text-white/50 hover:text-white text-sm underline underline-offset-4"
            >
              Cancel subscription
            </button>
          )}
        </div>

        {/* Payment security — Layer A. */}
        <div className="mt-4 text-center">
          <p className="text-white/35 text-xs">{PAYMENT_SECURITY}</p>
        </div>
      </div>

      {/* Cancel Subscription Modal — Layer A, energy 1,
          respectful_acknowledgment. No "we'll miss you," no
          "are you sure you want to leave us," no "premium" framing. */}
      {showCancelModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black border-2 border-white/20 p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{CANCELLATION_MODAL_TITLE}</h3>
              <button
                onClick={() => setShowCancelModal(false)}
                className="p-2 hover:bg-white/10 rounded-full"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-white/75 mb-6 text-sm leading-relaxed">
              {CANCELLATION_MODAL_BODY}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowCancelModal(false)}
                variant="outline"
                className="flex-1 border-white/20"
              >
                {CANCELLATION_MODAL_KEEP}
              </Button>
              <Button
                onClick={handleCancelSubscription}
                disabled={loading}
                className="flex-1 bg-white/10 border-2 border-white/25 hover:bg-white/15 text-white"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  CANCELLATION_MODAL_CONFIRM
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
