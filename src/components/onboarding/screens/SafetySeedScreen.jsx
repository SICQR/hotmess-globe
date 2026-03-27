/**
 * SafetySeedScreen — Trusted contact + fake call caller seed.
 * Uses user_email for RLS on trusted_contacts.
 * Uses user_id for fake_call_callers.
 *
 * Props:
 *   session      — Supabase session (onboarding path passes this in)
 *   onComplete   — called when done in onboarding flow
 *   onBack       — called to go back in onboarding flow
 *   standalone   — true when mounted at /safety/setup (post-activation)
 *                  In standalone mode: fetches its own session, shows a back
 *                  button, navigates to /safety on completion, shows a toast,
 *                  and does NOT write onboarding_stage.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { Loader2, Shield, ArrowLeft } from 'lucide-react';
import { ProgressDots } from './AgeGateScreen';
import OnboardingBackButton from '../OnboardingBackButton';

const GOLD = '#C8962C';

export default function SafetySeedScreen({ session: sessionProp, onComplete, onBack, standalone = false }) {
  const navigate = useNavigate();
  const [session, setSession] = useState(sessionProp || null);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // In standalone mode we fetch our own session since no parent passes one in
  useEffect(() => {
    if (standalone && !sessionProp) {
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        if (s) setSession(s);
      });
    }
  }, [standalone, sessionProp]);

  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  const handleSubmit = async (skip = false) => {
    setLoading(true);
    try {
      if (!skip && contactName.trim() && contactPhone.trim() && userEmail) {
        // Write trusted contact
        await supabase.from('trusted_contacts').insert({
          user_email: userEmail,
          contact_name: contactName.trim(),
          contact_email: null,
          contact_phone: contactPhone.trim(),
          notify_on_sos: true,
          notify_on_checkout: true,
        });

        // Seed default fake call caller
        await supabase.from('fake_call_callers').insert({
          user_id: userId,
          name: 'Hotmess',
          relationship: 'app',
          is_preset: true,
          personality: 'concerned_friend',
          scripts: {
            opening: "Hey, you ok? I've been trying to reach you.",
            followup: "I'm outside, come out when you can.",
          },
        });
      }

      if (standalone) {
        // Post-activation path: no onboarding_stage write, toast + navigate
        if (!skip) {
          await supabase
            .from('profiles')
            .update({ safety_opt_in: true, updated_at: new Date().toISOString() })
            .eq('id', userId);
          toast.success('Safety profile updated');
        }
        navigate('/safety');
      } else {
        // Onboarding path: advance stage and call parent
        await supabase
          .from('profiles')
          .update({
            safety_opt_in: !skip,
            onboarding_stage: 'location',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);
        onComplete();
      }
    } catch (err) {
      console.error('[SafetySeed] error:', err);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = contactName.trim().length > 0 && contactPhone.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6">
      {standalone ? (
        <button
          onClick={() => navigate(-1)}
          className="absolute top-14 left-5 flex items-center gap-1 text-white/40 hover:text-white transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      ) : (
        <OnboardingBackButton onBack={onBack} />
      )}
      <div className="w-full max-w-xs">
        {!standalone && <ProgressDots current={5} total={5} />}

        {/* Safety card */}
        <div
          className="rounded-xl p-6 mb-8"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <Shield className="w-8 h-8 mb-4" style={{ color: GOLD }} />
          <h2 className="text-white text-lg font-bold mb-2">
            Hotmess has your back.
          </h2>
          <p className="text-white/50 text-sm leading-relaxed">
            Add a trusted contact to activate check-ins, SOS alerts, and fake call cover.
          </p>
        </div>

        {/* Contact fields */}
        <div className="mb-4">
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Contact name"
            className="w-full bg-black text-white py-3 border-b border-[#333] focus:outline-none text-base placeholder:text-white/25"
            style={{ borderBottomColor: contactName ? GOLD : '#333' }}
            autoComplete="off"
          />
        </div>

        <div className="mb-10">
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="Contact phone"
            className="w-full bg-black text-white py-3 border-b border-[#333] focus:outline-none text-base placeholder:text-white/25"
            style={{ borderBottomColor: contactPhone ? GOLD : '#333' }}
            autoComplete="tel"
          />
        </div>

        {/* CTAs */}
        <button
          onClick={() => handleSubmit(false)}
          disabled={!canSubmit || loading}
          className="w-full py-4 rounded-lg text-black font-bold text-base tracking-wide flex items-center justify-center gap-2 transition-opacity mb-3"
          style={{
            backgroundColor: GOLD,
            opacity: canSubmit && !loading ? 1 : 0.3,
          }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Add & Continue'}
        </button>

        <button
          onClick={() => standalone ? navigate('/safety') : handleSubmit(true)}
          disabled={loading}
          className="w-full py-3 text-sm font-medium"
          style={{ color: 'rgba(255,255,255,0.3)' }}
        >
          {standalone ? 'Not now' : 'Skip for now'}
        </button>
      </div>
    </div>
  );
}
