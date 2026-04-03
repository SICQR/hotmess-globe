/**
 * L2LegalSheet -- Legal terms, privacy policy, community guidelines
 */

import { ExternalLink } from 'lucide-react';

const LEGAL_LINKS = [
  { label: 'Terms of Service', url: 'https://hotmessldn.com/legal/terms' },
  { label: 'Privacy Policy', url: 'https://hotmessldn.com/legal/privacy' },
  { label: 'Community Guidelines', url: 'https://hotmessldn.com/legal/community' },
  { label: 'Cookie Policy', url: 'https://hotmessldn.com/legal/cookies' },
];

export default function L2LegalSheet() {
  return (
    <div className="px-4 pt-4 pb-6 space-y-2">
      <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-3">
        Legal Documents
      </p>
      {LEGAL_LINKS.map(({ label, url }) => (
        <a
          key={label}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-4 py-4 bg-[#1C1C1E] rounded-2xl active:bg-white/5 transition-colors"
        >
          <span className="text-white text-sm font-bold">{label}</span>
          <ExternalLink className="w-4 h-4 text-white/20" />
        </a>
      ))}
      <p className="text-center text-white/20 text-[10px] pt-4">
        HOTMESS LTD - Registered in England & Wales
      </p>
    </div>
  );
}
