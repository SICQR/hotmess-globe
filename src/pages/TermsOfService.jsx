import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Shield, AlertTriangle, CreditCard, Scale } from 'lucide-react';
import { createPageUrl } from '../utils';

export default function TermsOfService() {
  const lastUpdated = 'January 26, 2026';
  
  const sections = [
    {
      id: 'acceptance',
      title: '1. Acceptance of Terms',
      icon: FileText,
      content: `By accessing or using HOTMESS ("the Platform", "we", "us", or "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Platform.

These Terms constitute a legally binding agreement between you and HOTMESS London OS Limited. We may update these Terms from time to time, and your continued use of the Platform constitutes acceptance of any changes.`
    },
    {
      id: 'eligibility',
      title: '2. Eligibility & Age Requirements',
      icon: Shield,
      content: `**Age Requirement**: You must be at least 18 years old to use HOTMESS. By creating an account, you confirm that you are 18 years of age or older.

**Account Responsibility**: You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.

**Accurate Information**: You agree to provide accurate, current, and complete information during registration and to update such information as necessary.`
    },
    {
      id: 'conduct',
      title: '3. User Conduct',
      icon: AlertTriangle,
      content: `You agree NOT to:
• Use the Platform for any illegal purpose or in violation of any laws
• Harass, abuse, threaten, or intimidate other users
• Post content that is defamatory, obscene, or infringes on intellectual property rights
• Impersonate any person or entity
• Engage in spam, phishing, or distribute malware
• Attempt to gain unauthorized access to the Platform or other users' accounts
• Interfere with or disrupt the Platform's operations
• Use bots, scrapers, or automated tools without permission
• Sell, transfer, or share your account
• Engage in any form of non-consensual activity

**Content Standards**: All content you post must comply with our Community Guidelines. We reserve the right to remove any content that violates these Terms or our policies.`
    },
    {
      id: 'content',
      title: '4. Content Ownership & License',
      icon: FileText,
      content: `**Your Content**: You retain ownership of content you create and post on HOTMESS. By posting content, you grant us a non-exclusive, worldwide, royalty-free license to use, display, reproduce, and distribute your content in connection with the Platform.

**Platform Content**: All content, features, and functionality of the Platform (excluding user-generated content) are owned by HOTMESS and protected by intellectual property laws.

**Content Removal**: We may remove or disable access to any content at our discretion, including content that violates these Terms or applicable laws.`
    },
    {
      id: 'payments',
      title: '5. Payments & Subscriptions',
      icon: CreditCard,
      content: `**Membership Tiers**: HOTMESS offers a five-tier ladder: MESS (free), HOTMESS (£7.99/month), CONNECTED (£19.99/month), PROMOTER (£44.99/month), and VENUE (£99.99/month). Each tier unlocks a specific entitlement set (Ghosted grid access, messaging, music library, beacon-drop quota, selling and event tools, venue dashboard). The current tier list and entitlements are shown on the upgrade screen and in the Help Center.

**Billing**: Subscription fees are billed in advance on a recurring basis through Stripe. By subscribing, you authorize us to charge your payment method automatically. HOTMESS holds no funds — Stripe is the source of truth for all transactions.

**Cancellation**: You may cancel your subscription at any time via More → Membership. Cancellation takes effect at the end of your current billing period; you drop back to MESS automatically.

**Refunds**: A full refund is available within 14 days of first purchase if you have not used the paid features. After that, subscription fees are non-refundable for partial periods. Power-ups (one-off purchases) are non-refundable once activated. See our Refund & Cancellation policy for case-by-case exceptions.

**Marketplace Transactions**: Transactions through the Market (Shop, HNH MESS, Drops, Preloved) are subject to additional terms. Sellers on Preloved must hold a CONNECTED tier or higher and are responsible for fulfilling orders and complying with applicable laws.`
    },
    {
      id: 'safety',
      title: '6. Safety & Privacy',
      icon: Shield,
      content: `**Your Safety**: Your safety matters. We provide tools including Silent SOS, Trusted Contacts, safety check-ins, and the Care suite. These are best-effort and are NOT a substitute for emergency services. In a real emergency, call 999 (UK) or your local equivalent. We cannot guarantee your safety when meeting people offline.

**Privacy**: Our collection and use of personal information is governed by our Privacy Policy. By using the Platform, you consent to our data practices as described in that policy.

**Location Data**: Some features use your location. You can control location sharing through your device settings and our privacy controls.

**Reporting**: You can report violations, harassment, or safety concerns through our reporting tools. We take all reports seriously and will investigate appropriately.`
    },
    {
      id: 'liability',
      title: '7. Limitation of Liability',
      icon: Scale,
      content: `**Disclaimer**: THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

**Limitation**: TO THE MAXIMUM EXTENT PERMITTED BY LAW, HOTMESS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL.

**Cap on Liability**: OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM YOUR USE OF THE PLATFORM SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM.

**User Interactions**: WE ARE NOT RESPONSIBLE FOR THE ACTIONS, CONTENT, OR BEHAVIOR OF OTHER USERS. YOU INTERACT WITH OTHER USERS AT YOUR OWN RISK.`
    },
    {
      id: 'termination',
      title: '8. Termination',
      icon: AlertTriangle,
      content: `**Your Right to Terminate**: You may delete your account at any time through Settings or by contacting support.

**Our Right to Terminate**: We may suspend or terminate your account at any time for violation of these Terms, illegal activity, or any other reason at our discretion.

**Effect of Termination**: Upon termination, your right to use the Platform ceases immediately. Content you have posted may remain on the Platform unless you request deletion.

**Data Retention**: We may retain certain data as required by law or for legitimate business purposes, as described in our Privacy Policy.`
    },
    {
      id: 'disputes',
      title: '9. Dispute Resolution',
      icon: Scale,
      content: `**Governing Law**: These Terms are governed by the laws of England and Wales.

**Informal Resolution**: Before filing any legal claim, you agree to attempt informal resolution by contacting us at legal@hotmess.london.

**Jurisdiction**: Any disputes that cannot be resolved informally shall be subject to the exclusive jurisdiction of the courts of England and Wales.`
    },
    {
      id: 'general',
      title: '10. General Provisions',
      icon: FileText,
      content: `**Entire Agreement**: These Terms, together with our Privacy Policy and Community Guidelines, constitute the entire agreement between you and HOTMESS.

**Severability**: If any provision of these Terms is found unenforceable, the remaining provisions will continue in effect.

**No Waiver**: Our failure to enforce any right or provision of these Terms does not constitute a waiver of that right.

**Assignment**: We may assign our rights under these Terms. You may not assign your rights without our written consent.

**Contact**: For questions about these Terms, contact us at legal@hotmess.london.`
    }
  ];

  const renderContent = (content) => {
    return content.split('**').map((part, i) => 
      i % 2 === 1 ? <strong key={i} className="text-white">{part}</strong> : part
    );
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('More')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-4xl font-black uppercase">Terms of Service</h1>
            <p className="text-white/60 text-sm">Last updated: {lastUpdated}</p>
          </div>
        </div>

        <div className="bg-white/5 border-2 border-white/10 p-6 mb-8">
          <h2 className="font-black uppercase mb-4">Quick Navigation</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="text-sm text-[#C8962C] hover:text-white transition-colors">
                {section.title}
              </a>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#C8962C]/20 to-transparent border-l-4 border-[#C8962C] p-6 mb-8">
          <p className="text-white/80">
            Welcome to HOTMESS — a queer men&apos;s OS built for gay men. These Terms of Service govern your use of the platform.
            By using HOTMESS, you agree to these terms. The short, plain-text version of our terms also lives at <a href="/terms" className="text-[#C8962C] hover:text-white">/terms</a>.
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.id} id={section.id} className="bg-white/5 border-2 border-white/10 p-6 scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <Icon className="w-6 h-6 text-[#C8962C]" />
                  <h2 className="text-xl font-black uppercase">{section.title}</h2>
                </div>
                <div className="text-white/80 whitespace-pre-line leading-relaxed">
                  {renderContent(section.content)}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center text-white/40 text-sm">
          <p>HOTMESS London OS Limited</p>
          <p>Registered in England and Wales</p>
          <p className="mt-4">
            Questions? Contact us at{' '}
            <a href="mailto:legal@hotmess.london" className="text-[#C8962C] hover:text-white">legal@hotmess.london</a>
          </p>
        </div>
      </div>
    </div>
  );
}
