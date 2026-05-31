import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/components/utils/supabaseClient';
// Phil 2026-05-31 hotfix-7: Profile-section removed from Settings.
// uploadToStorage / Input / Camera / Save / User were only used by the
// Profile section. Avatar + display-name editing now lives ONLY behind
// the top-right TopHUD avatar tap.
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Shield, LogOut, Download, Trash2, Database, HelpCircle, MessageSquare, FileText, Lock, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
// import { Input } removed — only used by stripped Profile section.
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
// createUserProfileUrl removed — only used by stripped View Profile button.
import { createPageUrl } from '../utils';
import { usePinLock } from '@/contexts/PinLockContext';

// PIN Lock Settings Component
function PinLockSettings() {
  const { 
    isPinSet, 
    isPinEnabled, 
    togglePinEnabled, 
    openPinSetup, 
    removePin,
    lockTimeout,
    setLockTimeoutMinutes 
  } = usePinLock();

  const timeoutMinutes = Math.round(lockTimeout / 60000);

  return (
    <>
      <div className="flex items-center gap-3 mb-6">
        <Lock className="w-5 h-5 text-[#C8962C]" />
        <h2 className="text-xl font-bold uppercase tracking-wider">App Security</h2>
      </div>

      <div className="space-y-4">
        {/* PIN Lock Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">PIN Lock</p>
            <p className="text-sm text-white/60">
              {isPinSet ? 'Require PIN to open app' : 'Set up a 4-digit PIN'}
            </p>
          </div>
          {isPinSet ? (
            <Switch 
              checked={isPinEnabled} 
              onCheckedChange={togglePinEnabled} 
            />
          ) : (
            <Button 
              onClick={openPinSetup}
              variant="outline"
              className="border-[#C8962C] text-[#C8962C] hover:bg-[#C8962C]/10"
            >
              Set PIN
            </Button>
          )}
        </div>

        {/* Lock Timeout */}
        {isPinSet && (
          <div>
            <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
              Lock after inactivity
            </label>
            <Select 
              value={timeoutMinutes.toString()} 
              onValueChange={(v) => setLockTimeoutMinutes(parseInt(v))}
            >
              <SelectTrigger className="bg-black border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 minute</SelectItem>
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Change/Remove PIN */}
        {isPinSet && (
          <div className="flex gap-3 pt-2">
            <Button 
              onClick={openPinSetup}
              variant="outline"
              className="border-white/20 text-white flex-1"
            >
              Change PIN
            </Button>
            <Button 
              onClick={() => {
                if (confirm('Remove PIN lock? You can set it up again later.')) {
                  removePin();
                  toast.success('PIN removed');
                }
              }}
              variant="outline"
              className="border-red-500/40 text-red-400 hover:bg-red-500/10"
            >
              Remove PIN
            </Button>
          </div>
        )}

        {/* Biometric (future) */}
        <div className="flex items-center justify-between opacity-50">
          <div className="flex items-center gap-3">
            <Fingerprint className="w-5 h-5 text-[#00C2E0]" />
            <div>
              <p className="font-semibold">Biometric Unlock</p>
              <p className="text-sm text-white/60">Use Face ID or fingerprint</p>
            </div>
          </div>
          <span className="text-xs text-white/40 uppercase">Coming Soon</span>
        </div>
      </div>
    </>
  );
}

export default function Settings() {
  // Phil 2026-05-31 hotfix-7: fullName/avatarUrl/uploading state removed —
  // profile-section is now stripped, those fields are edited via the
  // top-right TopHUD avatar tap.
  const [user, setUser] = useState(null);
  const [locationPrivacy, setLocationPrivacy] = useState('fuzzy');
  const [notifications, setNotifications] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        let { data: { user } } = await supabase.auth.getUser();
      let currentUser; if (!user) { currentUser = null; } else { const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(); currentUser = { ...user, ...(profile || {}), auth_user_id: user.id, email: user.email || profile?.email }; };
        if (!currentUser) {
          // If the session is missing/expired, bounce to Auth instead of crashing.
          window.location.href = "/";
          return;
        }

        setUser(currentUser);
        setLocationPrivacy(currentUser?.location_privacy_mode || 'fuzzy');
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  // Phil 2026-05-31 hotfix-7: handleAvatarUpload + handleSave removed.
  // Avatar upload is now exclusively on the top-right TopHUD avatar tap.
  // Settings page's surviving toggles (location privacy, notifications,
  // public profile, etc.) persist themselves via their own onChange
  // handlers below — no top-level Save Changes button.

  const handleLogout = () => {
    supabase.auth.signOut();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-black text-white p-0 px-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">
            Settings
          </h1>
          <p className="text-white/60">Manage your account and preferences</p>
        </motion.div>

        {/*
          Phil 2026-05-31 hotfix-7: PROFILE SECTION REMOVED.
          Profile avatar + name + email view/edit is now exclusively on
          the top-right avatar tap (single source of truth). Settings
          page is account preferences only — notifications, privacy,
          membership, danger zone. Anyone reaching for profile fields
          here taps the top-right HOTMESS-OS avatar instead.
        */}

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4"
        >
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-[#00C2E0]" />
            <h2 className="text-xl font-bold uppercase tracking-wider">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Push Notifications</p>
                <p className="text-sm text-white/60">Receive push notifications for events</p>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
          </div>
        </motion.div>

        {/* Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4"
        >
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-[#39FF14]" />
            <h2 className="text-xl font-bold uppercase tracking-wider">Privacy</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="text-sm text-white/60 uppercase tracking-wider mb-3 block">
                Location Privacy
              </label>
              <Select value={locationPrivacy} onValueChange={setLocationPrivacy}>
                <SelectTrigger className="bg-black border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="precise">Precise - Show exact location</SelectItem>
                  <SelectItem value="fuzzy">Fuzzy - Show approximate area (recommended)</SelectItem>
                  <SelectItem value="hidden">Hidden - Don't show location</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-white/40 mt-2">
                Controls how your location is displayed on beacons and check-ins
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Public Profile</p>
                <p className="text-sm text-white/60">Show your profile to other users</p>
              </div>
              <Switch checked={publicProfile} onCheckedChange={setPublicProfile} />
            </div>

            <div className="bg-[#00C2E0]/10 border border-[#00C2E0]/40 rounded-lg p-4">
              <p className="text-xs text-white/80 leading-relaxed">
                🔒 <span className="font-bold">Social Links Privacy:</span> Your social media links are only visible to mutual follows. Edit them in your full profile.
              </p>
            </div>
          </div>
        </motion.div>

        {/* App Security - PIN Lock */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4"
        >
          <PinLockSettings />
        </motion.div>

        {/* Data & Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4"
        >
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-5 h-5 text-[#C8962C]" />
            <h2 className="text-xl font-bold uppercase tracking-wider">Data & Privacy</h2>
          </div>

          <div className="space-y-4">
            <Link to={createPageUrl('DataExport')}>
              <div className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-[#C8962C]" />
                  <div>
                    <p className="font-semibold">Export My Data</p>
                    <p className="text-sm text-white/60">Download a copy of all your data (GDPR)</p>
                  </div>
                </div>
                <span className="text-white/40">→</span>
              </div>
            </Link>

            <Link to={createPageUrl('AccountDeletion')}>
              <div className="flex items-center justify-between p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 rounded-lg transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5 text-red-500" />
                  <div>
                    <p className="font-semibold text-red-500">Delete Account</p>
                    <p className="text-sm text-white/60">Permanently delete your account and data</p>
                  </div>
                </div>
                <span className="text-red-500/60">→</span>
              </div>
            </Link>
          </div>
        </motion.div>

        {/* Help & Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4"
        >
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="w-5 h-5 text-[#00C2E0]" />
            <h2 className="text-xl font-bold uppercase tracking-wider">Help & Support</h2>
          </div>

          <div className="space-y-4">
            <Link to={createPageUrl('HelpCenter')}>
              <div className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-[#00C2E0]" />
                  <div>
                    <p className="font-semibold">Help Center</p>
                    <p className="text-sm text-white/60">Search FAQs and guides</p>
                  </div>
                </div>
                <span className="text-white/40">→</span>
              </div>
            </Link>

            <Link to={createPageUrl('Contact')}>
              <div className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-[#C8962C]" />
                  <div>
                    <p className="font-semibold">Contact Support</p>
                    <p className="text-sm text-white/60">Submit a support ticket</p>
                  </div>
                </div>
                <span className="text-white/40">→</span>
              </div>
            </Link>

            <Link to={createPageUrl('CommunityGuidelines')}>
              <div className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-[#39FF14]" />
                  <div>
                    <p className="font-semibold">Community Guidelines</p>
                    <p className="text-sm text-white/60">Rules and expectations</p>
                  </div>
                </div>
                <span className="text-white/40">→</span>
              </div>
            </Link>
          </div>
        </motion.div>

        {/* Account Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/5 border border-white/10 rounded-xl p-6"
        >
          <Button
            onClick={handleLogout}
            variant="destructive"
            className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/40"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

