/**
 * AcceptTrustedContact — D59 S2 — Acceptance landing page.
 *
 * Reached at /contact/accept/:id?token=...&exp=...
 *
 * The recipient is ANONYMOUS — they do not have a HOTMESS account, and
 * accepting must NOT require one (Safety Constitution: account-free
 * acceptance invariant).
 *
 * Flow:
 *   1. Mount → POST {action:'preview'} to /api/safety/accept-token
 *      Renders nominator display name + relationship + the disclaimer.
 *   2. Recipient picks Accept or Decline.
 *      - Accept → form asking them to confirm THEIR OWN contact details
 *        (phone, Telegram, WhatsApp, email) and pick channel order. These
 *        become source of truth for SOS dispatch (D59 Recipient Identity
 *        Ownership amendment).
 *      - Decline → optional reason text (D60 §C.6 dignified decline).
 *   3. Submit → POST {action} to the same endpoint.
 *   4. Done → confirmation screen, no app navigation (no account).
 *
 * Tone: HOTMESS Care Language (D15) — infrastructural, calm, honest.
 * NOT emergency services.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const TOKENS = {
  ink: '#050507',
  gold: '#C8962C',
  care: '#3A464D',
  warn: '#B25A3A',
};

const DISCLAIMER =
  'HOTMESS Safety helps notify people someone trusts. It is not emergency services. ' +
  'If you receive an alert and there is immediate danger, call your local emergency number.';

const CHANNEL_LABELS = {
  telegram: 'Telegram',
  sms: 'SMS / Phone',
  whatsapp: 'WhatsApp',
  email: 'Email',
};
const ALL_CHANNELS = ['telegram', 'sms', 'whatsapp', 'email'];

const RELATIONSHIP_LABEL = {
  daddy: 'their Daddy',
  friend: 'a friend',
  flatmate: 'their flatmate',
  club_contact: 'a club contact',
  emergency: 'an emergency contact',
  contact: 'a trusted contact',
};

async function postEndpoint(body) {
  const res = await fetch('/api/safety/accept-token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* ignore */
  }
  return { ok: res.ok, status: res.status, body: json || {} };
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span
        className="block text-[10px] uppercase tracking-[0.3em] mb-2"
        style={{ color: TOKENS.gold }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span className="block mt-1.5 text-[11px] text-white/40 leading-snug">
          {hint}
        </span>
      )}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full bg-black/40 border border-white/10 rounded-lg px-3.5 py-2.5
                 text-[15px] text-white placeholder-white/25 outline-none
                 focus:border-[#C8962C]/60 transition-colors"
    />
  );
}

