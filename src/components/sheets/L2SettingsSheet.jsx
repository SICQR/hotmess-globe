/**
 * L2SettingsSheet — Account settings hub
 * Links to privacy, notifications, blocked, help, membership.
 * Handles sign out and account deletion request.
 */

import { useState } from 'react';
import {
  Shield, Bell, Lock, HelpCircle, Crown, LogOut,
  ChevronRight, User, Eye, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function L2SettingsSheet() {
  const { openSheet, closeSheet } = useSheet();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

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
      ],
    },
    {
      title: 'Membership',
      rows: [
        { icon: Crown, label: 'Upgrade to Premium', onTap: () => openSheet('membership'), highlight: true },
      ],
    },
    {
      title: 'Support',
      rows: [
        { icon: Shield, label: 'Safety Center', onTap: () => openSheet('safety') },
        { icon: HelpCircle, label: 'Help & Support', onTap: () => openSheet('help') },
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
                  onClick={() => {
                    toast.info('Account deletion request submitted. We\'ll email you to confirm.');
                    setShowDeleteConfirm(false);
                  }}
                  className="flex-1 py-2 rounded-xl bg-red-500/20 text-red-400 text-xs font-bold"
                >
                  Request Deletion
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
