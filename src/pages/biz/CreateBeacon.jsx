/**
 * Create Event Beacon Page
 * 
 * Form for promoters to create event beacons on the globe.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/components/utils/supabaseClient';
import { useNavigate } from 'react-router-dom';

// Tier configs
const TIERS = [
  { id: 'basic_3h', name: 'Basic', hours: 3, price: 9.99, reach: '25km', color: '#FFFFFF' },
  { id: 'standard_6h', name: 'Standard', hours: 6, price: 19.99, reach: '50km', color: '#00D9FF', popular: false },
  { id: 'premium_9h', name: 'Premium', hours: 9, price: 39.99, reach: '100km', color: '#FFB800', popular: true },
  { id: 'featured_12h', name: 'Featured', hours: 12, price: 79.99, reach: '200km', color: '#FF1493' },
  { id: 'spotlight_24h', name: 'Spotlight', hours: 24, price: 149.99, reach: '500km', color: '#B026FF' }
];

export default function CreateBeacon() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    venueName: '',
    venueAddress: '',
    latitude: null,
    longitude: null,
    eventDate: '',
    eventTime: '',
    ticketUrl: '',
    ticketPrice: '',
    imageUrl: '',
    selectedTier: 'premium_9h'
  });

  // Update form field
  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Geocode address
  const geocodeAddress = async () => {
    if (!formData.venueAddress) return;
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.venueAddress)}`
      );
      const results = await response.json();
      
      if (results.length > 0) {
        updateField('latitude', parseFloat(results[0].lat));
        updateField('longitude', parseFloat(results[0].lon));
      }
    } catch (err) {
      console.error('Geocoding failed:', err);
    }
  };

  // Handle submit
  const handleSubmit = async () => {
    setLoading(true);

    try {
      // Parse price safely
      const priceFloat = parseFloat(formData.ticketPrice);
      const ticketPriceCents = !isNaN(priceFloat) ? Math.round(priceFloat * 100) : null;

      // Create beacon
      const { data: beacon, error: beaconError } = await supabase
        .from('Beacon')
        .insert({
          beacon_type: 'event',
          promoter_id: user.id,
          event_title: formData.title,
          event_description: formData.description,
          venue_name: formData.venueName,
          venue_address: formData.venueAddress,
          latitude: formData.latitude,
          longitude: formData.longitude,
          event_start: `${formData.eventDate}T${formData.eventTime}:00`,
          ticket_url: formData.ticketUrl,
          ticket_price_cents: ticketPriceCents,
          image_url: formData.imageUrl,
          tier_id: formData.selectedTier,
          title: formData.title,
          description: formData.description
        })
        .select()
        .single();

      if (beaconError) throw beaconError;

      // Create purchase record (would integrate with Stripe)
      const tier = TIERS.find(t => t.id === formData.selectedTier);
      
      await supabase
        .from('beacon_purchases')
        .insert({
          beacon_id: beacon.id,
          user_id: user.id,
          tier_id: formData.selectedTier,
          amount_cents: Math.round(tier.price * 100),
          payment_status: 'pending'
        });

      // Redirect to payment (simplified - would use Stripe checkout)
      navigate(`/biz/beacon/${beacon.id}/pay`);

    } catch (error) {
      console.error('Create beacon error:', error);
      alert('Failed to create beacon. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedTier = TIERS.find(t => t.id === formData.selectedTier);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 p-6">
        <div className="max-w-2xl mx-auto">
          <button 
            onClick={() => step > 1 ? setStep(step - 1) : navigate('/biz')}
            className="flex items-center gap-2 text-white/60 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-2xl font-black uppercase">Create Event Beacon</h1>
          <p className="text-white/60 text-sm">Drop your event on the globe</p>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-2xl mx-auto px-6 pt-6">
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div 
              key={s}
              className={`h-1 flex-1 transition-colors ${s <= step ? 'bg-[#FF1493]' : 'bg-white/20'}`}
            />
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-6 pb-12">
        {/* Step 1: Event Details */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <h2 className="text-lg font-bold">Event Details</h2>

            <div>
              <label className="block text-sm text-white/60 mb-2">Event Name *</label>
              <Input
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder="e.g., XXL Saturday Night"
                className="bg-white/5 border-white/20"
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-2">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="What's the vibe? Who's performing?"
                rows={4}
                className="bg-white/5 border-white/20"
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-2">Image URL</label>
              <Input
                value={formData.imageUrl}
                onChange={(e) => updateField('imageUrl', e.target.value)}
                placeholder="https://..."
                className="bg-white/5 border-white/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Date *</label>
                <Input
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) => updateField('eventDate', e.target.value)}
                  className="bg-white/5 border-white/20"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Start Time *</label>
                <Input
                  type="time"
                  value={formData.eventTime}
                  onChange={(e) => updateField('eventTime', e.target.value)}
                  className="bg-white/5 border-white/20"
                />
              </div>
            </div>

            <Button
              onClick={() => setStep(2)}
              disabled={!formData.title || !formData.eventDate || !formData.eventTime}
              className="w-full bg-[#FF1493] hover:bg-[#FF1493]/80"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}

        {/* Step 2: Location & Tickets */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <h2 className="text-lg font-bold">Location & Tickets</h2>

            <div>
              <label className="block text-sm text-white/60 mb-2">Venue Name *</label>
              <Input
                value={formData.venueName}
                onChange={(e) => updateField('venueName', e.target.value)}
                placeholder="e.g., Fire London"
                className="bg-white/5 border-white/20"
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-2">Venue Address *</label>
              <Input
                value={formData.venueAddress}
                onChange={(e) => updateField('venueAddress', e.target.value)}
                onBlur={geocodeAddress}
                placeholder="Full address for map pin"
                className="bg-white/5 border-white/20"
              />
              {formData.latitude && (
                <p className="text-xs text-[#39FF14] mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Location found
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/60 mb-2">Ticket URL</label>
                <Input
                  value={formData.ticketUrl}
                  onChange={(e) => updateField('ticketUrl', e.target.value)}
                  placeholder="https://..."
                  className="bg-white/5 border-white/20"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Ticket Price (£)</label>
                <Input
                  type="number"
                  value={formData.ticketPrice}
                  onChange={(e) => updateField('ticketPrice', e.target.value)}
                  placeholder="0.00"
                  className="bg-white/5 border-white/20"
                />
              </div>
            </div>

            <Button
              onClick={() => setStep(3)}
              disabled={!formData.venueName || !formData.venueAddress}
              className="w-full bg-[#FF1493] hover:bg-[#FF1493]/80"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}

        {/* Step 3: Select Tier */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <h2 className="text-lg font-bold">Choose Your Reach</h2>

            <div className="space-y-3">
              {TIERS.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => updateField('selectedTier', tier.id)}
                  className={`
                    w-full p-4 border-2 transition-all text-left relative
                    ${formData.selectedTier === tier.id 
                      ? 'border-white bg-white/10' 
                      : 'border-white/20 hover:border-white/40'
                    }
                  `}
                  style={{
                    borderColor: formData.selectedTier === tier.id ? tier.color : undefined
                  }}
                >
                  {tier.popular && (
                    <span className="absolute -top-2 right-4 px-2 py-0.5 bg-[#FF1493] text-[10px] text-white font-bold">
                      POPULAR
                    </span>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white" style={{ color: tier.color }}>
                        {tier.name}
                      </h4>
                      <p className="text-sm text-white/60">
                        {tier.hours}hr • {tier.reach} reach
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-white">£{tier.price}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Summary */}
            <div className="p-4 bg-white/5 border border-white/10">
              <h4 className="font-bold text-white mb-3">Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Event</span>
                  <span className="text-white">{formData.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Venue</span>
                  <span className="text-white">{formData.venueName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Date</span>
                  <span className="text-white">{formData.eventDate} @ {formData.eventTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Tier</span>
                  <span style={{ color: selectedTier?.color }}>{selectedTier?.name}</span>
                </div>
                <div className="pt-2 border-t border-white/10 flex justify-between">
                  <span className="font-bold text-white">Total</span>
                  <span className="font-bold text-white">£{selectedTier?.price}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-[#FF1493] hover:bg-[#FF1493]/80 h-14 text-lg font-bold"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Pay & Launch Beacon
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            <p className="text-xs text-white/40 text-center">
              Your beacon will go live immediately after payment
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}
