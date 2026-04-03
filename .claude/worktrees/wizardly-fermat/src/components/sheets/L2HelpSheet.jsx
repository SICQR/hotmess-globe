/**
 * L2HelpSheet — Help & Support
 * FAQ accordion and contact options.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, MessageCircle, Mail, ExternalLink } from 'lucide-react';

const FAQ = [
  {
    q: 'How does Ghosted work?',
    a: 'Ghosted shows you people who are online and nearby right now. Set your Right Now status to let others know what you\'re up to — then swipe, chat, and meet up.',
  },
  {
    q: 'How do I set my Right Now status?',
    a: 'Tap your profile photo on the Ghosted screen and scroll to "Right Now". You can set a status like Hookup, Dates, Friends, or custom text.',
  },
  {
    q: 'Is my location shared with everyone?',
    a: 'No — we only share an approximate distance (e.g. "0.8km away"), never your exact address. You can control precision in Settings → Privacy.',
  },
  {
    q: 'How do I sell something on Market?',
    a: 'Tap + Sell on the Market tab. Add photos, set a price, and publish. You\'ll receive payment via Stripe when someone buys.',
  },
  {
    q: 'How do payouts work?',
    a: 'Once your item sells, funds appear in your Payouts dashboard within 2-3 business days. You can request a transfer to your bank via Profile → Selling → Payouts.',
  },
  {
    q: 'How do I block or report someone?',
    a: 'Tap their profile → tap ··· in the top right → Block or Report. Blocked users can\'t see your profile or message you. Reports go to our moderation team.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Go to Settings → Delete Account and submit a request. We\'ll send a confirmation email within 24 hours. All your data is permanently removed.',
  },
];

function FAQItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-4 flex items-start justify-between gap-3 text-left hover:bg-white/3 transition-colors"
      >
        <span className="text-white font-bold text-sm leading-relaxed">{item.q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-[#C8962C] flex-shrink-0 mt-0.5" />
          : <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0 mt-0.5" />}
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-white/50 text-sm leading-relaxed">{item.a}</p>
        </div>
      )}
    </div>
  );
}

export default function L2HelpSheet() {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Contact options */}
      <div className="px-4 pt-4 pb-4 space-y-2">
        <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-3">Contact Us</p>
        <a
          href="mailto:support@hotmess.app"
          className="w-full bg-[#1C1C1E] rounded-2xl p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-[#C8962C]/20 flex items-center justify-center flex-shrink-0">
            <Mail className="w-4 h-4 text-[#C8962C]" />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">Email Support</p>
            <p className="text-white/40 text-xs">support@hotmess.app</p>
          </div>
          <ExternalLink className="w-4 h-4 text-white/20" />
        </a>
        <a
          href="https://instagram.com/hotmessapp"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-[#1C1C1E] rounded-2xl p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-4 h-4 text-white/60" />
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">Instagram DMs</p>
            <p className="text-white/40 text-xs">@hotmessapp</p>
          </div>
          <ExternalLink className="w-4 h-4 text-white/20" />
        </a>
      </div>

      {/* FAQ */}
      <div className="px-4 pb-2">
        <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-3">FAQ</p>
      </div>
      <div className="bg-[#1C1C1E] mx-4 rounded-2xl mb-6 overflow-hidden divide-y divide-white/5">
        {FAQ.map(item => (
          <FAQItem key={item.q} item={item} />
        ))}
      </div>

      <div className="px-4 pb-6 text-center">
        <p className="text-white/20 text-[10px]">
          HOTMESS · support@hotmess.app · Made with chaos in London
        </p>
      </div>
    </div>
  );
}
