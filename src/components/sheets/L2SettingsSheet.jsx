/**
 * L2SettingsSheet — Account settings hub
 * Links to privacy, notifications, blocked, help, membership.
 * Handles sign out and account deletion request.
 */

import { useState } from 'react';
import {
  Shield, Bell, Lock, HelpCircle, Crown, LogOut,
  ChevronRight, User, Eye, AlertTriangle, Zap,
  FileText, Accessibility, Download,
} from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { usePowerups } from '@/hooks/usePowerups';

export default function L2SettingsSheet() {
  const { openSheet, closeSheet } = useSheet();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { isActive: isBoostActive, expiresAt: boostExpiresAt } = usePowerups();

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      closeSheet();
    } catch {
      toast.error('Failed to sign out');
      setSigningOut(false);
    }
  };

  const SECTIONS = [
    {
      title: 'Profile',
      rows: [
        { icon: User, label: 'Edit Profile', onTap: () => openSheet('edit-profile') },
        { icon: Eye, label: 'Privacy', onTap: () => openSheet('privacy') },
        { icon: Bell, label: 'Notifications', onTap: () => openSheet('notifications') },
        { icon: Lock, label: 'Blocked Users', onTap: () => openSheet('blocked') },
        {
          icon: Eye,
          label: isBoostActive('incognito_week') ? 'Incognito Mode (Active)' : 'Go Incognito',
          onTap: () => {
            if (isBoostActive('incognito_week')) {
              const exp = boostExpiresAt('incognito_week');
              const m = exp ? Math.round((exp.getTime() - Date.now()) / 60000) : 0;
              const timeLeft = m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
              toast(`Incognito active - ${timeLeft} left`, {
                style: { background: '#1C1C1E', color: '#C8962C', border: '1px solid rgba(200,150,44,0.3)' },
              });
            } else {
              openSheet('boost-shop');
            }
          },
          highlight: isBoostActive('incognito_week'),
        },
      ],
    },
    {
      title: 'Membership',
      rows: [
        { icon: Crown, label: 'Membership', onTap: () => openSheet('membership') },
        { icon: Zap, label: 'Power-Ups', onTap: () => openSheet('boost-shop') },
      ],
    },
    {
      title: 'Support',
      rows: [
        { icon: Shield, label: 'Safety Center', onTap: () => openSheet('safety') },
        { icon: HelpCircle, label: 'Help & Support', onTap: () => openSheet('help') },
      ],
    },
    {
      title: 'Legal & Data',
      rows: [
        { icon: FileText, label: 'Legal & Terms', onTap: () => openSheet('legal') },
        { icon: Accessibility, label: 'Accessibility', onTap: () => openSheet('accessibility') },
        { icon: Download, label: 'Data Export', onTap: () => openSheet('data-export') },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 pt-4 pb-6 space-y-5">
        {SECTIONS.map(section => (
          <div key={section.title}>
            <p className="text-xs uppercase tracking-widest text-white/30 font-black mb-2">{section.title}</p>
            <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden divide-y divide-white/5">
              {section.rows.map(({ icon: Icon, label, onTap, highlight }) => (
                <button
                  key={label}
                  onClick={onTap}
                  className={cn(
                    'w-full px-4 py-4 flex items-center gap-3 hover:bg-white/5 active:bg-white/8 transition-colors',
                    highlight && 'bg-[#C8962C]/5'
                  )}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                    highlight ? 'bg-[#C8962C]/20' : 'bg-white/5'
                  )}>
                    <Icon className={cn('w-4 h-4', highlight ? 'text-[#C8962C]' : 'text-white/50')} />
                  </div>
                  <span className={cn(
                    'flex-1 text-left text-sm font-bold',
                    highlight ? 'text-[#C8962C]' : 'text-white'
                  )}>
                    {label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Sign out */}
        <div className="pt-2 space-y-2">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full bg-[#1C1C1E] rounded-2xl px-4 py-4 flex items-center gap-3 hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <LogOut className="w-4 h-4 text-white/50" />
            </div>
            <span className="text-white/70 text-sm font-bold">
              {signingOut ? 'Signing out...' : 'Sign Out'}
            </span>
          </button>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full px-4 py-3 text-red-500/60 text-xs font-bold text-center hover:text-red-400 transition-colors"
            >
              Delete Account
            </button>
          ) : (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-xs leading-relaxed">
                  This will permanently delete your account, profile, and all data. This cannot be undone.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-xl bg-white/8 text-white/60 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session?.user?.id) { toast.error('Not signed in'); return; }
                      const uid = session.user.id;
                      // Anonymise profile data (GDPR right to erasure)
                      await supabase.from('profiles').update({
                        display_name: '[deleted]',
                        bio: null,
                        avatar_url: null,
                        photos: null,
                        location: null,
                        public_attributes: null,
                        tags: [],
                        emergency_message: null,
                        notification_prefs: null,
                        deleted_at: new Date().toISOString(),
                      }).eq('id', uid);
                      // Delete related records
                      await Promise.allSettled([
                        supabase.from('trusted_contacts').delete().eq('user_id', uid),
                        supabase.from('taps').delete().or(`tapper_id.eq.${uid},tapped_id.eq.${uid}`),
                        supabase.from('right_now_status').delete().eq('user_id', uid),
                        supabase.from('user_presence').delete().eq('user_id', uid),
                      ]);
                      // Sign out
                      await supabase.auth.signOut();
                      toast.success('Account deleted. Goodbye.');
                      window.location.replace('/');
                    } catch (err) {
                      console.error('Account deletion error:', err);
                      toast.error('Deletion failed. Contact support@hotmess.app');
                    }
                    setShowDeleteConfirm(false);
                  }}
                  className="flex-1 py-2 rounded-xl bg-red-500/20 text-red-400 text-xs font-bold"
                >
                  Delete Forever
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-white/20 text-[10px] pb-4">
          HOTMESS v1.0 · Made with chaos in London
        </p>
      </div>
    </div>
  );
}
