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
import { Button } from '@/components/ui/button';

const FAQ_CATEGORIES = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    icon: Book,
    faqs: [
      { q: 'How do I create an account?', a: 'You can create an account using your email, or sign in with Google or Apple. Go to the Sign Up page and follow the instructions.' },
      { q: 'How do I complete my profile?', a: 'After signing in, go to Settings > Edit Profile to add your photo, bio, and other details.' },
      { q: 'What is HOTMESS?', a: 'HOTMESS is a global nightlife discovery platform that helps you find events, connect with people, and explore the world\'s party scene.' },
    ],
  },
  {
    id: 'events',
    name: 'Events',
    icon: Calendar,
    faqs: [
      { q: 'How do I find events near me?', a: 'Use the Events page to browse upcoming events. You can filter by location, date, and type.' },
      { q: 'How do I RSVP to an event?', a: 'Click on any event to view details, then tap the RSVP button to mark your interest.' },
      { q: 'Can I create my own event?', a: 'Yes! If you have a business account, you can create and promote your own events.' },
    ],
  },
  {
    id: 'account',
    name: 'Account & Profile',
    icon: User,
    faqs: [
      { q: 'How do I change my password?', a: 'Go to Settings > Security > Change Password. You\'ll need to verify your current password first.' },
      { q: 'How do I delete my account?', a: 'Go to Settings > Data & Privacy > Delete Account. This action is permanent and cannot be undone.' },
      { q: 'How do I export my data?', a: 'Go to Settings > Data & Privacy > Export My Data. You can download all your data in JSON or CSV format.' },
    ],
  },
  {
    id: 'safety',
    name: 'Safety & Privacy',
    icon: Shield,
    faqs: [
      { q: 'How do I report inappropriate content?', a: 'Tap the three dots menu on any content and select "Report". Choose the reason and submit.' },
      { q: 'How do I block a user?', a: 'Go to their profile, tap the three dots menu, and select "Block". They won\'t be able to contact you.' },
      { q: 'Who can see my location?', a: 'Your location privacy can be controlled in Settings > Privacy. Choose between precise, fuzzy, or hidden.' },
    ],
  },
  {
    id: 'billing',
    name: 'Billing & Payments',
    icon: CreditCard,
    faqs: [
      { q: 'How do I buy tickets?', a: 'Select an event with tickets available, choose your ticket type, and complete checkout.' },
      { q: 'How do I get a refund?', a: 'Refund policies vary by event. Contact the event organizer or reach out to our support team.' },
      { q: 'What payment methods do you accept?', a: 'We accept major credit cards, debit cards, and Apple Pay/Google Pay.' },
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
          <div className="w-16 h-16 bg-[#E62020]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-[#E62020]" />
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
                  <category.icon className="w-5 h-5 text-[#E62020]" />
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
