/**
 * PrivacyPolicy — /privacy
 *
 * Phil 2026-05-28 hotfix. Required by Google OAuth consent screen verification.
 * Plain text, HOTMESS tone, GDPR-baseline content. No fluff, no chrome.
 * Updates when the data flows do.
 */

import React from 'react';
import { Link } from 'react-router-dom';

const GOLD = '#C8962C';
const LAST_UPDATED = '28 May 2026';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-dvh bg-[#050507] text-white px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/"
          className="text-[11px] uppercase tracking-widest text-white/40 hover:text-white/70"
        >
          ← Back
        </Link>

        <h1 className="mt-6 text-3xl font-black tracking-tight">Privacy</h1>
        <p className="text-white/40 text-[12px] mt-1">Last updated: {LAST_UPDATED}</p>

        <div className="mt-8 space-y-6 text-white/80 text-[14px] leading-relaxed">
          <p>
            HOTMESS is run by HOTMESS LDN. We are the data controller. This page
            tells you what we collect, why, and what you can do about it. We
            wrote it in plain English on purpose. If anything is unclear, email{' '}
            <a href="mailto:phil@hotmessldn.com" className="underline" style={{ color: GOLD }}>
              phil@hotmessldn.com
            </a>
            .
          </p>

          <Section title="What we collect">
            <ul className="list-disc pl-5 space-y-1.5">
              <li><b>Account:</b> email, sign-in method (Google / phone / Telegram / email), age confirmation, optional display name.</li>
              <li><b>Approximate location:</b> only when you turn it on. Stored as fuzzed coordinates (rounded to ~200m). We never store your exact spot. We never store trails.</li>
              <li><b>Beacons + activity:</b> beacons you drop, boos you send, messages you send, music you play.</li>
              <li><b>Trusted contacts:</b> phone numbers you add for SOS. Only used to send an alert when you tap SOS.</li>
              <li><b>Photos:</b> profile and beacon photos you upload.</li>
              <li><b>Device + diagnostics:</b> device type, browser, IP (for fraud + rate limits), crash logs, performance metrics.</li>
              <li><b>Payments:</b> handled by Stripe. We see that you paid + which tier; we never see your card.</li>
            </ul>
          </Section>

          <Section title="Why we collect it">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Run the service (show you the globe, your beacons, the Ghosted grid, music, messaging).</li>
              <li>Keep you safe (SOS, trusted-contact alerts, age verification).</li>
              <li>Handle payments (subscriptions + power-ups via Stripe).</li>
              <li>Improve the product (anonymised analytics; never sold).</li>
            </ul>
          </Section>

          <Section title="Who we share it with">
            <p>We share the minimum necessary with these processors. None resell your data.</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li><b>Supabase</b> — database, auth, file storage (eu-west-2).</li>
              <li><b>Vercel</b> — web hosting + serverless functions.</li>
              <li><b>Stripe</b> — payments.</li>
              <li><b>Twilio</b> — SMS for SOS escalation.</li>
              <li><b>Resend</b> — transactional email.</li>
              <li><b>Mapbox</b> — map tiles (your queries are anonymised before they reach Mapbox).</li>
              <li><b>Telegram</b> — only for SOS messages + optional Telegram login.</li>
            </ul>
            <p className="mt-3">
              We do not sell your data. We never share it with advertisers. We
              never use your contacts.
            </p>
          </Section>

          <Section title="What you can do">
            <ul className="list-disc pl-5 space-y-1.5">
              <li><b>See your data:</b> email us; we send it.</li>
              <li><b>Delete your account:</b> email us; we wipe it (with the caveats below).</li>
              <li><b>Correct it:</b> most things are editable in your profile. Email if not.</li>
              <li><b>Take it elsewhere:</b> we'll export your data in JSON.</li>
              <li><b>Object:</b> tell us; we'll stop processing.</li>
            </ul>
            <p className="mt-3">
              Some records we keep even after deletion: financial records
              (legally required for 6 years), safety audit logs (so we can
              investigate abuse), and anonymised analytics.
            </p>
          </Section>

          <Section title="How long we keep it">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Account: until you delete it.</li>
              <li>Beacons: visible until they expire; archived 30 days.</li>
              <li>Messages: visible until you delete the thread; archived 90 days.</li>
              <li>SOS / safety logs: 12 months.</li>
              <li>Payment records: 6 years (UK law).</li>
              <li>Analytics: anonymised at 90 days; retained indefinitely.</li>
            </ul>
          </Section>

          <Section title="Children">
            <p>
              HOTMESS is 18+. If we find out a minor signed up, we delete the
              account immediately.
            </p>
          </Section>

          <Section title="International transfers">
            <p>
              Our database is in the UK / EU (eu-west-2). Some processors (Stripe,
              Vercel) operate in the US under standard contractual clauses + UK
              adequacy decisions.
            </p>
          </Section>

          <Section title="Changes">
            <p>
              If we change this policy meaningfully, we'll tell you in-app before
              it takes effect.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              <a href="mailto:phil@hotmessldn.com" className="underline" style={{ color: GOLD }}>
                phil@hotmessldn.com
              </a>
              {' '}— for everything, including data requests.
            </p>
            <p className="mt-3">
              If you're not happy with our response, you can complain to the UK
              ICO at <a href="https://ico.org.uk" target="_blank" rel="noreferrer" className="underline" style={{ color: GOLD }}>ico.org.uk</a>.
            </p>
          </Section>
        </div>

        <div className="mt-12 pb-12 text-center text-white/25 text-[11px] tracking-wider uppercase">
          HOTMESS · London
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-white text-[16px] font-bold uppercase tracking-wider mb-2" style={{ color: '#C8962C' }}>
        {title}
      </h2>
      <div className="text-white/75 text-[14px] leading-relaxed">{children}</div>
    </section>
  );
}
