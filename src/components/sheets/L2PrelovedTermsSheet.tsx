/**
 * L2PrelovedTermsSheet -- Preloved Terms of Use
 *
 * Structured legal terms for lawyer review.
 * Chat-first, 18+, gay male audience, peer-to-peer.
 * Colour: #9E7D47 (preloved brown)
 */

import React from 'react';
import { useSheet } from '@/contexts/SheetContext';
import { X, Shield } from 'lucide-react';

const PRELOVED_BROWN = '#9E7D47';

interface SectionProps {
  number: string;
  title: string;
  children: React.ReactNode;
}

function Section({ number, title, children }: SectionProps) {
  return (
    <div className="mb-6">
      <h3 className="text-white font-bold text-sm mb-2">
        <span className="text-white/30 mr-1.5">{number}.</span>
        {title}
      </h3>
      <div className="text-white/40 text-xs leading-relaxed space-y-2">
        {children}
      </div>
    </div>
  );
}

export default function L2PrelovedTermsSheet() {
  const { closeSheet } = useSheet();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between h-12 px-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" style={{ color: PRELOVED_BROWN }} />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Preloved Terms</h2>
        </div>
        <button onClick={() => closeSheet()} className="w-8 h-8 flex items-center justify-center">
          <X className="w-5 h-5 text-white/30" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="text-white/25 text-[10px] uppercase tracking-wider mb-4">
          Draft for legal review. Last updated: April 2026.
        </p>

        <Section number="1" title="What Preloved Is">
          <p>Preloved is a peer-to-peer feature inside HOTMESS that allows users to list, discover, and exchange items with other users.</p>
          <p>Preloved is chat-first, proximity-aware, and user-to-user. It is not a store, reseller, or fulfilment service.</p>
          <p>HOTMESS does not own, store, or ship items listed by users unless explicitly stated.</p>
        </Section>

        <Section number="2" title="Who Can Use Preloved">
          <p>You must be 18 years or older, have a valid HOTMESS account, and comply with all HOTMESS policies including Community Standards and Privacy.</p>
          <p>Preloved is designed for an adult, gay male audience. Content may be culturally coded and suggestive, but must remain lawful and non-explicit.</p>
        </Section>

        <Section number="3" title="Nature of Transactions">
          <p>All Preloved transactions are between users. HOTMESS is not the seller or buyer, does not take ownership of items, and does not guarantee condition, legality, or delivery.</p>
          <p>Any agreement made through chat is between the users involved.</p>
        </Section>

        <Section number="4" title="Seller Responsibilities">
          <p>If you list an item, you must: own the item or have the right to sell it; describe it accurately; disclose major flaws or damage; upload real images; set a clear price; and mark it as sold when no longer available.</p>
          <p>You must not: mislead buyers; list prohibited or illegal items; post explicit sexual content; use listings to offer services instead of goods; or pressure or manipulate buyers.</p>
        </Section>

        <Section number="5" title="Buyer Responsibilities">
          <p>If you engage with a listing, you must: use your own judgment; ask questions before agreeing; and arrange payment and exchange responsibly.</p>
          <p>You acknowledge that HOTMESS does not verify listings or sellers and all exchanges are at your own risk, subject to applicable law.</p>
        </Section>

        <Section number="6" title="Payments">
          <p>Payments are arranged between users. HOTMESS does not process or guarantee payment unless explicitly stated. Use secure methods where possible. Never share sensitive financial information publicly.</p>
        </Section>

        <Section number="7" title="Delivery and Meetups">
          <p>Listings may offer pickup, shipping, or both. Exact addresses must not be public. Use chat to agree details. Meet in safe, public locations where possible.</p>
          <p>HOTMESS may provide safety reminders but is not responsible for in-person interactions.</p>
        </Section>

        <Section number="8" title="Prohibited Listings">
          <p>You may not list: illegal items; anything involving minors; explicit pornographic content; drugs or controlled substances; weapons; stolen or counterfeit goods; prescription medication; bodily fluids or unsafe used items; or services framed as escorting or sex work.</p>
          <p>HOTMESS may remove any listing at its discretion.</p>
        </Section>

        <Section number="9" title="Safety and Conduct">
          <p>You must not harass, threaten, coerce, impersonate others, attempt fraud, or arrange unsafe or non-consensual situations.</p>
          <p>Users can block, report, and disengage at any time. HOTMESS may suspend or remove accounts for violations.</p>
        </Section>

        <Section number="10" title="Moderation">
          <p>HOTMESS may remove listings, restrict visibility, pause accounts, and review content for safety concerns, legal risk, policy violations, or low trust signals.</p>
          <p>Moderation decisions may be final, subject to legal obligations.</p>
        </Section>

        <Section number="11" title="No Guarantees">
          <p>Preloved is provided "as is." HOTMESS does not guarantee item quality, authenticity, availability, or successful transactions.</p>
        </Section>

        <Section number="12" title="Limitation of Liability">
          <p>To the extent permitted by law, HOTMESS is not liable for failed transactions, disputes between users, loss or damage during exchange, or in-person meetup risks.</p>
          <p>Nothing in these terms excludes rights that cannot be excluded under applicable law.</p>
        </Section>

        <Section number="13" title="Indemnity">
          <p>You agree to indemnify HOTMESS against claims arising from unlawful listings, misleading content, harmful or unsafe conduct, or violations of these terms.</p>
        </Section>

        <Section number="14" title="Reporting">
          <p>You can report listings, users, and messages. HOTMESS may investigate but is not obligated to resolve all disputes.</p>
        </Section>

        <Section number="15" title="Changes">
          <p>These terms may be updated. Continued use of Preloved means you accept the updated terms where legally permitted.</p>
        </Section>

        <div className="mt-6 mb-4 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <p className="text-white/30 text-[10px] leading-relaxed">
            Preloved is built for real people, real items, real interaction. Stay sharp. Stay respectful. Stay in control.
          </p>
        </div>
      </div>
    </div>
  );
}
