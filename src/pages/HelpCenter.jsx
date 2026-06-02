import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  ChevronRight,
  ChevronDown,
  Mail,
  Book,
  Shield,
  CreditCard,
  User,
  MapPin,
  HelpCircle,
  ExternalLink,
  ShoppingBag,
  Music,
  Drama,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

// Phil 2026-05-31 — full content rewrite.
//
// The prior version had multiple brand-incorrect / stale references that
// Phil flagged ("THIS IS DEFINATLY STATE AS IT SAYS XP" + "ALL OF IT NEEDS
// LOOKING OVER AS THE PLATFORM HAS GROWN SO MUCH"):
//
//   - Tier copy described BASIC / PLUS / CHROME with "2x XP and stealth
//     mode" + "unmasked viewers and premium support." These were
//     gamification-era names. The live tier ladder (membership_tiers
//     table) is MESS (free) / HOTMESS (£7.99) / CONNECTED (£19.99) /
//     PROMOTER (£44.99) / VENUE (£99.99) wired to real entitlements
//     (has_full_music, has_full_ghosted, has_messaging,
//     beacon_drops_monthly, has_dial_a_daddy, has_hand_n_hand, etc).
//   - "XP" doesn't exist as a system. "Challenges" framed as XP-earning
//     is dead.
//   - "Global nightlife discovery platform" was a generic positioning
//     line. HOTMESS is built for gay men — Pulse globe, Ghosted grid,
//     Care suite, Radio, Music, Market — a queer-men's OS, not a
//     generic events app.
//   - "Connection request (handshake)" was the old language for the
//     mutual boo mechanic (D24 trust events, D25 messaging gates).
//   - "Panic button" was the old language for Silent SOS (D08 + Care).
//   - "Settings > Edit Profile / Profile picture" was stale guidance —
//     profile editing now lives ONLY behind the top-right TopHUD avatar
//     (Phil 2026-05-31 doctrine: one identity surface).
//   - "Live Chat" was a fake button — no live chat exists; replaced
//     with Telegram community channel.
//   - support@hotmess.app was inconsistent with hotmess.london
//     used everywhere else (Community Guidelines, legal pages).
//
// This rewrite mirrors the live platform reality. No XP. No fake
// channels. Real tier ladder. Real connection language. Real care
// surface. Gay men's space.
const FAQ_CATEGORIES = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    icon: Book,
    faqs: [
      {
        q: 'What is HOTMESS?',
        a: "HOTMESS is a queer men's OS — built for gay men, by gay men. Trans men and bi men connecting with men are part of the community. It bundles Pulse (a live globe of who's around, what's on, what's open), Ghosted (the grid), Care (Silent SOS, Trusted Contacts, harm-reduction-aware aftercare), Market (shop + HNH MESS + Drops + Preloved), and HOTMESS Radio (always free). It's a place to get off, connect, recover, build, and be held.",
      },
      {
        q: 'How do I create an account?',
        a: 'Sign up with email, Google, or Apple. You must be 18+ — age is verified at signup and again as part of identity verification. Splash → Bridge → Age gate → Sign up → Onboarding (profile, vibe, safety, location). If you already have an account, sign in with the same provider.',
      },
      {
        q: 'How do I complete my profile?',
        a: "Tap your avatar in the top-right (TopHUD) to open your profile editor — that's the only place profile editing lives. Add a recent photo that genuinely looks like you, your scene, your vibe, what you're looking for tonight. A complete profile means the Pulse globe and Ghosted grid can actually find you the right boys.",
      },
      {
        q: 'What are personas?',
        a: "Personas are how you switch modes inside one HOTMESS identity — Daddy, Brat, Pup, Top, Bottom, Boy, Recovery, Civilian. They're real expressions of you, not fake profiles. You always run one identity; personas are the lens. MESS gets 1 persona, HOTMESS gets 2, CONNECTED gets 5, PROMOTER + VENUE get unlimited.",
      },
      {
        q: 'How do I verify my profile?',
        a: 'Identity verification happens through the verification flow accessible from Settings. Some features (selling on Preloved, running events, venue dashboard) require verification. The minimum age floor is 18 — verified at signup and re-checked at verification.',
      },
    ],
  },
  {
    id: 'pulse-beacons',
    name: 'Pulse & Beacons',
    icon: MapPin,
    faqs: [
      {
        q: 'What is Pulse?',
        a: "Pulse is the live globe. Macro view shows the world breathing — where it's nightlife, where it's daytime, where the queer signal is loud. Zoom in and it becomes a local map: venues, events, care spots, and beacons dropped by real boys in real time. It's the spatial heart of HOTMESS.",
      },
      {
        q: 'What are Beacons?',
        a: 'Beacons are signals you drop on the globe — "I\'m here, I\'m up for X, until Y." They can be a hookup intent, a venue check-in, an event flag, a route, or a care/aftercare drop. Other boys see them in real time. Beacons decay automatically (D14: routing as continuity, beacons as living signals — not pins forever).',
      },
      {
        q: 'How many beacons can I drop?',
        a: 'It depends on your tier. MESS: 0/month (you can browse, not drop). HOTMESS: 3/month. CONNECTED: 10/month. PROMOTER: 20/month. VENUE: unlimited. Beta cohort (Founding 250) gets 4/day for the beta window — the cap renews daily, not monthly.',
      },
      {
        q: 'How do I get directions to a beacon?',
        a: 'Tap any beacon, then tap Directions in the sheet. HOTMESS draws an in-app route from your location to the beacon. The route only draws when your origin is reasonably close to the destination — no globe-spanning lines (D14 §0).',
      },
      {
        q: 'What are care beacons?',
        a: 'Care beacons are aftercare-aware drops curated by HOTMESS — quiet spaces, recovery-friendly venues, places to land after a heavy night. Vauxhall, Soho, and a few other London spots are seeded. The icon language is distinct so care beacons read as care, not party (D15: HOTMESS Care Language).',
      },
    ],
  },
  {
    id: 'ghosted-chat',
    name: 'Ghosted & Chat',
    icon: User,
    faqs: [
      {
        q: 'What is Ghosted?',
        a: 'Ghosted is the grid — a queer-men dating/hookup/connection surface. You see other men nearby (or globally, depending on filters), their personas, their vibes, what they\'re looking for tonight. Tap a card for the full profile sheet.',
      },
      {
        q: 'How do I see the full Ghosted grid?',
        a: "On MESS (free) you see 3 previews — the rest is fogged. HOTMESS, CONNECTED, PROMOTER, and VENUE see the full grid. Beta cohort (Founding 250 + Phil's open test accounts) sees the full grid for free during the beta window.",
      },
      {
        q: 'How do I connect with someone? What\'s a boo?',
        a: 'You boo (the HOTMESS handshake — a mutual interest signal). When two of you have boo\'d each other, that\'s a mutual boo and chat unlocks. No cold-messaging strangers — the boo gate keeps Ghosted clean and intentional (D24 trust + D25 messaging doctrine).',
      },
      {
        q: 'Why can\'t I message someone directly?',
        a: 'Messaging requires (1) HOTMESS tier or higher (has_messaging entitlement) AND (2) a mutual boo. The boo-first rule is structural, not a paywall — even on paid tiers you can\'t cold-message without a mutual boo. This is the structural protection against unwanted DMs.',
      },
      {
        q: 'What\'s in my inbox?',
        a: 'Inbox is unified: boos in, mutuals, messages, system pings. You can filter by category. Inbox identity matches the counterpart — name + photo per row, dynamic sheet title.',
      },
      {
        q: 'How do I block or report someone?',
        a: "Open their profile sheet → three-dot menu → Block or Report. Blocks are immediate and silent (they don't see your profile, you don't see theirs). Reports go to the HOTMESS moderation team and are reviewed within 24 hours.",
      },
    ],
  },
  {
    id: 'care-safety',
    name: 'Care & Safety',
    icon: Shield,
    faqs: [
      {
        q: 'What is the Silent SOS?',
        a: "The shield icon (top-right area, page-aware) is HOTMESS's Silent SOS. Tap-and-hold (or tap then confirm) and your live location + an alert is sent to your Trusted Contacts via Telegram (and SMS as a paid fallback). It's silent — no audible alarm, no screen flash — designed for situations where drawing attention is the danger.",
      },
      {
        q: 'How do I set up Trusted Contacts?',
        a: 'Go to Care → Trusted Contacts. Add the people you want notified if you trigger Silent SOS or miss a safety check-in. Trusted Contacts are paired into the Telegram dispatcher. You can also pair a contact for SMS fallback (paid tiers, costs are capped).',
      },
      {
        q: 'How do safety check-ins work?',
        a: "Before a hookup or meet, set a check-in time. At that time HOTMESS pings you. If you confirm, nothing happens. If you don't respond within the window, your Trusted Contacts are alerted with your last known location and the check-in context (where you were going, who you said you were meeting).",
      },
      {
        q: 'What is off-grid mode?',
        a: 'Off-grid is real invisibility — not a label. Toggle it in Settings and you stop rendering on the Pulse globe and in the Ghosted grid for non-mutuals. Mutual boos still see you (you opted in to them); strangers can\'t (D08 visibility-state doctrine).',
      },
      {
        q: 'Who can see my location?',
        a: 'Your location is fuzzy by default — others see approximate distance/area, not your exact spot. Settings → Privacy lets you choose precise / fuzzy (recommended) / hidden. Your raw lat/lng is never exposed to anyone else.',
      },
      {
        q: 'Does HOTMESS share HIV status, PrEP, or recovery status?',
        a: "Never automatically. What you put in your profile, you put there. Outing someone else's status (HIV, PrEP, U=U, recovery, sobriety) without consent violates the Community Guidelines and is a hard-line breach.",
      },
      {
        q: 'What is harm reduction on HOTMESS?',
        a: "HOTMESS is harm-reduction-aware, not abstinence-policing. We don't ban you for being high, sober, neg, poz, or on PrEP. We do expect you to look after the boys around you — aftercare is part of the act, recovery is a community job, and pushing substances on someone sober is out.",
      },
    ],
  },
  {
    id: 'market',
    name: 'Market & Shop',
    icon: ShoppingBag,
    faqs: [
      {
        q: "What's in the Market?",
        a: 'Market is split into three engines: SHOP (HOTMESS + HNH MESS apparel, lubes, smart-tech), DROPS (limited releases), and PRELOVED (peer-to-peer resale — sell your gear). All three live behind the Market tab.',
      },
      {
        q: 'What is HNH MESS?',
        a: 'HNH MESS (Hand N Hand) is the HOTMESS care-focused intimate wellness range — lubes, aftercare, intimate products designed for queer men. Built for the act AND the aftercare.',
      },
      {
        q: 'How do I sell on Preloved?',
        a: "You need a CONNECTED tier (£19.99/month) or higher to sell. CONNECTED gets 20 listings + seller dashboard + analytics. PROMOTER and VENUE get unlimited listings. Open Market → Preloved → list an item. Listings go through a quick admin review before they're live.",
      },
      {
        q: 'How does checkout work?',
        a: 'Checkout runs through Stripe. We accept major cards, Apple Pay, and Google Pay. HOTMESS holds no funds — Stripe is the source of truth (D21 payment doctrine). Refund and cancellation policy lives at /legal and on the receipt.',
      },
      {
        q: 'Is there a discount for first purchase?',
        a: 'Yes — first-time buyers on HNH MESS get 10% off auto-applied at checkout. The discount surfaces in the cart, not as a persistent toast.',
      },
    ],
  },
  {
    id: 'music-radio',
    name: 'Music & Radio',
    icon: Music,
    faqs: [
      {
        q: 'Is HOTMESS Radio free?',
        a: 'Always. Radio streams on every tier, including MESS (free). The radio icon is in the page rail.',
      },
      {
        q: "What's the Music library?",
        a: 'The Music page is the Smash Daddys catalogue — original tracks, sets, releases. MESS gets 90-second previews. HOTMESS and above get full playback. The PROMOTER tier (£44.99/month) gets a Radio slot — you can host your own segment.',
      },
      {
        q: 'How do I follow a track or release?',
        a: 'Tap the heart on any track or release page to bookmark it (HOTMESS tier and above). The Music page has its own browse-all flow + album/release pages.',
      },
    ],
  },
  {
    id: 'membership',
    name: 'Membership & Billing',
    icon: CreditCard,
    faqs: [
      {
        q: 'What are the membership tiers?',
        a: 'Five tiers. MESS (free): age-verified entry, browse Pulse, 3 Ghosted previews (rest fogged), Radio always free, buy anything. HOTMESS (£7.99/month): full Ghosted, taps, messaging (with mutual boo), full Smash Daddys music, Dial-A-Daddy, Hand N Hand, 3 beacon drops/month, 2 personas. CONNECTED (£19.99/month): everything HOTMESS + sell on Preloved (20 listings) + creator dashboard + analytics + brand page + 10 beacon drops/month + 5 personas. PROMOTER (£44.99/month): everything CONNECTED + create events + sell tickets + guestlists + Radio slot + 20 beacon drops/month + unlimited personas. VENUE (£99.99/month): everything PROMOTER + venue dashboard + door staff app + Stripe Connect payouts + permanent Globe presence + unlimited beacon drops + business billing.',
      },
      {
        q: 'How do I upgrade my membership?',
        a: 'More → Membership shows the ladder. Pick a tier and check out via Stripe. The upgrade applies immediately — entitlements (has_full_music, has_full_ghosted, has_messaging, etc.) unlock right away.',
      },
      {
        q: 'How do I cancel my subscription?',
        a: "More → Membership → Cancel subscription. You keep access to the paid features until the end of your billing period, then drop back to MESS automatically. We don't run dark patterns.",
      },
      {
        q: 'How do I update my payment method?',
        a: 'More → Membership → Manage Payment. Updates run through the Stripe customer portal — card, Apple Pay, Google Pay.',
      },
      {
        q: 'How do I get a refund?',
        a: "Refunds are handled case-by-case (D28 refund doctrine). Contact support with your receipt and the reason. If you've been charged for a tier the system didn't honour, that's an automatic refund.",
      },
      {
        q: 'What payment methods do you accept?',
        a: 'Major credit/debit cards, Apple Pay, Google Pay — all through Stripe.',
      },
    ],
  },
  {
    id: 'account',
    name: 'Account, Privacy & Data',
    icon: Drama,
    faqs: [
      {
        q: 'How do I edit my profile or avatar?',
        a: 'Tap your avatar in the top-right corner (TopHUD). That\'s the only place profile editing lives — one identity surface, not two. Personas are managed from the same flow.',
      },
      {
        q: 'How do I change my password?',
        a: "Settings → Security → Change Password. If you signed up with Google or Apple, you don't have a password — manage that on the provider's side.",
      },
      {
        q: 'How do I manage notifications?',
        a: 'Settings → Notifications. You control browser push, email, and Telegram channels independently. Notification badges live in the inbox, not on nav bars (Phil rule).',
      },
      {
        q: 'How do I go off-grid?',
        a: 'Settings → Off-Grid Mode. Toggling off-grid stops rendering you on Pulse and in Ghosted for non-mutuals. Mutual boos still see you. It\'s real invisibility — not a status label.',
      },
      {
        q: 'How do I export my data?',
        a: 'Settings → Data & Privacy → Export My Data. You can download your data in JSON or CSV. This is your GDPR right to data portability.',
      },
      {
        q: 'How do I delete my account?',
        a: "Settings → Data & Privacy → Delete Account. Deletion is permanent. Aggregate atmospheric data (D33 substrate residue) may remain in non-identifying form — that's the irreversible-forgetting commitment, not a leak. We recommend exporting your data first.",
      },
    ],
  },
];

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);

  const filteredCategories = FAQ_CATEGORIES.map(category => ({
    ...category,
    faqs: category.faqs.filter(
      faq =>
        faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.a.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.faqs.length > 0 || !searchQuery);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="w-16 h-16 bg-[#C8962C]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-[#C8962C]" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight mb-2">
            Help Center
          </h1>
          <p className="text-white/60">
            Find answers — or get in touch.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search the Help Center..."
              className="bg-white/5 border-white/20 pl-12 py-6 text-lg"
            />
          </div>
        </motion.div>

        {/* FAQ Categories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4 mb-12"
        >
          {filteredCategories.map((category) => (
            <div
              key={category.id}
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpandedCategory(
                  expandedCategory === category.id ? null : category.id
                )}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <category.icon className="w-5 h-5 text-[#C8962C]" />
                  <span className="font-bold">{category.name}</span>
                  <span className="text-sm text-white/40">
                    ({category.faqs.length})
                  </span>
                </div>
                {expandedCategory === category.id ? (
                  <ChevronDown className="w-5 h-5 text-white/40" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-white/40" />
                )}
              </button>

              {expandedCategory === category.id && (
                <div className="border-t border-white/10">
                  {category.faqs.map((faq, idx) => (
                    <div
                      key={idx}
                      className="border-b border-white/5 last:border-0"
                    >
                      <button
                        onClick={() => setExpandedFaq(
                          expandedFaq === `${category.id}-${idx}`
                            ? null
                            : `${category.id}-${idx}`
                        )}
                        className="w-full p-4 text-left hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <span className="font-medium">{faq.q}</span>
                          {expandedFaq === `${category.id}-${idx}` ? (
                            <ChevronDown className="w-4 h-4 text-white/40 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0" />
                          )}
                        </div>
                      </button>

                      {expandedFaq === `${category.id}-${idx}` && (
                        <div className="px-4 pb-4 text-white/80 text-sm leading-relaxed">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </motion.div>

        {/* Contact Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xl font-black uppercase tracking-wider mb-4 text-center">
            Still Need Help?
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <a
              href="mailto:support@hotmess.london"
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors block"
            >
              <Mail className="w-8 h-8 text-[#C8962C] mb-3" />
              <h3 className="font-bold mb-1">Email Support</h3>
              <p className="text-sm text-white/60 mb-3">
                Tell us what&apos;s happening. We respond within 24 hours.
              </p>
              <span className="text-[#C8962C] text-sm flex items-center gap-1">
                support@hotmess.london
                <ExternalLink className="w-3 h-3" />
              </span>
            </a>

            <a
              href="mailto:safety@hotmess.london"
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors block"
            >
              <Shield className="w-8 h-8 text-red-400 mb-3" />
              <h3 className="font-bold mb-1">Safety Team</h3>
              <p className="text-sm text-white/60 mb-3">
                Urgent safety concerns — a real human reads this inbox.
              </p>
              <span className="text-red-400 text-sm flex items-center gap-1">
                safety@hotmess.london
                <ExternalLink className="w-3 h-3" />
              </span>
            </a>
          </div>

          <p className="text-center text-xs text-white/40 mt-6">
            In an emergency, use the Silent SOS shield or call your local emergency services.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

