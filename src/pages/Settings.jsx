import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { User, Bell, Shield, Palette, LogOut, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [notifications, setNotifications] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setFullName(currentUser.full_name || '');
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const handleSave = async () => {
    try {
      await base44.auth.updateMe({ full_name: fullName });
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
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-[#FF1493]" />
            <h2 className="text-xl font-bold uppercase tracking-wider">Profile</h2>
          </div>

          <div className="space-y-4">
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

            <div className="pt-4">
              <Button onClick={handleSave} className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
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

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Public Profile</p>
                <p className="text-sm text-white/60">Show your profile to other users</p>
              </div>
              <Switch checked={publicProfile} onCheckedChange={setPublicProfile} />
            </div>
          </div>
        </motion.div>

        {/* Account Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
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