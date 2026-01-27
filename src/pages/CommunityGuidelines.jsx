import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Heart, Shield, AlertTriangle, Ban, MessageCircle, Flag, Award } from 'lucide-react';
import { createPageUrl } from '../utils';

export default function CommunityGuidelines() {
  const lastUpdated = 'January 26, 2026';
  
  const coreValues = [
    { icon: Heart, title: 'Consent First', desc: 'Respect boundaries. Ask before assuming. No means no.' },
    { icon: Shield, title: 'Safety Always', desc: 'Look out for yourself and others. Report concerns.' },
    { icon: MessageCircle, title: 'Authentic Connections', desc: 'Be real. No catfishing, no fake profiles.' },
    { icon: Award, title: 'Inclusive Community', desc: 'Welcome all identities, orientations, and expressions.' },
  ];

  const sections = [
    {
      id: 'respect',
      title: 'Respect & Consent',
      icon: Heart,
      color: 'text-pink-500',
      rules: [
        { do: true, text: 'Ask for consent before any interaction' },
        { do: true, text: 'Respect when someone says no or isn\'t interested' },
        { do: true, text: 'Communicate boundaries clearly and respect others\' boundaries' },
        { do: true, text: 'Treat all users with dignity regardless of their choices' },
        { do: false, text: 'Pressure or coerce anyone into any activity' },
        { do: false, text: 'Continue contact after being asked to stop' },
        { do: false, text: 'Share private conversations or images without consent' },
        { do: false, text: 'Make assumptions about what others want' },
      ]
    },
    {
      id: 'safety',
      title: 'Safety & Well-being',
      icon: Shield,
      color: 'text-green-500',
      rules: [
        { do: true, text: 'Use the safety check-in features when meeting people' },
        { do: true, text: 'Meet in public places first' },
        { do: true, text: 'Report concerning behavior immediately' },
        { do: true, text: 'Support users who may be in distress' },
        { do: false, text: 'Share personal information like address, workplace, etc.' },
        { do: false, text: 'Ignore signs that someone may be in danger' },
        { do: false, text: 'Encourage or glorify risky behavior' },
        { do: false, text: 'Use the platform while impaired' },
      ]
    },
    {
      id: 'authenticity',
      title: 'Authenticity & Honesty',
      icon: MessageCircle,
      color: 'text-blue-500',
      rules: [
        { do: true, text: 'Use recent, accurate photos of yourself' },
        { do: true, text: 'Be honest about your intentions and expectations' },
        { do: true, text: 'Accurately represent your identity' },
        { do: true, text: 'Disclose relevant information that affects others' },
        { do: false, text: 'Use fake photos or catfish others' },
        { do: false, text: 'Misrepresent your age, identity, or intentions' },
        { do: false, text: 'Create multiple accounts' },
        { do: false, text: 'Impersonate other users or public figures' },
      ]
    },
    {
      id: 'prohibited',
      title: 'Prohibited Content',
      icon: Ban,
      color: 'text-red-500',
      rules: [
        { do: false, text: 'Content involving minors in any sexual context' },
        { do: false, text: 'Non-consensual sexual content or revenge porn' },
        { do: false, text: 'Content depicting violence or harm' },
        { do: false, text: 'Hate speech targeting race, religion, gender, orientation, etc.' },
        { do: false, text: 'Harassment, bullying, or threats' },
        { do: false, text: 'Spam, scams, or commercial solicitation' },
        { do: false, text: 'Illegal activities including drug sales' },
        { do: false, text: 'Content promoting self-harm or suicide' },
      ]
    },
    {
      id: 'marketplace',
      title: 'Marketplace Rules',
      icon: Award,
      color: 'text-yellow-500',
      rules: [
        { do: true, text: 'Accurately describe items and services' },
        { do: true, text: 'Honor agreed prices and terms' },
        { do: true, text: 'Communicate promptly with buyers/sellers' },
        { do: true, text: 'Leave honest reviews' },
        { do: false, text: 'Sell prohibited items (weapons, drugs, stolen goods)' },
        { do: false, text: 'Scam or defraud other users' },
        { do: false, text: 'Manipulate reviews or ratings' },
        { do: false, text: 'Sell items you don\'t possess or can\'t deliver' },
      ]
    },
  ];

  const consequences = [
    { level: 'Warning', desc: 'First-time minor violations', color: 'text-yellow-400' },
    { level: 'Temporary Suspension', desc: 'Repeated violations or moderate offenses', color: 'text-orange-400' },
    { level: 'Permanent Ban', desc: 'Serious violations or continued behavior', color: 'text-red-400' },
    { level: 'Legal Action', desc: 'Criminal behavior or threats', color: 'text-red-600' },
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
                <Icon className="w-8 h-8 mx-auto mb-2 text-[#E62020]" />
                <h3 className="font-black uppercase text-sm mb-1">{value.title}</h3>
                <p className="text-xs text-white/60">{value.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-gradient-to-r from-[#E62020]/20 to-transparent border-l-4 border-[#E62020] p-6 mb-8">
          <p className="text-white/80">
            HOTMESS is a community built on consent, safety, and respect. These guidelines help 
            create a space where everyone can explore and connect authentically. Violations may 
            result in warnings, suspension, or permanent bans.
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
        <div className="mt-8 bg-white/5 border-2 border-[#E62020]/50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Flag className="w-6 h-6 text-[#E62020]" />
            <h2 className="text-xl font-black uppercase">Reporting Violations</h2>
          </div>
          <div className="text-white/80 space-y-4">
            <p>If you see content or behavior that violates these guidelines:</p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><strong>Report in-app</strong>: Use the report button on any profile, message, or content</li>
              <li><strong>Block users</strong>: Block anyone who makes you uncomfortable</li>
              <li><strong>Contact safety</strong>: Email safety@hotmess.london for urgent concerns</li>
              <li><strong>Emergency</strong>: Use the panic button or call emergency services if in danger</li>
            </ul>
            <p className="text-sm text-white/60">
              All reports are reviewed by our moderation team. You can track report status in your Safety settings.
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
            <a href="mailto:community@hotmess.london" className="text-[#E62020] hover:text-white">
              community@hotmess.london
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
