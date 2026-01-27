import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronRight,
  Package, 
  CreditCard, 
  Truck, 
  Shield,
  MessageCircle,
  Book,
  AlertCircle,
  ExternalLink,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const FAQ_CATEGORIES = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Book,
    faqs: [
      {
        q: 'How do I become a seller?',
        a: 'Go to Edit Profile, select "Seller" as your profile type, and complete the seller onboarding process. You\'ll set up your shop profile, choose your categories, and configure your payment preferences.'
      },
      {
        q: 'What can I sell on MessMarket?',
        a: 'You can sell physical products (fashion, art, merch), digital products (music, art files, tickets), services, and event tickets. All items must comply with our community guidelines - no illegal items, counterfeit goods, or prohibited content.'
      },
      {
        q: 'Is there a fee to become a seller?',
        a: 'No, becoming a seller is free. We take a 10% platform fee only when you make a sale through XP payments. For Stripe payments, standard processing fees apply (2.9% + 30p).'
      },
      {
        q: 'How do I get verified as a seller?',
        a: 'Go to your Seller Dashboard and click "Get Verified". You\'ll need to upload a photo ID and a selfie holding your ID. Verification typically takes 24-48 hours and gives you a verified badge, increasing buyer trust.'
      },
    ]
  },
  {
    id: 'products',
    title: 'Products & Listings',
    icon: Package,
    faqs: [
      {
        q: 'How do I list a new product?',
        a: 'From your Seller Dashboard, click "New Product". Fill in the product details, add images (up to 6), set your price in XP (and optionally GBP), and set your inventory count. Save as draft to review, or publish immediately.'
      },
      {
        q: 'Can I edit a product after publishing?',
        a: 'Yes! Go to your Seller Dashboard, find the product in "My Products", and click the edit icon. Changes take effect immediately. Note: if orders are pending, major changes may confuse buyers.'
      },
      {
        q: 'What\'s the difference between physical and digital products?',
        a: 'Physical products require shipping - you\'ll need to arrange delivery to the buyer. Digital products are delivered electronically - after purchase, buyers get access to download links or codes you provide.'
      },
      {
        q: 'How do featured listings work?',
        a: 'Featured listings appear at the top of the marketplace and get more visibility. You can feature products for 24 hours, 3 days, or 1 week by paying XP. Track performance (views, clicks, CTR) in your dashboard.'
      },
      {
        q: 'Can I bulk edit my products?',
        a: 'Yes! In your product list, select multiple products using the checkboxes, then use the bulk actions toolbar to change status, update prices, add/remove tags, or delete multiple products at once.'
      },
    ]
  },
  {
    id: 'payments',
    title: 'Payments & Payouts',
    icon: CreditCard,
    faqs: [
      {
        q: 'What payment methods can I accept?',
        a: 'You can accept XP (hotmess currency) from all users. If you connect Stripe, you can also accept card payments, Apple Pay, and Google Pay. XP transactions are instant; card payments take 1-2 days to settle.'
      },
      {
        q: 'How do I connect Stripe?',
        a: 'In your Seller Dashboard, go to the Payouts tab and click "Connect Stripe Account". You\'ll be redirected to Stripe to complete their onboarding process, which includes identity verification.'
      },
      {
        q: 'When do I get paid?',
        a: 'For XP sales, funds are held in escrow until the buyer confirms delivery (or 7 days after delivery, whichever is first). For Stripe sales, payouts are processed weekly to your connected bank account.'
      },
      {
        q: 'What are the fees?',
        a: 'XP sales: 10% platform fee (deducted when escrow releases). Stripe sales: 2.9% + 30p per transaction (standard Stripe fees). There are no monthly fees or listing fees.'
      },
      {
        q: 'How does escrow work?',
        a: 'When a buyer purchases with XP, the payment is held in escrow. Once you mark the order as shipped/delivered, the buyer can release the funds. If they don\'t respond within 7 days, funds are auto-released to you.'
      },
    ]
  },
  {
    id: 'shipping',
    title: 'Shipping & Delivery',
    icon: Truck,
    faqs: [
      {
        q: 'How do I ship orders?',
        a: 'When you receive an order, the buyer\'s shipping address is shown in your dashboard. Package the item, ship it using your preferred carrier, and mark the order as shipped with the tracking number (if available).'
      },
      {
        q: 'What shipping options should I offer?',
        a: 'You set your shipping policy during onboarding: standard shipping, tracked shipping, local pickup, or digital delivery. Be clear in your product descriptions about shipping costs and estimated times.'
      },
      {
        q: 'What if a package is lost or damaged?',
        a: 'If a buyer reports non-delivery, you may need to provide proof of shipping. We recommend using tracked shipping for valuable items. For damaged items, work with the buyer on a resolution - partial refund or replacement.'
      },
      {
        q: 'Can I sell internationally?',
        a: 'Yes, but you\'re responsible for international shipping costs and any customs fees. Make sure to clearly state whether you ship internationally and what additional costs apply.'
      },
    ]
  },
  {
    id: 'disputes',
    title: 'Disputes & Support',
    icon: Shield,
    faqs: [
      {
        q: 'What happens if a buyer opens a dispute?',
        a: 'You\'ll be notified immediately. Go to the Disputes tab in your dashboard to view the dispute details and respond with your side of the story and any evidence (tracking info, photos, messages).'
      },
      {
        q: 'How are disputes resolved?',
        a: 'Our team reviews all evidence from both parties. Resolutions may include: releasing escrow to seller, refunding the buyer, or partial resolution. Most disputes are resolved within 3-5 business days.'
      },
      {
        q: 'Can I block a buyer?',
        a: 'If you have issues with a specific buyer, contact support. While you can\'t directly block users, we can investigate patterns of abuse and take action on problematic accounts.'
      },
      {
        q: 'How do I contact support?',
        a: 'For urgent issues, use the support chat in the app. For general questions, email sellers@hotmess.london. We aim to respond within 24 hours on business days.'
      },
    ]
  },
];

