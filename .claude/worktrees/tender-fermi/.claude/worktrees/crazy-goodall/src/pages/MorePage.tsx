/**
 * MorePage — Hub for Safety, Care, Profile, Vault, Settings, Help
 * Replaces Profile tab as the 5th nav item.
 */
import { useNavigate } from 'react-router-dom';
import { Shield, Heart, User, Users, Lock, Settings, HelpCircle, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

const GOLD = '#C8962C';
const MUTED = '#8E8E93';

interface MoreItem {
  id: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  sub: string;
  path: string;
  accent: string;
  badge?: string;
  badgeColor?: string;
}

const MORE_ITEMS: MoreItem[] = [
  { id: 'safety', icon: Shield, label: 'Safety', sub: 'SOS, check-ins, trusted contacts', path: '/safety', accent: '#ef4444' },
  { id: 'care', icon: Heart, label: 'Care', sub: 'Aftercare + wellbeing', path: '/care', accent: GOLD },
  { id: 'profile', icon: User, label: 'My Profile', sub: 'Edit your profile', path: '/profile', accent: '#ffffff' },
  { id: 'personas', icon: Users, label: 'Personas', sub: 'Switch or create identities', path: '/profile?action=manage-personas', accent: GOLD },
  { id: 'vault', icon: Lock, label: 'Vault', sub: 'Tickets, orders, archive', path: '/more/vault', accent: GOLD },
  { id: 'settings', icon: Settings, label: 'Settings', sub: 'Account + privacy', path: '/more/settings', accent: MUTED },
  { id: 'help', icon: HelpCircle, label: 'Help', sub: 'FAQs + support', path: '/help', accent: MUTED },
];

export default function MorePage() {
  const navigate = useNavigate();

  return (
    <div className="h-full w-full flex flex-col" style={{ background: '#050507' }}>
      {/* Header */}
      <div
        className="sticky top-0 z-30 border-b border-white/5 px-4"
        style={{ background: 'rgba(5,5,7,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
      >
        <div className="pt-[env(safe-area-inset-top)]" />
        <div className="flex items-center justify-center h-14">
          <h1 className="font-black text-base tracking-[0.12em] uppercase" style={{ color: GOLD }}>
            More
          </h1>
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="px-4 py-4 space-y-2">
          {MORE_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.button
                key={item.id}
                onClick={() => navigate(item.path)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#1C1C1E] border border-white/5 active:scale-[0.98] transition-transform text-left"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${item.accent}15`, border: `1px solid ${item.accent}30` }}
                >
                  <Icon className="w-5 h-5" style={{ color: item.accent }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{item.label}</span>
                    {item.badge && (
                      <span
                        className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                        style={{ background: `${item.badgeColor || GOLD}20`, color: item.badgeColor || GOLD }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-white/40">{item.sub}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
