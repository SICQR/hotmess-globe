import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Heart, Shield, AlertTriangle, Ban, Users, Flag, Drama } from 'lucide-react';
import { createPageUrl } from '../utils';

// Phil 2026-05-31 — full copy rewrite. The previous file had two
// brand-incorrect statements:
//   1. "Inclusive community — welcome all identities, orientations,
//      and expressions" framed HOTMESS as a generic dating platform.
//      HOTMESS is built FOR GAY MEN. Trans men, bi men, and queer
//      men who fuck men are part of that community; the platform
//      is not "everyone everywhere."
//   2. "No catfishing, no fake profiles" directly contradicted the
//      product's persona switcher. Switching between Daddy / Brat /
//      Pup / Top / Bottom / Boy etc. is how the platform works;
//      branding it as "fake" delegitimised the core mechanic.
// This rewrite re-anchors the page on the real DNA: gay men's space,
// persona-honest (not persona-banned), harm-reduction-aware (not
// abstinence-policing), consent + aftercare as the floor.
export default function CommunityGuidelines() {
  const lastUpdated = 'May 31, 2026';

  const coreValues = [
    {
      icon: Heart,
      title: 'Consent First',
      desc: 'Ongoing, enthusiastic, withdrawable. No assumptions, ever.',
    },
    {
      icon: Shield,
      title: 'Look After The Boys',
      desc: 'Harm reduction. Aftercare. Recovery-aware. We hold each other.',
    },
    {
      icon: Drama,
      title: 'Persona Honest',
      desc: 'Switch modes freely. Daddy, Brat, Pup, Recovery — all you. Don\'t pretend to be someone else\'s actual human.',
    },
    {
      icon: Users,
      title: 'Built For Gay Men',
      desc: 'A space for queer men, by queer men. Trans men and bi men are family. Misogyny, racism, transphobia, sero-shame — out.',
    },
  ];

  const sections = [
    {
      id: 'consent',
      title: 'Consent & Boundaries',
      icon: Heart,
      color: 'text-[#C8962C]',
      rules: [
        { do: true, text: 'Ask for consent before any interaction — and again as things change' },
        { do: true, text: 'Respect when someone says no, slows down, or goes quiet' },
        { do: true, text: 'State your boundaries clearly. Respect everyone else\'s.' },
        { do: true, text: 'Treat every user with dignity — sober, high, poz, neg, in recovery, sex worker, civilian, all of it' },
        { do: false, text: 'Pressure, coerce, or guilt-trip anyone into anything' },
        { do: false, text: 'Keep messaging after being asked to stop' },
        { do: false, text: 'Share private chats, photos, or screen recordings without consent' },
        { do: false, text: 'Assume consent from one mode carries to another — personas reset' },
      ],
    },
    {
      id: 'safety',
      title: 'Safety, Harm Reduction & Aftercare',
      icon: Shield,
      color: 'text-green-500',
      rules: [
        { do: true, text: 'Use the panic button + safety check-in for hookups and play sessions' },
        { do: true, text: 'Meet in public the first time when you can — and tell someone where you\'ll be' },
        { do: true, text: 'Practice harm reduction: test, taper, hydrate, plan an exit' },
        { do: true, text: 'Aftercare is part of the act — check on the boy you just played with' },
        { do: true, text: 'Recovery is a community job. Hold space for the men working a program.' },
        { do: false, text: 'Share home address, workplace, or family details casually' },
        { do: false, text: 'Push substances on anyone, especially someone sober or in recovery' },
        { do: false, text: 'Out anyone\'s HIV status, PrEP status, recovery, or sobriety without consent' },
        { do: false, text: 'Ignore signs a brother is in distress — flag it, escalate it, sit with it' },
      ],
    },
    {
      id: 'personas',
      title: 'Personas & Identity',
      icon: Drama,
      color: 'text-blue-500',
      rules: [
        { do: true, text: 'Switch personas freely — Daddy, Brat, Pup, Top, Bottom, Boy, Recovery, Civilian, all of it' },
        { do: true, text: 'Use recent photos that genuinely look like you' },
        { do: true, text: 'Be honest about your intentions in THIS session, THIS mode' },
        { do: true, text: 'Disclose what affects another person — status, substances on board, recording, etc.' },
        { do: false, text: 'Impersonate another human — real users, ex-partners, celebrities, sex workers you don\'t know' },
        { do: false, text: 'Use someone else\'s photos or AI-generated faces presented as your own' },
        { do: false, text: 'Misrepresent your age — HOTMESS is 18+, no exceptions' },
        { do: false, text: 'Run multiple HOTMESS accounts. One identity, many personas — not many identities.' },
      ],
    },
    {
      id: 'prohibited',
      title: 'Hard Lines',
      icon: Ban,
      color: 'text-red-500',
      rules: [
        { do: false, text: 'Any sexual content involving minors — instant ban, reported to authorities' },
        { do: false, text: 'Non-consensual content, revenge posts, or leaked private material' },
        { do: false, text: 'Threats, violence, or content glorifying harm' },
        { do: false, text: 'Racism, transphobia, biphobia, femmephobia, sero-shaming, fat-shaming, age-shaming' },
        { do: false, text: 'Harassment, stalking, doxxing, or coordinated pile-ons' },
        { do: false, text: 'Spam, scams, financial domination scams, romance scams' },
        { do: false, text: 'Dealing — drug sales through DMs, profiles, or marketplace' },
        { do: false, text: 'Content actively encouraging self-harm or suicide' },
      ],
    },
    {
      id: 'marketplace',
      title: 'Marketplace & Money',
      icon: Flag,
      color: 'text-yellow-500',
      rules: [
        { do: true, text: 'Describe items honestly — condition, size, history' },
        { do: true, text: 'Honour the price and terms you agreed' },
        { do: true, text: 'Reply to buyers and sellers in a reasonable window' },
        { do: true, text: 'Leave honest reviews — including the awkward ones' },
        { do: false, text: 'Sell prohibited items (weapons, drugs, prescription meds, anything illegal where you are)' },
        { do: false, text: 'Defraud, ghost on payment, or fake delivery' },
        { do: false, text: 'Buy or trade reviews' },
        { do: false, text: 'List items you don\'t physically hold and can\'t actually ship' },
      ],
    },
  ];

  const consequences = [
    { level: 'Warning', desc: 'First-time minor stuff — usually a conversation', color: 'text-yellow-400' },
    { level: 'Temporary Suspension', desc: 'Repeated violations or moderate offences', color: 'text-orange-400' },
    { level: 'Permanent Ban', desc: 'Hard-line content, serial behaviour, safety risk', color: 'text-red-400' },
    { level: 'Legal Action', desc: 'Criminal behaviour, CSAM, credible threats', color: 'text-red-600' },
  ];

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('More')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-4xl font-black uppercase">Community Guidelines</h1>
            <p className="text-white/60 text-sm">Last updated: {lastUpdated}</p>
          </div>
        </div>

        {/* Core Values */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {coreValues.map((value, i) => {
            const Icon = value.icon;
            return (
              <div key={i} className="bg-white/5 border-2 border-white/10 p-4 text-center">
                <Icon className="w-8 h-8 mx-auto mb-2 text-[#C8962C]" />
                <h3 className="font-black uppercase text-sm mb-1">{value.title}</h3>
                <p className="text-xs text-white/60">{value.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-gradient-to-r from-[#C8962C]/20 to-transparent border-l-4 border-[#C8962C] p-6 mb-8">
          <p className="text-white/85 leading-relaxed">
            HOTMESS is built for gay men — by gay men. Trans men, bi men, and queer men who connect with men
            are part of this community. A space to show up as any version of yourself: get off, hook up,
            recover, build, and be held. These guidelines exist so the space stays real. Consent is the floor.
            Aftercare is the work. Personas are how we play.{' '}
            <span className="text-white">Catfishing isn&apos;t switching personas — it&apos;s pretending
            to be someone else&apos;s actual human.</span> Know the difference. Violations may result
            in warnings, suspension, or a permanent ban.
          </p>
        </div>

        {/* Guidelines Sections */}
        <div className="space-y-8">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.id} id={section.id} className="bg-white/5 border-2 border-white/10 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Icon className={`w-6 h-6 ${section.color}`} />
                  <h2 className="text-xl font-black uppercase">{section.title}</h2>
                </div>
                <div className="grid gap-2">
                  {section.rules.map((rule, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded ${
                        rule.do ? 'bg-green-500/10' : 'bg-red-500/10'
                      }`}
                    >
                      <span className={`font-bold text-sm ${rule.do ? 'text-green-400' : 'text-red-400'}`}>
                        {rule.do ? '✓ DO' : '✗ DON\'T'}
                      </span>
                      <span className="text-white/80 text-sm">{rule.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Reporting Section */}
        <div className="mt-8 bg-white/5 border-2 border-[#C8962C]/50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Flag className="w-6 h-6 text-[#C8962C]" />
            <h2 className="text-xl font-black uppercase">Reporting Violations</h2>
          </div>
          <div className="text-white/80 space-y-4">
            <p>If you see content or behaviour that breaks these guidelines:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong>Report in-app</strong>: Use the report button on any profile, message, or content</li>
              <li><strong>Block</strong>: Block anyone who makes you uncomfortable. No explanation owed.</li>
              <li><strong>Safety team</strong>: Email <a href="mailto:safety@hotmess.london" className="text-[#C8962C] hover:text-white">safety@hotmess.london</a> for urgent concerns</li>
              <li><strong>Emergency</strong>: Use the panic button or call emergency services if in danger</li>
            </ul>
            <p className="text-sm text-white/60">
              All reports are reviewed by the HOTMESS moderation team. You can track report status in your Safety settings.
            </p>
          </div>
        </div>

        {/* Consequences */}
        <div className="mt-8 bg-white/5 border-2 border-white/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-orange-400" />
            <h2 className="text-xl font-black uppercase">Consequences</h2>
          </div>
          <div className="grid gap-3">
            {consequences.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded">
                <span className={`font-bold ${c.color}`}>{c.level}</span>
                <span className="text-white/60 text-sm">{c.desc}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-white/60">
            We reserve the right to take immediate action for severe violations without prior warning.
            You may appeal moderation decisions through the appeal process in Settings.
          </p>
        </div>

        {/* Appeal Process */}
        <div className="mt-8 bg-white/5 border-2 border-white/10 p-6">
          <h2 className="text-xl font-black uppercase mb-4">Appeal Process</h2>
          <div className="text-white/80 space-y-3 text-sm">
            <p>If you believe a moderation decision was made in error:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Go to Settings → Safety → Moderation History</li>
              <li>Select the action you wish to appeal</li>
              <li>Submit an appeal with your explanation</li>
              <li>Our team will review within 7 days</li>
            </ol>
            <p className="text-white/60">
              Appeals are reviewed by a different moderator than the original decision-maker.
            </p>
          </div>
        </div>

        <div className="mt-12 text-center text-white/40 text-sm">
          <p>Questions about these guidelines?</p>
          <p className="mt-2">
            Contact us at{' '}
            <a href="mailto:community@hotmess.london" className="text-[#C8962C] hover:text-white">
              community@hotmess.london
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