export default function AcceptTrustedContact() {
  const { id: trustedContactId } = useParams();
  const [search] = useSearchParams();
  const token = search.get('token') || '';
  const exp = search.get('exp') || '';

  const [phase, setPhase] = useState('loading'); // loading | error | choose | accept | decline | done
  const [error, setError] = useState(null);
  const [doneAction, setDoneAction] = useState(null); // 'accepted' | 'declined'
  const [preview, setPreview] = useState(null);

  // Accept-form state
  const [confirmedPhone, setConfirmedPhone] = useState('');
  const [confirmedTelegram, setConfirmedTelegram] = useState('');
  const [confirmedWhatsapp, setConfirmedWhatsapp] = useState('');
  const [confirmedEmail, setConfirmedEmail] = useState('');
  const [channelOrder, setChannelOrder] = useState(ALL_CHANNELS);
  const [submitting, setSubmitting] = useState(false);

  // Decline-form state
  const [declineReason, setDeclineReason] = useState('');

  const baseBody = useMemo(
    () => ({
      trusted_contact_id: trustedContactId,
      token,
      exp,
    }),
    [trustedContactId, token, exp]
  );

  // Initial preview load.
  useEffect(() => {
    if (!trustedContactId || !token || !exp) {
      setPhase('error');
      setError('This invitation link is incomplete. Ask the person who sent it to resend.');
      return;
    }
    let cancelled = false;
    (async () => {
      const r = await postEndpoint({ ...baseBody, action: 'preview' });
      if (cancelled) return;
      if (!r.ok) {
        setPhase('error');
        setError(
          r.body?.error === 'invalid_or_expired_token'
            ? 'This invitation link has expired or is invalid. Ask the person who sent it to resend.'
            : 'We could not load this invitation. Please try again in a moment.'
        );
        return;
      }
      setPreview(r.body);
      if (r.body.state === 'accepted') {
        setDoneAction('accepted');
        setPhase('done');
      } else if (r.body.state === 'declined') {
        setDoneAction('declined');
        setPhase('done');
      } else {
        setPhase('choose');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trustedContactId, token, exp, baseBody]);

  function moveChannel(idx, delta) {
    setChannelOrder((prev) => {
      const next = [...prev];
      const target = idx + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  async function submitAccept() {
    setSubmitting(true);
    setError(null);
    const r = await postEndpoint({
      ...baseBody,
      action: 'accept',
      confirmed_phone: confirmedPhone.trim(),
      confirmed_telegram_handle: confirmedTelegram.trim(),
      confirmed_whatsapp: confirmedWhatsapp.trim(),
      confirmed_email: confirmedEmail.trim(),
      channel_preference_order: channelOrder,
    });
    setSubmitting(false);
    if (!r.ok) {
      setError(
        r.body?.error || 'We could not save your acceptance. Please try again.'
      );
      return;
    }
    setDoneAction('accepted');
    setPhase('done');
  }

  async function submitDecline() {
    setSubmitting(true);
    setError(null);
    const r = await postEndpoint({
      ...baseBody,
      action: 'decline',
      decline_reason: declineReason.trim().slice(0, 500),
    });
    setSubmitting(false);
    if (!r.ok) {
      setError(
        r.body?.error || 'We could not record your decline. Please try again.'
      );
      return;
    }
    setDoneAction('declined');
    setPhase('done');
  }

  const nominator = preview?.nominator_name || 'A HOTMESS member';
  const contactName = preview?.contact_name;
  const relLabel = preview?.relationship
    ? RELATIONSHIP_LABEL[preview.relationship] || 'a trusted contact'
    : 'a trusted contact';

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{ background: TOKENS.ink, color: 'white' }}
    >
      {/* Header */}
      <header className="px-5 pt-8 pb-6 border-b border-white/5">
        <p
          className="text-[10px] uppercase tracking-[0.4em] mb-2"
          style={{ color: TOKENS.gold }}
        >
          HOTMESS · Trusted contact
        </p>
        <h1 className="text-xl font-semibold leading-tight">
          You've been asked to be someone's trusted contact.
        </h1>
      </header>

      {/* Body */}
      <main className="flex-1 px-5 py-7 max-w-lg w-full mx-auto">
        {phase === 'loading' && (
          <p className="text-sm text-white/55">Loading invitation…</p>
        )}

        {phase === 'error' && (
          <div className="space-y-4">
            <p className="text-sm text-white/80 leading-relaxed">{error}</p>
            <p className="text-xs text-white/40 leading-relaxed">{DISCLAIMER}</p>
          </div>
        )}

        {phase === 'choose' && (
          <div className="space-y-7">
            <section>
              <p className="text-[15px] leading-relaxed text-white/85">
                <span className="text-white font-medium">{nominator}</span> has
                added {contactName ? `"${contactName}"` : 'you'} as {relLabel} on
                HOTMESS.
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-white/65">
                If they ever send an SOS, the people on their trusted-contact
                list get notified. They've nominated you. Accepting means HOTMESS
                may contact you on their behalf if they ask for help.
              </p>
            </section>

            <section
              className="rounded-xl border border-white/10 p-4"
              style={{ background: TOKENS.care + '22' }}
            >
              <p className="text-[11px] uppercase tracking-[0.25em] text-white/55 mb-1.5">
                What this isn't
              </p>
              <p className="text-[13px] leading-relaxed text-white/70">
                {DISCLAIMER}
              </p>
            </section>

            <div className="grid grid-cols-1 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPhase('accept')}
                className="w-full rounded-xl py-3.5 text-[15px] font-semibold tracking-tight
                           transition-opacity hover:opacity-90 active:opacity-80"
                style={{ background: TOKENS.gold, color: TOKENS.ink }}
              >
                Accept — I'll be a trusted contact
              </button>
              <button
                type="button"
                onClick={() => setPhase('decline')}
                className="w-full rounded-xl py-3 text-[14px] font-medium tracking-tight
                           border border-white/15 text-white/70 hover:text-white
                           hover:border-white/30 transition-colors"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {phase === 'accept' && (
          <div className="space-y-6">
            <section>
              <p className="text-[14px] leading-relaxed text-white/70">
                Confirm how HOTMESS should reach you if{' '}
                <span className="text-white">{nominator}</span> sends an SOS.
                You can leave any field blank — we'll only use what you provide.
              </p>
            </section>

            <div className="space-y-5">
              <Field
                label="Phone (SMS)"
                hint="Used for text + voice fallback if Telegram fails."
              >
                <TextInput
                  type="tel"
                  inputMode="tel"
                  placeholder="+44 7…"
                  value={confirmedPhone}
                  onChange={(e) => setConfirmedPhone(e.target.value)}
                />
              </Field>

              <Field
                label="Telegram handle"
                hint="Fastest channel. Just the handle (e.g. yourname)."
              >
                <TextInput
                  type="text"
                  autoCapitalize="off"
                  autoCorrect="off"
                  placeholder="yourhandle"
                  value={confirmedTelegram}
                  onChange={(e) => setConfirmedTelegram(e.target.value)}
                />
              </Field>

              <Field label="WhatsApp number" hint="Optional. Same format as phone.">
                <TextInput
                  type="tel"
                  inputMode="tel"
                  placeholder="+44 7…"
                  value={confirmedWhatsapp}
                  onChange={(e) => setConfirmedWhatsapp(e.target.value)}
                />
              </Field>

              <Field label="Email" hint="Optional. Slower — used as last resort.">
                <TextInput
                  type="email"
                  autoCapitalize="off"
                  autoCorrect="off"
                  placeholder="you@example.com"
                  value={confirmedEmail}
                  onChange={(e) => setConfirmedEmail(e.target.value)}
                />
              </Field>
            </div>

            <section>
              <p
                className="text-[10px] uppercase tracking-[0.3em] mb-2"
                style={{ color: TOKENS.gold }}
              >
                Preferred order
              </p>
              <p className="text-[12px] text-white/45 mb-3 leading-snug">
                We'll try channels top to bottom and stop on the first one that
                reaches you.
              </p>
              <ol className="space-y-2">
                {channelOrder.map((ch, idx) => (
                  <li
                    key={ch}
                    className="flex items-center justify-between bg-black/40
                               border border-white/10 rounded-lg px-3.5 py-2.5"
                  >
                    <span className="text-[14px] text-white/85">
                      <span className="text-white/40 mr-2">{idx + 1}.</span>
                      {CHANNEL_LABELS[ch]}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => moveChannel(idx, -1)}
                        disabled={idx === 0}
                        aria-label={`Move ${CHANNEL_LABELS[ch]} up`}
                        className="w-7 h-7 rounded-md border border-white/15
                                   text-white/60 disabled:opacity-25 disabled:cursor-not-allowed
                                   hover:text-white hover:border-white/30 transition-colors"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveChannel(idx, 1)}
                        disabled={idx === channelOrder.length - 1}
                        aria-label={`Move ${CHANNEL_LABELS[ch]} down`}
                        className="w-7 h-7 rounded-md border border-white/15
                                   text-white/60 disabled:opacity-25 disabled:cursor-not-allowed
                                   hover:text-white hover:border-white/30 transition-colors"
                      >
                        ↓
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {error && (
              <p
                className="text-[13px] rounded-lg px-3 py-2"
                style={{ background: TOKENS.warn + '22', color: TOKENS.warn }}
              >
                {error}
              </p>
            )}

            <div className="grid grid-cols-1 gap-3 pt-2">
              <button
                type="button"
                onClick={submitAccept}
                disabled={submitting}
                className="w-full rounded-xl py-3.5 text-[15px] font-semibold tracking-tight
                           transition-opacity hover:opacity-90 active:opacity-80
                           disabled:opacity-50 disabled:cursor-wait"
                style={{ background: TOKENS.gold, color: TOKENS.ink }}
              >
                {submitting ? 'Confirming…' : 'Confirm acceptance'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setPhase('choose');
                }}
                disabled={submitting}
                className="w-full rounded-xl py-2.5 text-[13px] text-white/55 hover:text-white/80
                           transition-colors disabled:opacity-50"
              >
                Back
              </button>
            </div>

            <p className="text-[11px] text-white/35 leading-relaxed pt-2">
              {DISCLAIMER}
            </p>
          </div>
        )}

        {phase === 'decline' && (
          <div className="space-y-6">
            <section>
              <p className="text-[15px] leading-relaxed text-white/80">
                That's OK. <span className="text-white">{nominator}</span> won't
                be told you said no — only that the invitation didn't go through.
              </p>
              <p className="mt-3 text-[14px] leading-relaxed text-white/55">
                If you'd like to share a brief reason, it'll be passed along
                privately. Optional.
              </p>
            </section>

            <Field
              label="Optional message"
              hint="Max 500 characters. Will only be seen by the person who invited you."
            >
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value.slice(0, 500))}
                rows={4}
                placeholder="e.g. I don't think I'm the right person for this — try someone closer."
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3.5 py-2.5
                           text-[14px] text-white placeholder-white/25 outline-none
                           focus:border-[#C8962C]/60 transition-colors resize-none"
              />
            </Field>

            {error && (
              <p
                className="text-[13px] rounded-lg px-3 py-2"
                style={{ background: TOKENS.warn + '22', color: TOKENS.warn }}
              >
                {error}
              </p>
            )}

            <div className="grid grid-cols-1 gap-3 pt-2">
              <button
                type="button"
                onClick={submitDecline}
                disabled={submitting}
                className="w-full rounded-xl py-3.5 text-[15px] font-semibold tracking-tight
                           border border-white/20 text-white/85
                           hover:border-white/40 hover:text-white transition-colors
                           disabled:opacity-50 disabled:cursor-wait"
              >
                {submitting ? 'Declining…' : 'Decline invitation'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setPhase('choose');
                }}
                disabled={submitting}
                className="w-full rounded-xl py-2.5 text-[13px] text-white/55 hover:text-white/80
                           transition-colors disabled:opacity-50"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {phase === 'done' && doneAction === 'accepted' && (
          <div className="space-y-5">
            <p
              className="text-[10px] uppercase tracking-[0.3em]"
              style={{ color: TOKENS.gold }}
            >
              Confirmed
            </p>
            <p className="text-[16px] leading-relaxed text-white/90">
              You're now one of <span className="text-white">{nominator}</span>'s
              trusted contacts.
            </p>
            <p className="text-[14px] leading-relaxed text-white/60">
              If they ever send an SOS, HOTMESS will reach you on the channels
              you confirmed, in the order you chose. You can close this tab.
            </p>
            <p className="text-[11px] text-white/35 leading-relaxed pt-3">
              {DISCLAIMER}
            </p>
          </div>
        )}

        {phase === 'done' && doneAction === 'declined' && (
          <div className="space-y-5">
            <p
              className="text-[10px] uppercase tracking-[0.3em]"
              style={{ color: TOKENS.gold }}
            >
              Declined
            </p>
            <p className="text-[16px] leading-relaxed text-white/90">
              Thanks for being honest about it.
            </p>
            <p className="text-[14px] leading-relaxed text-white/60">
              You won't receive HOTMESS safety alerts for{' '}
              <span className="text-white">{nominator}</span>. You can close
              this tab.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
