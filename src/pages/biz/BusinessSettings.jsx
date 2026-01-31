import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, Building2, Mail, Phone, Globe, MapPin,
  Bell, Shield, Users, Save, Loader2, Image
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

export default function BusinessSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [form, setForm] = useState({
    business_name: '',
    description: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: 'London',
    logo_url: '',
    // Notification settings
    email_new_orders: true,
    email_reviews: true,
    email_weekly_digest: true,
    push_messages: true,
    // Privacy settings
    public_profile: true,
    show_analytics: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) { setLoading(false); return; }
    
    const { data: biz } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('owner_id', user.user.id)
      .single();
    
    if (biz) {
      setForm(prev => ({
        ...prev,
        business_name: biz.business_name || '',
        description: biz.description || '',
        email: biz.contact_email || user.user.email,
        phone: biz.phone || '',
        website: biz.website || '',
        address: biz.address || '',
        city: biz.city || 'London',
        logo_url: biz.logo_url || '',
      }));
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) { setSaving(false); return; }

    const { error } = await supabase
      .from('business_profiles')
      .upsert({
        owner_id: user.user.id,
        business_name: form.business_name,
        description: form.description,
        contact_email: form.email,
        phone: form.phone,
        website: form.website,
        address: form.address,
        city: form.city,
        logo_url: form.logo_url,
        updated_at: new Date().toISOString()
      }, { onConflict: 'owner_id' });

    setSaving(false);
    if (error) {
      toast.error('Failed to save settings');
    } else {
      toast.success('Settings saved!');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'team', label: 'Team', icon: Users },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF1493]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 p-6">
        <div className="max-w-6xl mx-auto">
          <Button
            onClick={() => navigate(createPageUrl('BusinessDashboard'))}
            variant="ghost"
            className="mb-4 text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black uppercase">
                Business <span className="text-[#FF1493]">Settings</span>
              </h1>
              <p className="text-white/60 mt-2">Manage your business account</p>
            </div>
            <Button variant="hot" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        <div className="grid md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 p-3 text-left transition-all ${
                    activeTab === tab.id 
                      ? 'bg-[#FF1493]/20 border-l-4 border-[#FF1493] text-white' 
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="md:col-span-3">
            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/5 border border-white/10 p-6"
              >
                <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#FF1493]" />
                  Business Profile
                </h2>
                
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">Business Name</label>
                      <Input
                        value={form.business_name}
                        onChange={(e) => setForm(f => ({ ...f, business_name: e.target.value }))}
                        className="bg-white/5 border-white/20"
                        placeholder="Your business name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">City</label>
                      <Input
                        value={form.city}
                        onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))}
                        className="bg-white/5 border-white/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">Description</label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                      className="bg-white/5 border-white/20 h-24"
                      placeholder="Tell people about your business"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">
                        <Mail className="w-3 h-3 inline mr-1" />
                        Email
                      </label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                        className="bg-white/5 border-white/20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">
                        <Phone className="w-3 h-3 inline mr-1" />
                        Phone
                      </label>
                      <Input
                        value={form.phone}
                        onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                        className="bg-white/5 border-white/20"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">
                        <Globe className="w-3 h-3 inline mr-1" />
                        Website
                      </label>
                      <Input
                        value={form.website}
                        onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))}
                        className="bg-white/5 border-white/20"
                        placeholder="https://"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        Address
                      </label>
                      <Input
                        value={form.address}
                        onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                        className="bg-white/5 border-white/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">
                      <Image className="w-3 h-3 inline mr-1" />
                      Logo URL
                    </label>
                    <Input
                      value={form.logo_url}
                      onChange={(e) => setForm(f => ({ ...f, logo_url: e.target.value }))}
                      className="bg-white/5 border-white/20"
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'notifications' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/5 border border-white/10 p-6"
              >
                <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-[#00D9FF]" />
                  Notification Preferences
                </h2>
                
                <div className="space-y-4">
                  {[
                    { key: 'email_new_orders', label: 'New orders & bookings', desc: 'Get notified when you receive orders' },
                    { key: 'email_reviews', label: 'Reviews & feedback', desc: 'Notifications about new reviews' },
                    { key: 'email_weekly_digest', label: 'Weekly digest', desc: 'Summary of your business performance' },
                    { key: 'push_messages', label: 'Push notifications', desc: 'Real-time alerts on your device' },
                  ].map((item) => (
                    <label key={item.key} className="flex items-start gap-4 p-4 bg-white/5 border border-white/10 cursor-pointer hover:border-white/20">
                      <input
                        type="checkbox"
                        checked={form[item.key]}
                        onChange={(e) => setForm(f => ({ ...f, [item.key]: e.target.checked }))}
                        className="w-5 h-5 mt-0.5 accent-[#FF1493]"
                      />
                      <div>
                        <p className="font-bold">{item.label}</p>
                        <p className="text-sm text-white/60">{item.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'privacy' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/5 border border-white/10 p-6"
              >
                <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#39FF14]" />
                  Privacy Settings
                </h2>
                
                <div className="space-y-4">
                  <label className="flex items-start gap-4 p-4 bg-white/5 border border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.public_profile}
                      onChange={(e) => setForm(f => ({ ...f, public_profile: e.target.checked }))}
                      className="w-5 h-5 mt-0.5 accent-[#FF1493]"
                    />
                    <div>
                      <p className="font-bold">Public business profile</p>
                      <p className="text-sm text-white/60">Allow users to discover your business on HOTMESS</p>
                    </div>
                  </label>
                  
                  <label className="flex items-start gap-4 p-4 bg-white/5 border border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.show_analytics}
                      onChange={(e) => setForm(f => ({ ...f, show_analytics: e.target.checked }))}
                      className="w-5 h-5 mt-0.5 accent-[#FF1493]"
                    />
                    <div>
                      <p className="font-bold">Share analytics with partners</p>
                      <p className="text-sm text-white/60">Allow anonymized data sharing for network insights</p>
                    </div>
                  </label>
                </div>
              </motion.div>
            )}

            {activeTab === 'team' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/5 border border-white/10 p-6"
              >
                <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#B026FF]" />
                  Team Members
                </h2>
                
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60 mb-4">Invite team members to help manage your business</p>
                  <Button variant="outline">
                    Invite Team Member
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
