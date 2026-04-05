/**
 * L2LegalSheet -- Legal hub with in-app navigation
 *
 * Core: Terms, Privacy, Remix License
 * Advanced: Commercial License, Creator Agreement, DMCA
 */

import { useNavigate } from 'react-router-dom';
import {
  FileText, Shield, Music, Briefcase, Users, AlertTriangle, ChevronRight,
} from 'lucide-react';
import { useSheet } from '@/contexts/SheetContext';

const GOLD = '#C8962C';
const LABEL_RED = '#9B1B2A';

const SECTIONS = [
  {
    title: 'Core',
    items: [
      { icon: FileText, label: 'Terms of Service', route: '/legal/terms', color: GOLD },
      { icon: Shield, label: 'Privacy Policy', route: '/legal/privacy', color: GOLD },
      { icon: Music, label: 'Remix License', route: '/legal/remix-license', color: LABEL_RED },
    ],
  },
  {
    title: 'Creator & Commercial',
    items: [
      { icon: Briefcase, label: 'Commercial License', route: '/legal/commercial-license', color: GOLD },
      { icon: Users, label: 'Creator Agreement', route: '/legal/creator-agreement', color: LABEL_RED },
    ],
  },
  {
    title: 'Safety & Reporting',
    items: [
      { icon: AlertTriangle, label: 'Copyright & Abuse (DMCA)', route: '/legal/dmca', color: '#FF3B30' },
    ],
  },
  {
    title: 'Other',
    items: [
      { icon: FileText, label: 'Accessibility', route: '/legal/accessibility', color: '#8E8E93' },
      { icon: FileText, label: 'About HOTMESS', route: '/legal/about', color: '#8E8E93' },
    ],
  },
];

export default function L2LegalSheet() {
  const navigate = useNavigate();
  const { closeSheet } = useSheet();

  const handleTap = (route) => {
    closeSheet();
    navigate(route);
  };

  return (
    <div className="px-4 pt-4 pb-6 space-y-5">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-2">
            {section.title}
          </p>
          <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-white/5">
            {section.items.map(({ icon: Icon, label, route, color }) => (
              <button
                key={label}
                onClick={() => handleTap(route)}
                className="w-full px-4 py-4 flex items-center gap-3 hover:bg-white/5 active:bg-white/8 transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}15` }}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <span className="flex-1 text-left text-sm font-bold text-white">{label}</span>
                <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      ))}

      <p className="text-center text-white/20 text-[10px] pt-2">
        HOTMESS LTD &middot; Registered in England &amp; Wales
      </p>
    </div>
  );
}
