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
    <div className="min-h-screen bg-[#0E0E12] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center gap-4 border-b border-white/10 bg-[#0E0E12]/95 backdrop-blur px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="rounded-full p-2 hover:bg-white/10 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">{title}</h1>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-2xl px-4 py-8 prose prose-invert prose-pink">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 px-4 py-6 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} HOTMESS LDN. All rights reserved.
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
      <p><em>Last updated: February 2026</em></p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using HOTMESS ("the Service"), you agree to be bound by 
        these Terms of Service. If you do not agree, do not use the Service.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least 18 years old to use HOTMESS. By using the Service, 
        you represent and warrant that you are 18 or older.
      </p>

      <h2>3. User Conduct</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Harass, threaten, or abuse other users</li>
        <li>Post illegal, harmful, or offensive content</li>
        <li>Impersonate others or misrepresent your identity</li>
        <li>Use the Service for commercial purposes without permission</li>
        <li>Attempt to access other users' accounts</li>
        <li>Violate any applicable laws</li>
      </ul>

      <h2>4. Content</h2>
      <p>
        You retain ownership of content you post. By posting, you grant HOTMESS 
        a license to display, distribute, and promote your content within the Service.
      </p>

      <h2>5. Safety</h2>
      <p>
        The SOS and safety features are provided as aids, not guarantees. In 
        emergencies, always contact local emergency services directly.
      </p>

      <h2>6. Termination</h2>
      <p>
        We may suspend or terminate accounts that violate these terms. You may 
        delete your account at any time via Settings.
      </p>

      <h2>7. Limitation of Liability</h2>
      <p>
        HOTMESS is provided "as is" without warranties. We are not liable for 
        any damages arising from your use of the Service.
      </p>

      <h2>8. Governing Law</h2>
      <p>
        These terms are governed by the laws of England and Wales.
      </p>

      <h2>9. Contact</h2>
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
