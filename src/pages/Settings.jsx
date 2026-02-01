import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { User, Bell, Shield, LogOut, Save, Edit, Camera, Download, Trash2, Database, HelpCircle, MessageSquare, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { createPageUrl, createUserProfileUrl } from '../utils';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [locationPrivacy, setLocationPrivacy] = useState('fuzzy');
  const [notifications, setNotifications] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser) {
          base44.auth.redirectToLogin(window.location.href);
          return;
        }

        setUser(currentUser);
        setFullName(currentUser?.full_name || '');
        setAvatarUrl(currentUser?.avatar_url || '');
        setLocationPrivacy(currentUser?.location_privacy_mode || 'fuzzy');
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAvatarUrl(file_url);
      await base44.auth.updateMe({ avatar_url: file_url });
      toast.success('Avatar updated!');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      await base44.auth.updateMe({ 
        full_name: fullName,
        location_privacy_mode: locationPrivacy
      });
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save settings');
    }
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      
      {/* 1. HERO */}
      <section className="relative py-16 md:py-24 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/50 via-black to-purple-950/30" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-2xl mx-auto"
        >
          <p className="text-sm uppercase tracking-[0.4em] text-white/40 mb-4">ACCOUNT</p>
          <h1 className="text-5xl md:text-6xl font-black italic mb-4">
            SETTINGS<span className="text-pink-500">.</span>
          </h1>
          <p className="text-xl text-white/60">
            Manage your account and preferences
          </p>
        </motion.div>
      </section>

      <div className="max-w-2xl mx-auto px-6 pb-32">
        
        {/* 2. PROFILE SECTION */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-6"
        >
          <div className="bg-white/5 border border-pink-500/20 rounded-2xl p-6 hover:border-pink-500/40 transition-all">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-pink-500" />
                <h2 className="text-xl font-bold uppercase tracking-wider">Profile</h2>
              </div>
              <Link to={createPageUrl('EditProfile')}>
                <Button variant="outline" className="border-white/20 text-white font-black uppercase">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Full Profile
                </Button>
              </Link>
            </div>

            <div className="space-y-6">
              {/* Avatar Upload */}
              <div>
                <label className="text-sm text-white/60 uppercase tracking-wider mb-3 block">
                  Profile Picture
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center overflow-hidden border-2 border-white/20">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold">{user.full_name?.[0] || 'U'}</span>
                    )}
                  </div>
                  <div>
                    <Button
                      onClick={() => document.getElementById('avatar-upload').click()}
                      disabled={uploading}
                      variant="outline"
                      className="border-white/20 text-white font-black uppercase"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Change Avatar'}
                    </Button>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                  Full Name
                </label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="bg-white/5 border-white/20 text-white h-12"
                />
              </div>

              <div>
                <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                  Email
                </label>
                <Input
                  value={user.email}
                  disabled
                  className="bg-white/5 border-white/10 text-white/40 h-12"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button onClick={handleSave} className="bg-pink-500 hover:bg-white text-white hover:text-black font-black uppercase">
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                <Button
                  onClick={() => navigate(createUserProfileUrl(user, createPageUrl('Profile')))}
                  variant="outline"
                  className="border-white/20 text-white font-black uppercase"
                >
                  View Profile
                </Button>
              </div>
            </div>
          </div>
        </motion.section>

        {/* 3. NOTIFICATIONS */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-6"
        >
          <div className="bg-white/5 border border-cyan-500/20 rounded-2xl p-6 hover:border-cyan-500/40 transition-all">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="w-5 h-5 text-cyan-500" />
              <h2 className="text-xl font-bold uppercase tracking-wider">Notifications</h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Push Notifications</p>
                <p className="text-sm text-white/60">Receive push notifications for events</p>
              </div>
              <Switch checked={notifications} onCheckedChange={setNotifications} />
            </div>
          </div>
        </motion.section>

        {/* 4. PRIVACY */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-6"
        >
          <div className="bg-white/5 border border-green-500/20 rounded-2xl p-6 hover:border-green-500/40 transition-all">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-5 h-5 text-green-500" />
              <h2 className="text-xl font-bold uppercase tracking-wider">Privacy</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-sm text-white/60 uppercase tracking-wider mb-3 block">
                  Location Privacy
                </label>
                <Select value={locationPrivacy} onValueChange={setLocationPrivacy}>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-black text-white border-white/20">
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

              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <p className="text-sm text-white/80">
                  <span className="font-bold text-cyan-400">Social Links Privacy:</span> Your social media links are only visible to mutual follows.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* 5. DATA & PRIVACY */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-6"
        >
          <div className="bg-white/5 border border-purple-500/20 rounded-2xl p-6 hover:border-purple-500/40 transition-all">
            <div className="flex items-center gap-3 mb-6">
              <Database className="w-5 h-5 text-purple-500" />
              <h2 className="text-xl font-bold uppercase tracking-wider">Data & Privacy</h2>
            </div>

            <div className="space-y-4">
              <Link to={createPageUrl('DataExport')}>
                <div className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <Download className="w-5 h-5 text-pink-500" />
                    <div>
                      <p className="font-semibold">Export My Data</p>
                      <p className="text-sm text-white/60">Download a copy of all your data (GDPR)</p>
                    </div>
                  </div>
                  <span className="text-white/40">→</span>
                </div>
              </Link>

              <Link to={createPageUrl('AccountDeletion')}>
                <div className="flex items-center justify-between p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/40 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="font-semibold text-red-400">Delete Account</p>
                      <p className="text-sm text-white/60">Permanently delete your account and data</p>
                    </div>
                  </div>
                  <span className="text-red-500/60">→</span>
                </div>
              </Link>
            </div>
          </div>
        </motion.section>

        {/* 6. HELP & SUPPORT */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-6"
        >
          <div className="bg-white/5 border border-cyan-500/20 rounded-2xl p-6 hover:border-cyan-500/40 transition-all">
            <div className="flex items-center gap-3 mb-6">
              <HelpCircle className="w-5 h-5 text-cyan-500" />
              <h2 className="text-xl font-bold uppercase tracking-wider">Help & Support</h2>
            </div>

            <div className="space-y-4">
              <Link to={createPageUrl('HelpCenter')}>
                <div className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-cyan-500" />
                    <div>
                      <p className="font-semibold">Help Center</p>
                      <p className="text-sm text-white/60">Search FAQs and guides</p>
                    </div>
                  </div>
                  <span className="text-white/40">→</span>
                </div>
              </Link>

              <Link to={createPageUrl('Contact')}>
                <div className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-pink-500" />
                    <div>
                      <p className="font-semibold">Contact Support</p>
                      <p className="text-sm text-white/60">Submit a support ticket</p>
                    </div>
                  </div>
                  <span className="text-white/40">→</span>
                </div>
              </Link>

              <Link to={createPageUrl('CommunityGuidelines')}>
                <div className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-semibold">Community Guidelines</p>
                      <p className="text-sm text-white/60">Rules and expectations</p>
                    </div>
                  </div>
                  <span className="text-white/40">→</span>
                </div>
              </Link>
            </div>
          </div>
        </motion.section>

        {/* 7. DEVELOPER TOOLS (Admin Only) */}
        {(user?.role === 'admin' || user?.role === 'superadmin') && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-6"
          >
            <div className="bg-white/5 border border-yellow-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <Database className="w-5 h-5 text-yellow-500" />
                <h2 className="text-xl font-bold uppercase tracking-wider">Developer Tools</h2>
              </div>

              <Button
                onClick={() => {
                  throw new Error('Sentry test error from Settings page');
                }}
                variant="outline"
                className="w-full bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/40 font-black uppercase"
              >
                Test Sentry Error
              </Button>
              <p className="text-xs text-white/40 text-center mt-2">
                Throws a test error to verify Sentry is working
              </p>
            </div>
          </motion.section>
        )}

        {/* 8. LOGOUT */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="bg-white/5 border border-red-500/20 rounded-2xl p-6">
            <Button
              onClick={handleLogout}
              className="w-full bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/40 font-black uppercase py-6"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </Button>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
