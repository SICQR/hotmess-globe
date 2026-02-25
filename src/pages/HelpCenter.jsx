import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  ChevronRight, 
  ChevronDown,
  MessageCircle, 
  Mail, 
  Book,
  Shield,
  CreditCard,
  User,
  Calendar,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { Input } from '@/components/ui/input';

const FAQ_CATEGORIES = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    icon: Book,
    faqs: [
      { q: 'How do I create an account?', a: 'You can create an account using your email, or sign in with Google or Apple. Go to the Sign Up page and follow the instructions. You must be 18+ to use HOTMESS.' },
      { q: 'How do I complete my profile?', a: 'After signing in, go to Settings > Edit Profile to add your photo, bio, and other details. A complete profile helps others find and connect with you.' },
      { q: 'What is HOTMESS?', a: 'HOTMESS is a global nightlife discovery platform that helps you find events, connect with people, and explore the world\'s party scene. We prioritize consent, safety, and authentic connections.' },
      { q: 'What are the membership tiers?', a: 'HOTMESS offers three tiers: BASIC (free), PLUS (£9.99/month with 2x XP and stealth mode), and CHROME (£19.99/month with all PLUS features plus unmasked viewers and premium support).' },
      { q: 'How do I verify my profile?', a: 'Profile verification is handled through our verification process. Go to Settings and look for the verification option to submit your verification request.' },
    ],
  },
  {
    id: 'events',
    name: 'Events',
    icon: Calendar,
    faqs: [
      { q: 'How do I find events near me?', a: 'Use the Events page to browse upcoming events. You can filter by location, date, and type. Enable location services for the best experience.' },
      { q: 'How do I RSVP to an event?', a: 'Click on any event to view details, then tap the RSVP button to mark your interest. You\'ll receive reminders as the event approaches.' },
      { q: 'Can I create my own event?', a: 'Yes! Go to Beacons and create a new beacon with the "Event" type. You can set the date, location, description, and capacity.' },
      { q: 'How do I check in to an event?', a: 'When you arrive at an event, use the Scan feature to scan the event QR code or manually check in from the event page.' },
      { q: 'How do safety check-ins work?', a: 'Enable safety check-ins before meeting someone. You\'ll receive a prompt to confirm you\'re safe at your specified time. If you don\'t respond, your emergency contacts may be notified.' },
    ],
  },
  {
    id: 'account',
    name: 'Account & Profile',
    icon: User,
    faqs: [
      { q: 'How do I change my password?', a: 'Go to Settings > Security > Change Password. You\'ll need to verify your current password first. We recommend using a strong, unique password.' },
      { q: 'How do I delete my account?', a: 'Go to Settings > Data & Privacy > Delete Account. This action is permanent and cannot be undone. We recommend exporting your data first.' },
      { q: 'How do I export my data?', a: 'Go to Settings > Data & Privacy > Export My Data. You can download all your data in JSON or CSV format. This is your GDPR right to data portability.' },
      { q: 'How do I update my profile picture?', a: 'Go to Settings > Profile and tap on your current picture to upload a new one. Photos should be recent and clearly show your face.' },
      { q: 'What is XP and how do I earn it?', a: 'XP (Experience Points) tracks your activity on HOTMESS. You earn XP by attending events, checking in, engaging with content, and completing challenges. Higher tiers earn XP faster.' },
      { q: 'How do I manage my notification settings?', a: 'Go to Settings > Notifications to customize which notifications you receive. You can enable/disable push notifications and email updates.' },
    ],
  },
  {
    id: 'safety',
    name: 'Safety & Privacy',
    icon: Shield,
    faqs: [
      { q: 'How do I report inappropriate content?', a: 'Tap the three dots menu on any content and select "Report". Choose the reason and submit. Our moderation team reviews all reports within 24 hours.' },
      { q: 'How do I block a user?', a: 'Go to their profile, tap the three dots menu, and select "Block". They won\'t be able to contact you or see your profile.' },
      { q: 'Who can see my location?', a: 'Your location privacy can be controlled in Settings > Privacy. Choose between precise, fuzzy (recommended), or hidden.' },
      { q: 'What is the panic button?', a: 'The panic button is an emergency feature that immediately shares your location with your designated emergency contacts. Access it from the bottom of the screen in case of emergency.' },
      { q: 'How do I set up emergency contacts?', a: 'Go to Care > Emergency Contacts to add trusted people who will be notified if you use the panic button or miss a safety check-in.' },
      { q: 'What content is prohibited?', a: 'HOTMESS prohibits harassment, hate speech, illegal content, content involving minors, non-consensual content, and scams. Review our Community Guidelines for full details.' },
      { q: 'How do I appeal a moderation decision?', a: 'If you believe a moderation action was made in error, go to Settings > Safety > Moderation History and submit an appeal. A different moderator will review your case.' },
    ],
  },
  {
    id: 'billing',
    name: 'Billing & Payments',
    icon: CreditCard,
    faqs: [
      { q: 'How do I upgrade my membership?', a: 'Go to More > Membership to view available tiers and upgrade. Payment is processed securely through Stripe.' },
      { q: 'How do I cancel my subscription?', a: 'Go to More > Membership and click "Cancel subscription". You\'ll retain access to premium features until the end of your billing period.' },
      { q: 'How do I get a refund?', a: 'Refunds are handled on a case-by-case basis. Contact our support team through the Contact page or email support@hotmess.london with your request.' },
      { q: 'What payment methods do you accept?', a: 'We accept major credit cards, debit cards, and Apple Pay/Google Pay through our secure payment processor, Stripe.' },
      { q: 'How do I update my payment method?', a: 'Go to More > Membership and click on "Manage Payment" to update your card details or switch payment methods.' },
      { q: 'What is the marketplace?', a: 'The marketplace allows users to buy and sell items, merchandise, and tickets. All transactions are processed securely through our platform.' },
    ],
  },
  {
    id: 'features',
    name: 'Features & Tools',
    icon: HelpCircle,
    faqs: [
      { q: 'What are Beacons?', a: 'Beacons are location-based drops you can create. They can be events, hangouts, or pickup locations. Other users can discover and interact with your beacons.' },
      { q: 'How does Right Now work?', a: 'Right Now shows you people who are currently active and looking to connect. Enable it in your settings when you\'re out and ready to meet people.' },
      { q: 'What is the Radio feature?', a: 'HOTMESS Radio streams curated music for the community. Access it from the radio icon in the header. Premium tiers get early access to exclusive sets.' },
      { q: 'How do I use the globe view?', a: 'The globe view (Pulse) shows real-time activity across HOTMESS. You can see events, beacons, and activity hotspots around the world.' },
      { q: 'What are Challenges?', a: 'Challenges are daily and weekly goals that reward you with XP. Complete challenges to level up faster and unlock achievements.' },
      { q: 'How do I connect with someone?', a: 'You can send a connection request (handshake) from any user\'s profile. Once accepted, you can message each other directly.' },
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
            Find answers to common questions or get in touch
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
              placeholder="Search for help..."
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
                        <div className="px-4 pb-4 text-white/80 text-sm">
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
              href="mailto:support@hotmess.app"
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors"
            >
              <Mail className="w-8 h-8 text-[#00D9FF] mb-3" />
              <h3 className="font-bold mb-1">Email Support</h3>
              <p className="text-sm text-white/60 mb-3">
                Get help via email. We typically respond within 24 hours.
              </p>
              <span className="text-[#00D9FF] text-sm flex items-center gap-1">
                support@hotmess.app
                <ExternalLink className="w-3 h-3" />
              </span>
            </a>

            <a 
              href="#"
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors"
            >
              <MessageCircle className="w-8 h-8 text-[#39FF14] mb-3" />
              <h3 className="font-bold mb-1">Live Chat</h3>
              <p className="text-sm text-white/60 mb-3">
                Chat with our support team for immediate assistance.
              </p>
              <span className="text-[#39FF14] text-sm flex items-center gap-1">
                Start Chat
                <ChevronRight className="w-3 h-3" />
              </span>
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