const QUICK_LINKS = [
  { label: 'Seller Terms', url: '/terms#sellers', icon: Book },
  { label: 'Community Guidelines', url: '/guidelines', icon: Shield },
  { label: 'Contact Support', url: '/support', icon: MessageCircle },
];

export default function SellerHelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState('getting-started');
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Filter FAQs based on search
  const filteredCategories = FAQ_CATEGORIES.map(category => ({
    ...category,
    faqs: category.faqs.filter(faq => 
      !searchQuery || 
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.faqs.length > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#E62020]/20 to-[#B026FF]/20 border border-[#E62020] rounded-xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-[#E62020] rounded-xl flex items-center justify-center">
            <HelpCircle className="w-6 h-6 text-black" />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase">Seller Help Center</h2>
            <p className="text-white/60 text-sm">Everything you need to know about selling on MessMarket</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search help articles..."
            className="pl-10 bg-black/30 border-white/20 text-white"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-3">
        {QUICK_LINKS.map(link => (
          <a
            key={link.label}
            href={link.url}
            className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3 hover:border-white/30 transition-colors group"
          >
            <link.icon className="w-5 h-5 text-white/60 group-hover:text-[#00D9FF] transition-colors" />
            <span className="text-sm font-bold">{link.label}</span>
            <ExternalLink className="w-4 h-4 text-white/40 ml-auto" />
          </a>
        ))}
      </div>

      {/* FAQ Categories */}
      <div className="space-y-3">
        {filteredCategories.map(category => {
          const Icon = category.icon;
          const isExpanded = expandedCategory === category.id;

          return (
            <div 
              key={category.id}
              className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
            >
              {/* Category Header */}
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isExpanded ? 'bg-[#E62020]' : 'bg-white/10'
                }`}>
                  <Icon className={`w-5 h-5 ${isExpanded ? 'text-black' : 'text-white'}`} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold">{category.title}</h3>
                  <p className="text-xs text-white/40">{category.faqs.length} articles</p>
                </div>
                <ChevronDown 
                  className={`w-5 h-5 text-white/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>

              {/* FAQ Items */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-white/10 p-2">
                      {category.faqs.map((faq, idx) => {
                        const faqId = `${category.id}-${idx}`;
                        const isFaqExpanded = expandedFaq === faqId;

                        return (
                          <div key={idx} className="border-b border-white/5 last:border-0">
                            <button
                              onClick={() => setExpandedFaq(isFaqExpanded ? null : faqId)}
                              className="w-full p-3 flex items-start gap-3 hover:bg-white/5 transition-colors text-left"
                            >
                              <ChevronRight 
                                className={`w-4 h-4 text-white/40 mt-1 transition-transform flex-shrink-0 ${
                                  isFaqExpanded ? 'rotate-90' : ''
                                }`}
                              />
                              <span className={`text-sm ${isFaqExpanded ? 'text-white font-bold' : 'text-white/80'}`}>
                                {faq.q}
                              </span>
                            </button>

                            <AnimatePresence>
                              {isFaqExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="px-10 pb-4">
                                    <p className="text-sm text-white/60 leading-relaxed">
                                      {faq.a}
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* No Results */}
      {searchQuery && filteredCategories.length === 0 && (
        <div className="text-center py-12 bg-white/5 border border-white/10 rounded-xl">
          <AlertCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/60 mb-2">No results found for "{searchQuery}"</p>
          <Button
            variant="ghost"
            onClick={() => setSearchQuery('')}
            className="text-[#00D9FF]"
          >
            Clear search
          </Button>
        </div>
      )}

      {/* Still Need Help */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
        <MessageCircle className="w-10 h-10 text-[#00D9FF] mx-auto mb-3" />
        <h3 className="font-bold mb-2">Still need help?</h3>
        <p className="text-sm text-white/60 mb-4">
          Our support team is here to help you succeed as a seller
        </p>
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
            onClick={() => window.location.href = 'mailto:sellers@hotmess.london'}
          >
            Email Support
          </Button>
          <Button
            className="bg-[#E62020] hover:bg-[#E62020]/90 text-black font-bold"
            onClick={() => window.location.href = '/support'}
          >
            Live Chat
          </Button>
        </div>
      </div>
    </div>
  );
}
