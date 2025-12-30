import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { MapPin, ArrowLeft, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

export default function CreateBeacon() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
    active: true
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Beacon.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['beacons']);
      toast.success('Beacon created successfully!');
      navigate(createPageUrl('Beacons'));
    },
    onError: (error) => {
      console.error('Failed to create beacon:', error);
      toast.error('Failed to create beacon');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.city) {
      toast.error('Please fill in required fields');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
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
            Create Beacon
          </h1>
          <p className="text-white/60">Add a new beacon to the HOTMESS network</p>
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-6"
        >
          <div>
            <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
              Title *
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Summer Vibes Party"
              className="bg-black border-white/20 text-white"
              required
            />
          </div>

          <div>
            <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
              Description
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your beacon..."
              className="bg-black border-white/20 text-white h-24"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                Type *
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

          <div>
            <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
              City *
            </label>
            <Input
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="e.g. London"
              className="bg-black border-white/20 text-white"
              required
            />
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

          <div>
            <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block flex items-center justify-between">
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
          </div>

          <div>
            <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
              XP Reward
            </label>
            <Input
              type="number"
              value={formData.xp_scan}
              onChange={(e) => setFormData({ ...formData, xp_scan: parseInt(e.target.value) })}
              className="bg-black border-white/20 text-white"
            />
          </div>

          <div className="pt-4 flex gap-4">
            <Button
              type="button"
              onClick={() => navigate(-1)}
              variant="ghost"
              className="flex-1 text-white/60 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="flex-1 bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-bold"
            >
              <MapPin className="w-4 h-4 mr-2" />
              {createMutation.isPending ? 'Creating...' : 'Create Beacon'}
            </Button>
          </div>
        </motion.form>
      </div>
    </div>
  );
}