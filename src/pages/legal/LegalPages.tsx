/**
 * Legal Pages — About, Legal, Accessibility, Privacy Policy
 * 
 * Required for:
 * - UK/EU GDPR compliance
 * - App store submission
 * - User trust
 */

import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LegalPageProps {
  title: string;
  children: React.ReactNode;
}

function LegalPageLayout({ title, children }: LegalPageProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center gap-4 border-b border-white/[0.06] bg-[#050507]/95 backdrop-blur-xl px-4 py-4">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full w-10 h-10 flex items-center justify-center hover:bg-white/[0.06] active:scale-95 transition-all"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5 text-white/60" />
        </button>
        <h1 className="text-base font-bold tracking-wide">{title}</h1>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-6 py-8 prose prose-invert prose-sm prose-headings:text-white/90 prose-headings:font-bold prose-headings:tracking-wide prose-p:text-white/60 prose-li:text-white/60 prose-a:text-[#C8962C] prose-a:no-underline hover:prose-a:underline prose-strong:text-white/80">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-6 py-8 text-center text-xs text-white/20 font-medium tracking-wider uppercase">
        {new Date().getFullYear()} HOTMESS LDN
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ABOUT PAGE
// ─────────────────────────────────────────────────────────────────────────────

export function AboutPage() {
  return (
    <LegalPageLayout title="About HOTMESS">
      <h2>What is HOTMESS?</h2>
      <p>
        HOTMESS is the queer nightlife super-app. We combine social discovery, 
        events, safety features, commerce, and live radio into one platform 
        designed for the LGBTQ+ community.
      </p>

      <h2>Our Mission</h2>
      <p>
        To create the safest, most connected, and most fun way for queer people 
        to explore nightlife — from pre-game to aftercare.
      </p>

      <h2>Features</h2>
      <ul>
        <li><strong>Ghosted Mode</strong> — Discover people nearby</li>
        <li><strong>Pulse Globe</strong> — 3D map of live events and beacons</li>
        <li><strong>Safety OS</strong> — SOS button, fake call, emergency contacts</li>
        <li><strong>HOTMESS Radio</strong> — 24/7 live shows</li>
        <li><strong>Market</strong> — Shop merch and preloved items</li>
        <li><strong>Personas</strong> — Multiple identities for different contexts</li>
      </ul>

      <h2>Contact</h2>
      <p>
        Email: <a href="mailto:hello@hotmessldn.com">hello@hotmessldn.com</a>
      </p>
      <p>
        Based in London, UK 🇬🇧
      </p>
    </LegalPageLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LEGAL PAGE (Terms of Service)
// ─────────────────────────────────────────────────────────────────────────────

export function LegalPage() {
  return (
    <LegalPageLayout title="Terms of Service">
      <p><em>Last updated: April 2026</em></p>

      <h2>1. Overview</h2>
      <p>
        HOTMESS is a members-only platform providing access to music, content,
        marketplace features, and community tools. By using HOTMESS, you agree
        to these Terms. You must be 18+ to use this platform.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You are responsible for maintaining your account security and all
        activity under your account. We may suspend or terminate accounts
        that violate these Terms.
      </p>

      <h2>3. Membership &amp; Access</h2>
      <p>HOTMESS offers:</p>
      <ul>
        <li><strong>Free access</strong> — preview only</li>
        <li><strong>Paid membership</strong> — full streaming access</li>
        <li><strong>Paid stem purchases</strong> — producer access</li>
      </ul>
      <p>You are purchasing <strong>access</strong>, not ownership.</p>

      <h2>4. Music Usage</h2>
      <p>
        All music on HOTMESS is owned by HOTMESS / RAW CONVICT RECORDS.
      </p>
      <p>You may:</p>
      <ul>
        <li>Preview tracks</li>
        <li>Stream tracks (if a member)</li>
      </ul>
      <p>You may not:</p>
      <ul>
        <li>Download audio (unless explicitly provided)</li>
        <li>Redistribute or re-upload tracks</li>
        <li>Extract audio from streams</li>
        <li>Claim ownership of any content</li>
      </ul>

      <h2>5. Stem Purchases</h2>
      <p>When purchasing stems, you receive:</p>
      <ul>
        <li>Downloadable audio files (WAV, studio quality)</li>
        <li>Limited remix rights (see <a href="/legal/remix-license">Remix License</a>)</li>
      </ul>
      <p>You do not receive ownership or commercial release rights.</p>

      <h2>6. Marketplace (Preloved / Products)</h2>
      <p>
        Users may list items for sale. You agree that listings are accurate,
        items are legal, and transactions are honest. HOTMESS is not liable
        for disputes between buyers and sellers.
      </p>

      <h2>7. Prohibited Use</h2>
      <p>You may not:</p>
      <ul>
        <li>Upload illegal or stolen content</li>
        <li>Harass or abuse other users</li>
        <li>Misuse safety features</li>
        <li>Attempt to extract or scrape platform content</li>
        <li>Use the Service for commercial purposes without permission</li>
      </ul>

      <h2>8. Safety Features</h2>
      <p>
        The SOS and safety features are provided as aids, not guarantees.
        In emergencies, always contact local emergency services directly.
      </p>

      <h2>9. Content Ownership</h2>
      <p>
        All platform content including music, branding, and visuals belongs
        to HOTMESS unless otherwise stated. User-generated content (posts,
        listings) remains yours, but you grant HOTMESS a licence to display
        it within the Service.
      </p>

      <h2>10. Termination</h2>
      <p>
        We may remove content, suspend accounts, or terminate access at our
        discretion. You may delete your account at any time via Settings.
      </p>

      <h2>11. Payments &amp; Refunds</h2>
      <p>All sales are final unless:</p>
      <ul>
        <li>Files are corrupted or delivery fails</li>
      </ul>
      <p>No refunds for change of mind or misunderstanding of access terms.</p>

      <h2>12. Limitation of Liability</h2>
      <p>
        HOTMESS is provided "as is" without warranties. We are not liable for
        user-generated misuse, third-party platform uploads, or unauthorised
        remix releases.
      </p>

      <h2>13. Changes</h2>
      <p>
        We may update these Terms at any time. Continued use constitutes
        acceptance of the updated Terms.
      </p>

      <h2>14. Governing Law</h2>
      <p>These terms are governed by the laws of England and Wales.</p>

      <h2>15. Contact</h2>
      <p>
        Questions? Email <a href="mailto:legal@hotmessldn.com">legal@hotmessldn.com</a>
      </p>
    </LegalPageLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESSIBILITY PAGE
// ─────────────────────────────────────────────────────────────────────────────

export function AccessibilityPage() {
  return (
    <LegalPageLayout title="Accessibility">
      <h2>Our Commitment</h2>
      <p>
        HOTMESS is committed to ensuring digital accessibility for people with 
        disabilities. We are continually improving the user experience for 
        everyone and applying the relevant accessibility standards.
      </p>

      <h2>Standards</h2>
      <p>
        We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 
        Level AA. These guidelines explain how to make web content more 
        accessible for people with disabilities.
      </p>

      <h2>Features</h2>
      <ul>
        <li>Keyboard navigation support</li>
        <li>Screen reader compatibility</li>
        <li>High contrast mode support</li>
        <li>Focus indicators on interactive elements</li>
        <li>Alternative text for images</li>
        <li>Scalable text and responsive design</li>
      </ul>

      <h2>Known Issues</h2>
      <p>
        The 3D globe in Pulse Mode may not be fully accessible to screen readers. 
        We provide alternative views where possible.
      </p>

      <h2>Feedback</h2>
      <p>
        We welcome your feedback on the accessibility of HOTMESS. Please contact 
        us at <a href="mailto:accessibility@hotmessldn.com">accessibility@hotmessldn.com</a>
      </p>
    </LegalPageLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REMIX LICENSE PAGE
// ─────────────────────────────────────────────────────────────────────────────

export function RemixLicensePage() {
  return (
    <LegalPageLayout title="Remix License">
      <p><em>Last updated: April 2026</em></p>

      <h2>HOTMESS REMIX LICENSE</h2>
      <p>This license applies to all stem purchases made through HOTMESS.</p>

      <h2>1. What You Get</h2>
      <p>When you purchase stems, you receive:</p>
      <ul>
        <li>WAV audio stems (drums, bass, vocals, FX)</li>
        <li>Downloadable files in studio quality (16-bit or 24-bit)</li>
        <li>Remix-ready material</li>
        <li>Instant download + saved to your account</li>
      </ul>

      <h2>2. What You Can Do</h2>
      <ul>
        <li>Create remixes and edits</li>
        <li>Use stems in DJ sets</li>
        <li>Share mixes in non-commercial contexts</li>
        <li>Experiment, learn, and produce new versions</li>
      </ul>

      <h2>3. What You Cannot Do</h2>
      <ul>
        <li>Release commercially (Spotify, Apple Music, Beatport, etc.)</li>
        <li>Monetise directly</li>
        <li>Sell or redistribute stems</li>
        <li>Claim ownership of the original work</li>
        <li>Upload to distribution platforms as your own release</li>
      </ul>

      <h2>4. Ownership</h2>
      <p>
        All rights remain with <strong>HOTMESS / RAW CONVICT RECORDS</strong>.
        This includes master recordings, composition, and branding.
      </p>

      <h2>5. Commercial Use</h2>
      <p>
        If you want to release a remix commercially or monetise your version,
        you must request a <a href="/legal/commercial-license">Commercial License</a>.
        This is handled separately and not included in your stem purchase.
      </p>

      <h2>6. License Terms</h2>
      <p>This license is:</p>
      <ul>
        <li>Non-exclusive</li>
        <li>Non-transferable</li>
        <li>Personal use only</li>
      </ul>

      <h2>7. Breach</h2>
      <p>Violation of this license may result in:</p>
      <ul>
        <li>Account suspension</li>
        <li>Removal of access</li>
        <li>Legal action if necessary</li>
      </ul>

      <h2>8. Summary</h2>
      <p>
        You are buying <strong>access to create</strong>. You are not buying
        ownership or release rights.
      </p>

      <h2>9. Contact</h2>
      <p>
        For licensing requests: <a href="mailto:legal@hotmessldn.com">legal@hotmessldn.com</a>
      </p>
    </LegalPageLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMERCIAL LICENSE PAGE
// ─────────────────────────────────────────────────────────────────────────────

export function CommercialLicensePage() {
  return (
    <LegalPageLayout title="Commercial Remix License">
      <p><em>Last updated: April 2026</em></p>

      <h2>HOTMESS COMMERCIAL REMIX LICENSE</h2>
      <p>
        This license applies when HOTMESS grants permission for a remix to
        be commercially released. Commercial use is NOT granted by default
        and requires approval.
      </p>

      <h2>1. What This License Grants</h2>
      <p>If approved, you may:</p>
      <ul>
        <li>Release the remix on streaming platforms (Spotify, Apple Music, etc.)</li>
        <li>Monetise the remix</li>
        <li>Distribute via digital stores (e.g. Beatport)</li>
      </ul>

      <h2>2. Ownership</h2>
      <p>
        Ownership remains with <strong>HOTMESS / RAW CONVICT RECORDS</strong>.
        You are granted a limited commercial usage right, not ownership.
      </p>

      <h2>3. Revenue Terms</h2>
      <p>Commercial releases may include:</p>
      <ul>
        <li>Revenue split agreements</li>
        <li>Royalty structure</li>
        <li>Or fixed licensing fee</li>
      </ul>
      <p>Terms are defined per release.</p>

      <h2>4. Approval Required</h2>
      <p>
        You must NOT release any remix commercially unless HOTMESS has approved
        it and a commercial agreement has been executed.
      </p>

      <h2>5. Credit Requirements</h2>
      <p>All approved releases must include:</p>
      <ul>
        <li>Original by: HOTMESS / RAW CONVICT RECORDS</li>
        <li>Remix by: [Your Name]</li>
      </ul>

      <h2>6. Restrictions</h2>
      <p>You may not:</p>
      <ul>
        <li>Sublicense the remix</li>
        <li>Claim full ownership</li>
        <li>Distribute without agreement</li>
      </ul>

      <h2>7. Contact</h2>
      <p>
        For commercial remix requests: <a href="mailto:legal@hotmessldn.com">legal@hotmessldn.com</a>
      </p>
    </LegalPageLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATOR AGREEMENT PAGE
// ─────────────────────────────────────────────────────────────────────────────

export function CreatorAgreementPage() {
  return (
    <LegalPageLayout title="Creator Agreement">
      <p><em>Last updated: April 2026</em></p>

      <h2>HOTMESS CREATOR AGREEMENT</h2>
      <p>
        This agreement applies to users who purchase stems, create remixes,
        or contribute content to the HOTMESS ecosystem.
      </p>

      <h2>1. Your Role</h2>
      <p>
        You are a creator within the HOTMESS ecosystem. You may remix, edit,
        and experiment with purchased stems.
      </p>

      <h2>2. Ownership</h2>
      <p>
        All original content remains owned by <strong>HOTMESS / RAW CONVICT
        RECORDS</strong>. Your remix does not grant ownership of the original work.
      </p>

      <h2>3. Your Rights</h2>
      <ul>
        <li>Create remixes</li>
        <li>Use in DJ sets</li>
        <li>Share non-commercially</li>
      </ul>

      <h2>4. Your Responsibilities</h2>
      <ul>
        <li>Respect licensing terms</li>
        <li>Do not misuse content</li>
        <li>Do not distribute illegally</li>
      </ul>

      <h2>5. Commercial Opportunities</h2>
      <p>
        HOTMESS may select remixes for official release or offer commercial
        agreements. Participation is optional.
      </p>

      <h2>6. Conduct</h2>
      <p>
        You must behave respectfully, not abuse platform tools, and follow
        community standards.
      </p>

      <h2>7. Contact</h2>
      <p>
        For creator inquiries: <a href="mailto:legal@hotmessldn.com">legal@hotmessldn.com</a>
      </p>
    </LegalPageLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DMCA / COPYRIGHT & ABUSE POLICY
// ─────────────────────────────────────────────────────────────────────────────

export function DMCAPage() {
  return (
    <LegalPageLayout title="Copyright &amp; Abuse Policy">
      <p><em>Last updated: April 2026</em></p>

      <h2>1. Overview</h2>
      <p>
        HOTMESS respects intellectual property rights and user safety. We
        provide mechanisms to report copyright infringement, abusive
        behaviour, and illegal content.
      </p>

      <h2>2. Copyright Infringement (DMCA)</h2>
      <p>
        If you believe your work has been used without permission, you may
        submit a takedown request including:
      </p>
      <ul>
        <li>Your name and contact details</li>
        <li>Description of the copyrighted work</li>
        <li>Location (URL or content reference) of the infringing material</li>
        <li>Statement of good faith belief</li>
        <li>Statement under penalty of perjury</li>
      </ul>
      <p>
        Send requests to: <a href="mailto:dmca@hotmessldn.com">dmca@hotmessldn.com</a>
      </p>

      <h2>3. Our Response</h2>
      <p>We may remove content, restrict accounts, and investigate claims.
        Repeated violations may result in permanent bans.</p>

      <h2>4. Counter-Notification</h2>
      <p>
        Users may submit a counter-notice if they believe content was
        removed in error.
      </p>

      <h2>5. Abuse Reporting</h2>
      <p>Users can report harassment, threats, illegal listings, and unsafe
        behaviour via in-app report tools or by emailing support.</p>

      <h2>6. Zero Tolerance</h2>
      <p>We enforce strict action against exploitation, harassment, and
        illegal activity.</p>

      <h2>7. Disclaimer</h2>
      <p>
        HOTMESS is not responsible for user-generated content but will act
        upon verified reports.
      </p>

      <h2>8. Contact</h2>
      <p>
        Report issues to: <a href="mailto:support@hotmessldn.com">support@hotmessldn.com</a>
      </p>
    </LegalPageLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVACY POLICY PAGE
// ─────────────────────────────────────────────────────────────────────────────

export function PrivacyPolicyPage() {
  return (
    <LegalPageLayout title="Privacy Policy">
      <p><em>Last updated: February 2026</em></p>

      <h2>1. Information We Collect</h2>
      <p>We collect information you provide directly:</p>
      <ul>
        <li>Account information (email, display name, photos)</li>
        <li>Profile information (bio, preferences, location)</li>
        <li>Messages and content you share</li>
        <li>Transaction data for purchases</li>
      </ul>

      <p>We automatically collect:</p>
      <ul>
        <li>Device information</li>
        <li>Location data (with your permission)</li>
        <li>Usage analytics</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To provide and improve the Service</li>
        <li>To match you with nearby users</li>
        <li>To send notifications about activity</li>
        <li>To process transactions</li>
        <li>To ensure safety and security</li>
      </ul>

      <h2>3. Data Sharing</h2>
      <p>
        We do not sell your personal data. We may share data with:
      </p>
      <ul>
        <li>Service providers (hosting, payments, analytics)</li>
        <li>Law enforcement when legally required</li>
        <li>Other users as part of the Service (e.g., your profile)</li>
      </ul>

      <h2>4. Your Rights (GDPR)</h2>
      <p>If you're in the UK/EU, you have the right to:</p>
      <ul>
        <li>Access your personal data</li>
        <li>Correct inaccurate data</li>
        <li>Delete your data</li>
        <li>Export your data</li>
        <li>Object to processing</li>
        <li>Withdraw consent</li>
      </ul>
      <p>
        To exercise these rights, go to Settings → Privacy → Data Export or 
        email <a href="mailto:privacy@hotmessldn.com">privacy@hotmessldn.com</a>
      </p>

      <h2>5. Data Retention</h2>
      <p>
        We retain your data while your account is active. After deletion, we 
        remove your data within 30 days (except where legally required to retain).
      </p>

      <h2>6. Security</h2>
      <p>
        We use encryption, secure protocols, and access controls to protect 
        your data. However, no system is 100% secure.
      </p>

      <h2>7. Cookies</h2>
      <p>
        We use cookies for authentication, preferences, and analytics. See our 
        Cookie Banner for options.
      </p>

      <h2>8. Contact</h2>
      <p>
        Data Protection Officer: <a href="mailto:privacy@hotmessldn.com">privacy@hotmessldn.com</a>
      </p>
    </LegalPageLayout>
  );
}
