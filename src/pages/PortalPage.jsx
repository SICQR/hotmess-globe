/**
 * /portal?token=<inquiryId>.<hmac>
 *
 * Phase 3b — Welcome Portal stub for founding partners.
 *
 * Lands here after they pay on hotmess-founding.vercel.app. The Stripe
 * webhook on hotmess-founding mints an HMAC token from PORTAL_COOKIE_SECRET
 * and emails it as part of the welcome email. This page verifies the token
 * server-side at /api/portal/verify and renders a static welcome.
 *
 * No data writes. No login. Pure confirmation that "you're in."
 * Phase 3c will start writing beacon rows into hotmess-globe.
 */

import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';

// Canonical 6 founding tiers — must match TIER_VISUAL_CONFIG in
// src/hooks/useLiveTierData.ts. Kept inline so this page doesn't pull in the
// globe-layer bundle. Labels are partner-facing copy ("Anchor", "Chain") and
// the colours mirror the globe pin treatment so partners see continuity from
// the moment they land here.
const TIER_META = {
  founding_venue:    { label: 'Venue',    color: '#FF6B6B', tagline: 'Founding Venue · permanent pin on the globe' },
  founding_promoter: { label: 'Promoter', color: '#4ECDC4', tagline: 'Founding Promoter · arcs from home base to your nights' },
  founding_wellness: { label: 'Wellness', color: '#A8E6CF', tagline: 'Founding Wellness Partner · listed by choice, never by assumption' },
  founding_signal:   { label: 'Signal',   color: '#FFE66D', tagline: 'Founding Signal · network outpost in your city' },
  founding_anchor:   { label: 'Anchor',   color: '#FF1493', tagline: 'Founding Anchor · pulsing ring on the globe, year one' },
  founding_chain:    { label: 'Chain',    color: '#9B59B6', tagline: 'Founding Chain · multi-venue group, aggregated on the globe' },
};

function useSearchParam(name) {
  const { search } = useLocation();
  return new URLSearchParams(search).get(name);
}

function PortalShell({ children }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#f5f5f5',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        padding: '48px 20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      <div style={{ width: '100%', maxWidth: 640 }}>{children}</div>
    </div>
  );
}

function ErrorPanel({ heading, body }) {
  return (
    <PortalShell>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12, letterSpacing: '-0.02em' }}>
        {heading}
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.55, color: '#cfcfcf', marginBottom: 20 }}>{body}</p>
      <p style={{ fontSize: 14, color: '#9a9a9a' }}>
        Phil personally onboards every founding partner. If you think this is a mistake, reply to
        the welcome email or write to{' '}
        <a href="mailto:founding@hotmessldn.com" style={{ color: '#FFD700' }}>
          founding@hotmessldn.com
        </a>{' '}
        and he'll fix it within the day.
      </p>
      <p style={{ marginTop: 32 }}>
        <Link to="/" style={{ color: '#FFD700', textDecoration: 'none' }}>
          ← back to the globe
        </Link>
      </p>
    </PortalShell>
  );
}

