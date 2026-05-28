/**
 * TermsOfService — /terms
 *
 * Phil 2026-05-28 hotfix. Required by Google OAuth consent screen verification.
 * Plain text, HOTMESS tone. Baseline coverage; not a substitute for the lawyer
 * pass we'll do later.
 */

import React from 'react';
import { Link } from 'react-router-dom';

const GOLD = '#C8962C';
const LAST_UPDATED = '28 May 2026';

export default function TermsOfService() {
  return (
    <div className="min-h-dvh bg-[#050507] text-white px-6 py-10">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/"
          className="text-[11px] uppercase tracking-widest text-white/40 hover:text-white/70"
        >
          ← Back
        </Link>

        <h1 className="mt-6 text-3xl font-black tracking-tight">Terms</h1>
        <p className="text-white/40 text-[12px] mt-1">Last updated: {LAST_UPDATED}</p>

        <div className="mt-8 space-y-6 text-white/80 text-[14px] leading-relaxed">
          <p>
            These are the terms for using HOTMESS. Using HOTMESS means you agree
            to them. We tried to keep it short. Questions to{' '}
            <a href="mailto:phil@hotmessldn.com" className="underline" style={{ color: GOLD }}>
              phil@hotmessldn.com
            </a>
            .
          </p>

          <Section title="Who can use HOTMESS">
            <p>
              You must be 18 or over. HOTMESS is for adult gay and bisexual men.
              By signing up you confirm both.
            </p>
            <p className="mt-3">
              We can refuse or remove accounts that breach these terms or our
              community standards.
            </p>
          </Section>

          <Section title="Community standards">
            <p>The basics. Don't:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Harass, threaten, or abuse other members.</li>
              <li>Share other people's photos, identity, or location without consent.</li>
              <li>Send unsolicited explicit content to people who haven't asked.</li>
              <li>Impersonate someone else.</li>
              <li>Use HOTMESS for commercial solicitation outside its market features.</li>
              <li>Sell or share access to your account.</li>
              <li>Try to circumvent our safety, age, or visibility systems.</li>
            </ul>
            <p className="mt-3">
              We can suspend or delete accounts for breaches. Serious breaches
              are reported to authorities where required.
            </p>
          </Section>

          <Section title="Paid membership">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Tiers are listed on the upgrade screen. Prices shown include VAT where applicable.</li>
              <li>Subscriptions renew monthly via Stripe until cancelled.</li>
              <li>Cancel anytime in your profile; access continues until the period ends.</li>
              <li>Refunds: full refund within 14 days of first purchase if you haven't used the paid features. After that, no refunds for partial periods.</li>
              <li>Power-ups (one-off purchases): non-refundable once activated.</li>
            </ul>
          </Section>

          <Section title="What we owe you">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>To run HOTMESS to a reasonable standard.</li>
              <li>To protect your data per our <Link to="/privacy" className="underline" style={{ color: GOLD }}>Privacy Policy</Link>.</li>
              <li>To honour the entitlements of the tier you paid for.</li>
              <li>To tell you in advance about meaningful changes to terms or pricing.</li>
            </ul>
          </Section>

          <Section title="What you owe us">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Honest information when you sign up.</li>
              <li>Keep your login secure.</li>
              <li>Respect other members and the community standards above.</li>
              <li>Pay for what you use.</li>
            </ul>
          </Section>

          <Section title="Content you post">
            <p>
              You keep ownership of photos, beacons, and messages you upload.
              You grant HOTMESS a non-exclusive licence to display them inside
              HOTMESS for as long as your account exists.
            </p>
            <p className="mt-3">
              You're responsible for what you post. Don't upload anything you
              don't have the right to share.
            </p>
          </Section>

          <Section title="Safety features">
            <p>
              SOS, trusted contacts, and aftercare are provided as best-effort
              tools. They are NOT a substitute for emergency services. In a real
              emergency, call 999 (UK) or your local equivalent.
            </p>
          </Section>

          <Section title="Suspension + termination">
            <p>
              We can suspend or terminate your account for breach of these
              terms, fraud, abuse, or risk to other members. We'll usually tell
              you why. Where the breach is serious, we may act immediately.
            </p>
            <p className="mt-3">
              You can close your account anytime via the profile settings or
              by emailing us.
            </p>
          </Section>

          <Section title="Limits">
            <p>
              HOTMESS is provided as-is. We don't promise it will always work,
              never have bugs, or be free of downtime. We won't be liable for
              indirect or consequential loss. Our maximum liability to you is
              the amount you've paid in the last 12 months.
            </p>
            <p className="mt-3">
              Nothing in these terms limits liability for death, personal
              injury caused by negligence, or fraud.
            </p>
          </Section>

          <Section title="Law">
            <p>
              These terms are governed by the law of England and Wales.
              Disputes are subject to the exclusive jurisdiction of the English
              courts.
            </p>
          </Section>

          <Section title="Changes">
            <p>
              If we change these terms, we'll tell you in-app before they take
              effect. Continued use after that means you accept the new terms.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              <a href="mailto:phil@hotmessldn.com" className="underline" style={{ color: GOLD }}>
                phil@hotmessldn.com
              </a>
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
