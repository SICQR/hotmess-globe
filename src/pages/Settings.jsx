import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { User, Bell, Shield, LogOut, Save, Edit, Camera, Download, Trash2, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { createPageUrl } from '../utils';

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
        setUser(currentUser);
        setFullName(currentUser.full_name || '');
        setAvatarUrl(currentUser.avatar_url || '');
        setLocationPrivacy(currentUser.location_privacy_mode || 'fuzzy');
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
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
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

        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-[#FF1493]" />
              <h2 className="text-xl font-bold uppercase tracking-wider">Profile</h2>
            </div>
            <Link to={createPageUrl('EditProfile')}>
              <Button variant="outline" className="border-white/20 text-white">
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
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center overflow-hidden">
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
                    className="border-white/20 text-white"
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
                className="bg-black border-white/20 text-white"
              />
            </div>

            <div>
              <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                Email
              </label>
              <Input
                value={user.email}
                disabled
                className="bg-black/50 border-white/10 text-white/40"
              />
            </div>

            <div className="pt-4 flex gap-3">
              <Button onClick={handleSave} className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
              <Button
                onClick={() => navigate(createPageUrl(`Profile?email=${user.email}`))}
                variant="outline"
                className="border-white/20 text-white"
              >
                View Profile
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4"
        >
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-[#00D9FF]" />
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

            <div className="bg-[#00D9FF]/10 border border-[#00D9FF]/40 rounded-lg p-4">
              <p className="text-xs text-white/80 leading-relaxed">
                🔒 <span className="font-bold">Social Links Privacy:</span> Your social media links are only visible to users you've completed a Telegram handshake with. Edit them in your full profile.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Data & Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4"
        >
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-5 h-5 text-[#B026FF]" />
            <h2 className="text-xl font-bold uppercase tracking-wider">Data & Privacy</h2>
          </div>

          <div className="space-y-4">
            <Link to={createPageUrl('DataExport')}>
              <div className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <Download className="w-5 h-5 text-[#FF1493]" />
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

        {/* Account Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
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