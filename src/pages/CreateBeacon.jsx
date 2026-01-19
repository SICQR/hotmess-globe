import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { MapPin, ArrowLeft, ArrowRight, Calendar, Image, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { snapToGrid } from '../components/utils/locationPrivacy';
import { toUTC } from '../components/utils/dateUtils';
import MediaUploader from '../components/media/MediaUploader';

export default function CreateBeacon() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    kind: 'event',
    lat: 51.5074,
    lng: -0.1278,
    city: 'London',
    intensity: 0.5,
    xp_scan: 100,
    mode: 'crowd',
    active: true,
    sponsored: false,
    event_date: '',
    image_url: '',
    video_url: '',
    status: 'published',
    capacity: null,
    ticket_url: '',
    venue_name: ''
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Convert event_date to UTC for storage
      if (data.event_date) {
        data.event_date = toUTC(data.event_date);
      }
      
      // Apply location privacy for non-Care beacons
      if (data.mode !== 'care' && data.lat && data.lng) {
        const snapped = snapToGrid(data.lat, data.lng);
        data.lat = snapped.lat;
        data.lng = snapped.lng;
      }
      
      // Mark as shadow beacon for non-admin users
      const user = await base44.auth.me();
      if (user.role !== 'admin') {
        data.is_shadow = true;
        data.is_verified = false;
      }
      
      const newBeacon = await base44.entities.Beacon.create(data);
      
      // Notify admins of new shadow beacon
      if (data.is_shadow) {
        await base44.entities.Notification.create({
          user_email: 'admin',
          type: 'shadow_beacon',
          title: 'New Beacon Pending Approval',
          message: `${user.full_name || user.email} submitted "${data.title}" for review.`,
          link: 'AdminDashboard',
          metadata: { beacon_id: newBeacon.id }
        });
      }
      
      return newBeacon;
    },
    onSuccess: (newBeacon) => {
      queryClient.invalidateQueries(['beacons']);
      queryClient.invalidateQueries(['shadow-beacons']);
      if (newBeacon.is_shadow) {
        toast.success('Event submitted for admin review!');
      } else {
        toast.success('Event created and live!');
      }
      navigate(createPageUrl(`BeaconDetail?id=${newBeacon.id}`));
    },
    onError: (error) => {
      console.error('Failed to create beacon:', error);
      toast.error('Failed to create event');
    }
  });

  const handleMediaUpload = (result, type) => {
    if (type === 'image') {
      setFormData({ ...formData, image_url: result.url });
    } else {
      setFormData({ ...formData, video_url: result.url });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.city) {
      toast.error('Please fill in required fields');
      return;
    }
    createMutation.mutate(formData);
  };

  const nextStep = () => {
    if (step === 1 && (!formData.title || !formData.description)) {
      toast.error('Please complete Step 1');
      return;
    }
    if (step === 2 && (!formData.city || !formData.event_date)) {
      toast.error('Please complete Step 2');
      return;
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            className="mb-4 text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mb-2">
            Create Event
          </h1>
          <p className="text-white/60 text-sm">4 quick steps • Pending admin review for non-admin users</p>
        </motion.div>

        {/* Progress */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold ${
                s === step ? 'border-[#FF1493] bg-[#FF1493] text-black' :
                s < step ? 'border-[#39FF14] bg-[#39FF14] text-black' :
                'border-white/20 text-white/40'
              }`}>
                {s}
              </div>
              {s < 4 && <div className={`w-12 h-1 ${s < step ? 'bg-[#39FF14]' : 'bg-white/20'}`} />}
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white/5 border-2 border-[#FF1493] rounded-none p-6 space-y-6"
              >
                <h2 className="text-2xl font-black uppercase mb-4">Step 1: Basic Info</h2>
                
                <div>
                  <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                    Event Title *
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. FOLD • Saturday Night Session"
                    className="bg-black border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                    Description *
                  </label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Tell people what makes this event special..."
                    className="bg-black border-white/20 text-white h-32"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                      Event Type *
                    </label>
                    <Select value={formData.kind} onValueChange={(value) => setFormData({ ...formData, kind: value })}>
                      <SelectTrigger className="bg-black border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="venue">Venue</SelectItem>
                        <SelectItem value="hookup">Hookup</SelectItem>
                        <SelectItem value="drop">Drop</SelectItem>
                        <SelectItem value="popup">Popup</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                      Mode
                    </label>
                    <Select value={formData.mode} onValueChange={(value) => setFormData({ ...formData, mode: value })}>
                      <SelectTrigger className="bg-black border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hookup">Hookup</SelectItem>
                        <SelectItem value="crowd">Crowd</SelectItem>
                        <SelectItem value="drop">Drop</SelectItem>
                        <SelectItem value="ticket">Ticket</SelectItem>
                        <SelectItem value="radio">Radio</SelectItem>
                        <SelectItem value="care">Care</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="button" onClick={nextStep} className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black rounded-none">
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white/5 border-2 border-[#FF1493] rounded-none p-6 space-y-6"
              >
                <h2 className="text-2xl font-black uppercase mb-4">Step 2: Location & Time</h2>

                <div>
                  <label className="text-sm text-white/60 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Event Date & Time *
                  </label>
                  <Input
                    type="datetime-local"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="bg-black border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                    Venue Name
                  </label>
                  <Input
                    value={formData.venue_name}
                    onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                    placeholder="e.g. Fabric London"
                    className="bg-black border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                    City *
                  </label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. London"
                    className="bg-black border-white/20 text-white"
                  />
                  <p className="text-xs text-white/40 mt-2">
                    💡 Tip: Click map below to auto-fill coordinates
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                      Latitude
                    </label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={formData.lat}
                      onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                      className="bg-black border-white/20 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                      Longitude
                    </label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={formData.lng}
                      onChange={(e) => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
                      className="bg-black border-white/20 text-white"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-between">
                  <Button type="button" onClick={prevStep} variant="outline" className="border-white/20 text-white rounded-none">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button type="button" onClick={nextStep} className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black rounded-none">
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white/5 border-2 border-[#FF1493] rounded-none p-6 space-y-6"
              >
                <h2 className="text-2xl font-black uppercase mb-4">Step 3: Media & Promo</h2>

                <div>
                  <label className="text-sm text-white/60 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    Event Image
                  </label>
                  <MediaUploader
                    type="image"
                    onUploadComplete={(result) => handleMediaUpload(result, 'image')}
                    showPreview={true}
                    compress={true}
                    moderate={true}
                  />
                  {formData.image_url && (
                    <img src={formData.image_url} alt="Preview" className="w-full h-48 object-cover rounded-lg border-2 border-[#FF1493] mt-3" />
                  )}
                </div>

                <div>
                  <label className="text-sm text-white/60 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    Event Video (Optional)
                  </label>
                  <MediaUploader
                    type="video"
                    onUploadComplete={(result) => handleMediaUpload(result, 'video')}
                    showPreview={false}
                    compress={false}
                    moderate={true}
                  />
                  {formData.video_url && (
                    <video src={formData.video_url} controls className="w-full h-48 rounded-lg border-2 border-[#FF1493] mt-3" />
                  )}
                </div>

                <div className="pt-4 flex justify-between">
                  <Button type="button" onClick={prevStep} variant="outline" className="border-white/20 text-white rounded-none">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button type="button" onClick={nextStep} className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black rounded-none">
                    Next <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white/5 border-2 border-[#FF1493] rounded-none p-6 space-y-6"
              >
                <h2 className="text-2xl font-black uppercase mb-4">Step 4: Engagement</h2>

                <div>
                  <label className="text-sm text-white/60 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Intensity</span>
                    <span className="text-white font-bold">{Math.round(formData.intensity * 100)}%</span>
                  </label>
                  <Slider
                    value={[formData.intensity * 100]}
                    onValueChange={(val) => setFormData({ ...formData, intensity: val[0] / 100 })}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-white/40 mt-2">How crowded/active will this event be?</p>
                </div>

                <div>
                  <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                    XP Reward
                  </label>
                  <Input
                    type="number"
                    value={Number.isFinite(formData.xp_scan) ? formData.xp_scan : ''}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') {
                        setFormData({ ...formData, xp_scan: 0 });
                        return;
                      }
                      const parsed = Number.parseInt(raw, 10);
                      setFormData({ ...formData, xp_scan: Number.isFinite(parsed) ? parsed : 0 });
                    }}
                    className="bg-black border-white/20 text-white"
                  />
                  <p className="text-xs text-white/40 mt-2">XP users earn for scanning this beacon</p>
                </div>

                <div>
                  <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                    Capacity
                  </label>
                  <Input
                    type="number"
                    value={formData.capacity || ''}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || null })}
                    placeholder="Maximum attendees (optional)"
                    className="bg-black border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                    Ticket URL
                  </label>
                  <Input
                    value={formData.ticket_url}
                    onChange={(e) => setFormData({ ...formData, ticket_url: e.target.value })}
                    placeholder="https://..."
                    className="bg-black border-white/20 text-white"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-black rounded-lg border border-white/20">
                  <div>
                    <label className="text-sm font-bold uppercase tracking-wider">Sponsored Event</label>
                    <p className="text-xs text-white/40">Feature this event prominently</p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setFormData({ ...formData, sponsored: !formData.sponsored })}
                    className={`rounded-none ${formData.sponsored ? 'bg-[#FFEB3B] text-black' : 'bg-white/10 text-white'}`}
                  >
                    {formData.sponsored ? 'YES' : 'NO'}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-black rounded-lg border border-white/20">
                  <div>
                    <label className="text-sm font-bold uppercase tracking-wider">Save as Draft</label>
                    <p className="text-xs text-white/40">Publish later</p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: formData.status === 'draft' ? 'published' : 'draft' })}
                    className={`rounded-none ${formData.status === 'draft' ? 'bg-white/20 text-white' : 'bg-[#39FF14] text-black'}`}
                  >
                    {formData.status === 'draft' ? 'DRAFT' : 'PUBLISH'}
                  </Button>
                </div>

                <div className="pt-4 flex justify-between">
                  <Button type="button" onClick={prevStep} variant="outline" className="border-white/20 text-white rounded-none">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="bg-[#39FF14] hover:bg-[#39FF14]/90 text-black font-black rounded-none"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    {createMutation.isPending ? 'Creating...' : 'Create Event'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}