export default function PortalPage() {
  const token = useSearchParam('token');
  const [state, setState] = useState({ phase: 'loading' });

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setState({ phase: 'error', error: 'missing_token' });
      return;
    }
    (async () => {
      try {
        const res = await fetch('/api/portal/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !json.ok) {
          setState({
            phase: 'error',
            error: json.error || `http_${res.status}`,
            status: json.status,
          });
          return;
        }
        setState({ phase: 'ok', partner: json.partner });
      } catch (e) {
        if (cancelled) return;
        setState({ phase: 'error', error: 'network' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state.phase === 'loading') {
    return (
      <PortalShell>
        <p style={{ color: '#9a9a9a', fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          verifying your welcome link…
        </p>
      </PortalShell>
    );
  }

  if (state.phase === 'error') {
    if (state.error === 'missing_token') {
      return (
        <ErrorPanel
          heading="No token on this link."
          body="The welcome portal needs the full link from your confirmation email. Check the welcome email Phil sent right after checkout."
        />
      );
    }
    if (state.error === 'invalid_token') {
      return (
        <ErrorPanel
          heading="That link didn't verify."
          body="Either the link was copied wrong, or it's been tampered with. Open the original email and try again."
        />
      );
    }
    if (state.error === 'not_paid_yet') {
      return (
        <ErrorPanel
          heading="Checkout hasn't cleared yet."
          body={`Your inquiry is on file (status: ${state.status || 'new'}) but Stripe hasn't confirmed the payment yet. It usually takes under a minute. Refresh in a moment, or reply to the welcome email and Phil will sort it.`}
        />
      );
    }
    if (state.error === 'not_found') {
      return (
        <ErrorPanel
          heading="We can't find that inquiry."
          body="The token is well-formed but doesn't match any partner on file. This usually means the database row was deleted in testing. Reply to the welcome email."
        />
      );
    }
    return (
      <ErrorPanel
        heading="Something on our side broke."
        body="The portal couldn't verify your link right now. Try again in a minute — if it keeps failing, reply to the welcome email and Phil will sort it personally."
      />
    );
  }

  // phase === 'ok'
  const p = state.partner || {};
  const meta = TIER_META[p.tier_interest] || null;

  return (
    <PortalShell>
      {/* Tier pill */}
      {meta && (
        <span
          style={{
            display: 'inline-block',
            padding: '6px 14px',
            border: `1px solid ${meta.color}`,
            color: meta.color,
            fontSize: 12,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            borderRadius: 999,
            marginBottom: 24,
          }}
        >
          Founding · {meta.label}
        </span>
      )}

      <h1
        style={{
          fontSize: 36,
          lineHeight: 1.1,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          marginBottom: 18,
        }}
      >
        Welcome, <span style={{ color: '#FFD700' }}>{p.entity_name || 'partner'}</span>.
      </h1>

      <p style={{ fontSize: 18, lineHeight: 1.55, color: '#d8d8d8', marginBottom: 28 }}>
        You're in the founding cohort. {meta ? meta.tagline + '.' : 'Your pin goes on the globe this week.'}
      </p>

      <div
        style={{
          padding: '20px 22px',
          border: '1px solid #2a2a2a',
          borderRadius: 12,
          background: '#111',
          marginBottom: 28,
        }}
      >
        <p style={{ fontSize: 14, color: '#9a9a9a', marginBottom: 10, letterSpacing: '0.05em' }}>
          what happens next
        </p>
        <ol style={{ paddingLeft: 18, color: '#e4e4e4', fontSize: 15, lineHeight: 1.65, margin: 0 }}>
          <li>Phil personally onboards you within the first week — by call, voice note, or in person if you're in London.</li>
          <li>Your pin lands on hotmessldn.com once Phil confirms your details.</li>
          <li>You'll get a private operator login (Phase 3c, shipping this week) to manage your own listing.</li>
        </ol>
      </div>

      <p style={{ fontSize: 14, color: '#9a9a9a', marginBottom: 6 }}>
        Listed by choice, never by assumption. Nothing about you goes live until you've seen the
        copy, the pin colour, the wording — everything. Reply to the welcome email with anything
        you want changed.
      </p>

      <p style={{ fontSize: 14, color: '#9a9a9a', marginBottom: 28 }}>
        Code over chems. Care over campaign.
      </p>

      <p style={{ fontSize: 13, color: '#666', borderTop: '1px solid #222', paddingTop: 18 }}>
        Inquiry id: <code style={{ color: '#999' }}>{p.id || token?.split('.')[0]}</code>
        {p.city ? <> · {p.city}</> : null}
        {p.paid_at ? <> · paid {new Date(p.paid_at).toUTCString().replace(' GMT', '')}</> : null}
      </p>
    </PortalShell>
  );
}
