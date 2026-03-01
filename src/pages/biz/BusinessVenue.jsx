import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  ArrowLeft, Building2, MapPin, Clock, Users, Music, 
  Wifi, Accessibility, Car, CreditCard, Save, Loader2,
  Plus, Trash2, Camera, CheckCircle
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

const AMENITIES = [
  { id: 'wifi', label: 'Free WiFi', icon: Wifi },
  { id: 'accessible', label: 'Wheelchair Accessible', icon: Accessibility },
  { id: 'parking', label: 'Parking', icon: Car },
  { id: 'card_payment', label: 'Card Payments', icon: CreditCard },
  { id: 'live_music', label: 'Live Music', icon: Music },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function BusinessVenue() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [venue, setVenue] = useState({
    name: '',
    address: '',
    city: 'London',
    postcode: '',
    description: '',
    capacity: '',
    amenities: [],
    hours: DAYS.reduce((acc, day) => ({ ...acc, [day]: { open: '18:00', close: '02:00', closed: false } }), {}),
    photos: [],
  });

  useEffect(() => {
    loadVenue();
  }, []);

  const loadVenue = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) { setLoading(false); return; }
    
    const { data: biz } = await supabase
      .from('business_profiles')
      .select('*, venues(*)')
      .eq('owner_id', user.user.id)
      .single();
    
    if (biz?.venues?.[0]) {
      const v = biz.venues[0];
      setVenue(prev => ({
        ...prev,
        name: v.name || biz.business_name || '',
        address: v.address || '',
        city: v.city || 'London',
        postcode: v.postcode || '',
        description: v.description || '',
        capacity: v.capacity || '',
        amenities: v.amenities || [],
        hours: v.hours || prev.hours,
        photos: v.photos || [],
      }));
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    // In production, this would save to venues table
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    toast.success('Venue details saved!');
  };

  const toggleAmenity = (id) => {
    setVenue(prev => ({
      ...prev,
      amenities: prev.amenities.includes(id) 
        ? prev.amenities.filter(a => a !== id)
        : [...prev.amenities, id]
    }));
  };

  const updateHours = (day, field, value) => {
    setVenue(prev => ({
      ...prev,
      hours: {
        ...prev.hours,
        [day]: { ...prev.hours[day], [field]: value }
      }
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#C8962C]" />
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
                Venue <span className="text-[#C8962C]">Management</span>
              </h1>
              <p className="text-white/60 mt-2">Configure your venue details</p>
            </div>
            <Button variant="hot" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Basic Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 p-6"
        >
          <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#C8962C]" />
            Basic Information
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">Venue Name</label>
              <Input
                value={venue.name}
                onChange={(e) => setVenue(v => ({ ...v, name: e.target.value }))}
                className="bg-white/5 border-white/20"
                placeholder="The Venue"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">Capacity</label>
              <Input
                type="number"
                value={venue.capacity}
                onChange={(e) => setVenue(v => ({ ...v, capacity: e.target.value }))}
                className="bg-white/5 border-white/20"
                placeholder="250"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">Description</label>
              <Textarea
                value={venue.description}
                onChange={(e) => setVenue(v => ({ ...v, description: e.target.value }))}
                className="bg-white/5 border-white/20 h-24"
                placeholder="Describe your venue..."
              />
            </div>
          </div>
        </motion.div>

        {/* Location */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 border border-white/10 p-6"
        >
          <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#00D9FF]" />
            Location
          </h2>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">Address</label>
              <Input
                value={venue.address}
                onChange={(e) => setVenue(v => ({ ...v, address: e.target.value }))}
                className="bg-white/5 border-white/20"
                placeholder="123 Club Street"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">Postcode</label>
              <Input
                value={venue.postcode}
                onChange={(e) => setVenue(v => ({ ...v, postcode: e.target.value }))}
                className="bg-white/5 border-white/20"
                placeholder="E1 6AN"
              />
            </div>
          </div>
        </motion.div>

        {/* Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/5 border border-white/10 p-6"
        >
          <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#39FF14]" />
            Opening Hours
          </h2>
          
          <div className="space-y-3">
            {DAYS.map((day) => (
              <div key={day} className="flex items-center gap-4 p-3 bg-white/5 border border-white/10">
                <div className="w-24 font-bold">{day}</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!venue.hours[day]?.closed}
                    onChange={(e) => updateHours(day, 'closed', !e.target.checked)}
                    className="w-4 h-4 accent-[#C8962C]"
                  />
                  <span className="text-sm">Open</span>
                </label>
                {!venue.hours[day]?.closed && (
                  <>
                    <input
                      type="time"
                      value={venue.hours[day]?.open || '18:00'}
                      onChange={(e) => updateHours(day, 'open', e.target.value)}
                      className="bg-white/10 border border-white/20 px-2 py-1 text-sm"
                    />
                    <span className="text-white/60">to</span>
                    <input
                      type="time"
                      value={venue.hours[day]?.close || '02:00'}
                      onChange={(e) => updateHours(day, 'close', e.target.value)}
                      className="bg-white/10 border border-white/20 px-2 py-1 text-sm"
                    />
                  </>
                )}
                {venue.hours[day]?.closed && (
                  <span className="text-white/40 text-sm">Closed</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Amenities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/5 border border-white/10 p-6"
        >
          <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#C8962C]" />
            Amenities
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {AMENITIES.map((amenity) => {
              const Icon = amenity.icon;
              const selected = venue.amenities.includes(amenity.id);
              return (
                <button
                  key={amenity.id}
                  onClick={() => toggleAmenity(amenity.id)}
                  className={`p-4 border text-center transition-all ${
                    selected 
                      ? 'border-[#39FF14] bg-[#39FF14]/10' 
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <Icon className={`w-6 h-6 mx-auto mb-2 ${selected ? 'text-[#39FF14]' : 'text-white/60'}`} />
                  <p className="text-xs font-bold">{amenity.label}</p>
                  {selected && <CheckCircle className="w-4 h-4 text-[#39FF14] mx-auto mt-2" />}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Photos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 border border-white/10 p-6"
        >
          <h2 className="text-xl font-black uppercase mb-6 flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#FFD700]" />
            Venue Photos
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {venue.photos.map((photo, i) => (
              <div key={i} className="aspect-square bg-white/10 border border-white/20 relative group">
                <img src={photo} alt="" className="w-full h-full object-cover" />
                <button className="absolute top-2 right-2 p-1 bg-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button className="aspect-square border-2 border-dashed border-white/20 hover:border-[#C8962C] transition-colors flex flex-col items-center justify-center">
              <Plus className="w-8 h-8 text-white/40" />
              <span className="text-xs text-white/60 mt-2">Add Photo</span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
