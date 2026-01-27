import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, Database, Shield, Globe, Users, Settings, Mail } from 'lucide-react';
import { createPageUrl } from '../utils';

export default function PrivacyPolicy() {
  const lastUpdated = 'January 26, 2026';
  
  const sections = [
    {
      id: 'overview',
      title: '1. Overview',
      icon: Eye,
      content: `This Privacy Policy explains how HOTMESS London OS Limited ("HOTMESS", "we", "us", or "our") collects, uses, shares, and protects your personal information when you use our platform.

We are committed to protecting your privacy and ensuring transparency about our data practices. This policy applies to all users of the HOTMESS platform, including our website and mobile applications.

**Data Controller**: HOTMESS London OS Limited is the data controller for the personal information we collect. We are registered in England and Wales.`
    },
    {
      id: 'collection',
      title: '2. Information We Collect',
      icon: Database,
      content: `**Information You Provide:**
• Account information (email, username, password)
• Profile information (photos, bio, interests, preferences)
• Verification information (age verification, identity verification)
• Communications (messages, posts, comments)
• Payment information (processed by Stripe)
• Support requests and feedback

**Information Collected Automatically:**
• Device information (device type, operating system, browser)
• Usage data (features used, pages visited, actions taken)
• Location data (with your consent)
• Log data (IP address, access times, referring URLs)
• Cookies and similar technologies

**Information from Third Parties:**
• Social login providers (if you sign in with Google, etc.)
• Payment processors (transaction confirmations)
• Analytics providers (aggregated usage data)`
    },
    {
      id: 'use',
      title: '3. How We Use Your Information',
      icon: Settings,
      content: `We use your information to:

**Provide Our Services:**
• Create and maintain your account
• Enable you to connect with other users
• Process transactions and payments
• Send service-related communications

**Improve Our Platform:**
• Analyze usage patterns and trends
• Develop new features and services
• Fix bugs and improve performance
• Conduct research and analytics

**Keep You Safe:**
• Detect and prevent fraud and abuse
• Enforce our Terms of Service and Community Guidelines
• Respond to safety concerns and reports
• Verify user identities when required

**Personalize Your Experience:**
• Recommend users, events, and content
• Customize your feed and discovery results
• Provide location-based features

**Marketing (with consent):**
• Send promotional communications
• Show relevant advertisements
• Conduct surveys and research`
    },
    {
      id: 'sharing',
      title: '4. How We Share Your Information',
      icon: Users,
      content: `**With Other Users:**
• Profile information you choose to share publicly
• Messages you send to other users
• Content you post (beacons, events, products)

**With Service Providers:**
• Cloud hosting providers (infrastructure)
• Payment processors (Stripe for payments)
• Analytics providers (usage analysis)
• Email service providers (notifications)
• Content moderation services (safety)

**For Legal Reasons:**
• To comply with legal obligations
• To respond to valid legal requests
• To protect our rights and safety
• To prevent fraud or illegal activity

**Business Transfers:**
• In connection with mergers, acquisitions, or sales of assets, your information may be transferred to the new entity.

**We do NOT:**
• Sell your personal information
• Share your data with advertisers for targeting without consent
• Share your private messages without legal requirement`
    },
    {
      id: 'rights',
      title: '5. Your Rights (GDPR)',
      icon: Shield,
      content: `Under GDPR and applicable data protection laws, you have the following rights:

**Right to Access**: Request a copy of your personal data. Use the Data Export feature in Settings.

**Right to Rectification**: Correct inaccurate personal data through your profile settings.

**Right to Erasure**: Request deletion of your account and personal data. Use the Account Deletion feature in Settings.

**Right to Portability**: Receive your data in a structured, machine-readable format. Our Data Export feature provides JSON and CSV formats.

**Right to Object**: Object to processing of your data for certain purposes, including marketing.

**Right to Restrict Processing**: Request limitation of processing in certain circumstances.

**Right to Withdraw Consent**: Withdraw consent for optional data processing at any time through Settings.

**How to Exercise Your Rights:**
• Use the self-service tools in Settings
• Contact us at privacy@hotmess.london
• We will respond within 30 days`
    },
    {
      id: 'retention',
      title: '6. Data Retention',
      icon: Database,
      content: `We retain your personal information for as long as necessary to provide our services and comply with legal obligations.

**Active Accounts:**
• Profile data retained while account is active
• Messages retained for the duration of conversations
• Transaction data retained for legal and accounting purposes

**After Account Deletion:**
• Most data deleted within 30 days
• Some data retained for legal compliance (up to 7 years for financial records)
• Anonymized data may be retained for analytics

**Retention Periods:**
• Account data: Duration of account + 30 days
• Messages: Duration of account + 30 days
• Transaction records: 7 years (legal requirement)
• Log data: 12 months
• Analytics data: Aggregated and anonymized indefinitely`
    },
    {
      id: 'security',
      title: '7. Data Security',
      icon: Shield,
      content: `We implement appropriate technical and organizational measures to protect your personal information:

**Technical Measures:**
• Encryption in transit (TLS/SSL)
• Encryption at rest for sensitive data
• Secure password hashing
• Regular security audits and testing
• Access controls and authentication

**Organizational Measures:**
• Employee training on data protection
• Limited access to personal data
• Incident response procedures
• Data processing agreements with vendors

**Your Responsibilities:**
• Keep your password secure
• Use two-factor authentication if available
• Log out from shared devices
• Report suspicious activity

**Data Breach Notification:**
In the event of a data breach affecting your personal information, we will notify you and relevant authorities as required by law.`
    },
    {
      id: 'international',
      title: '8. International Transfers',
      icon: Globe,
      content: `Your data may be transferred to and processed in countries outside the UK and European Economic Area (EEA).

**Transfer Mechanisms:**
• Standard Contractual Clauses (SCCs)
• Adequacy decisions by UK/EU authorities
• Binding Corporate Rules where applicable

**Our Providers:**
• Cloud infrastructure may be located in the US and EU
• Payment processing through Stripe (US-based, EU-US Data Privacy Framework)

**Your Protections:**
• All transfers are subject to appropriate safeguards
• We ensure equivalent levels of data protection
• You can request information about specific transfers`
    },
    {
      id: 'cookies',
      title: '9. Cookies & Tracking',
      icon: Eye,
      content: `We use cookies and similar technologies to provide and improve our services.

**Essential Cookies:**
• Authentication and session management
• Security features
• Core platform functionality
• Cannot be disabled

**Analytics Cookies:**
• Usage statistics and patterns
• Performance monitoring
• Help us improve the platform
• Can be disabled in Settings

**Marketing Cookies:**
• Personalized advertisements
• Campaign tracking
• Social media integration
• Requires your consent

**Managing Cookies:**
• Use our cookie consent banner to manage preferences
• Adjust browser settings to block cookies
• Note: Blocking essential cookies may affect functionality

**Other Tracking:**
• We may use pixel tags and similar technologies
• Third-party analytics (with privacy controls)
• No cross-site tracking without consent`
    },
    {
      id: 'children',
      title: '10. Children\'s Privacy',
      icon: Shield,
      content: `HOTMESS is not intended for users under 18 years of age.

**Age Verification:**
• We require age confirmation during registration
• Users must confirm they are 18 or older
• We may request additional verification

**If We Discover Underage Users:**
• Account will be immediately suspended
• Personal data will be deleted
• We may report to relevant authorities if required

**Reporting Underage Users:**
If you believe a user is under 18, please report them through our safety tools or contact safety@hotmess.london.`
    },
    {
      id: 'changes',
      title: '11. Changes to This Policy',
      icon: Settings,
      content: `We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws.

**How We Notify You:**
• Email notification for significant changes
• In-app notification banner
• Updated "Last Modified" date

**Your Options:**
• Review changes before continuing to use the platform
• Contact us with questions or concerns
• Close your account if you disagree with changes

**Effective Date:**
Changes become effective when posted unless otherwise stated. Continued use of the platform after changes constitutes acceptance.`
    },
    {
      id: 'contact',
      title: '12. Contact Us',
      icon: Mail,
      content: `If you have questions about this Privacy Policy or our data practices:

**Email:** privacy@hotmess.london

**Data Protection Officer:**
HOTMESS London OS Limited
Attn: Data Protection Officer
[Address to be provided]

**Supervisory Authority:**
You have the right to lodge a complaint with a supervisory authority. In the UK, this is the Information Commissioner's Office (ICO):
• Website: ico.org.uk
• Phone: 0303 123 1113

**Response Time:**
We aim to respond to all privacy-related inquiries within 30 days.`
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
            <h1 className="text-4xl font-black uppercase">Privacy Policy</h1>
            <p className="text-white/60 text-sm">Last updated: {lastUpdated}</p>
          </div>
        </div>

        <div className="bg-white/5 border-2 border-white/10 p-6 mb-8">
          <h2 className="font-black uppercase mb-4">Quick Navigation</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="text-sm text-[#E62020] hover:text-white transition-colors">
                {section.title}
              </a>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-[#E62020]/20 to-transparent border-l-4 border-[#E62020] p-6 mb-8">
          <p className="text-white/80">
            Your privacy matters to us. This policy explains what data we collect, how we use it, 
            and your rights under GDPR and other data protection laws.
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.id} id={section.id} className="bg-white/5 border-2 border-white/10 p-6 scroll-mt-24">
                <div className="flex items-center gap-3 mb-4">
                  <Icon className="w-6 h-6 text-[#E62020]" />
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
            <a href="mailto:privacy@hotmess.london" className="text-[#E62020] hover:text-white">privacy@hotmess.london</a>
          </p>
        </div>
      </div>
    </div>
  );
}
