import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Zap, Clock, Home, Car, Building, HelpCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const DURATIONS = [
  { value: 30, label: '30 min', icon: Clock },
  { value: 60, label: '1 hour', icon: Clock },
  { value: 120, label: '2 hours', icon: Clock },
  { value: 480, label: 'Tonight', icon: Zap }
];

const LOGISTICS = [
  { value: 'can_host', label: 'Can host', icon: Home },
  { value: 'can_travel', label: 'Can travel', icon: Car },
  { value: 'hotel', label: 'Hotel', icon: Building },
  { value: 'undecided', label: 'Undecided', icon: HelpCircle }
];

export default function RightNowModal({ isOpen, onClose, currentUser }) {
  const [duration, setDuration] = useState(60);
  const [logistics, setLogistics] = useState([]);
  const queryClient = useQueryClient();

  const goLiveMutation = useMutation({
    mutationFn: async () => {
      const expiresAt = new Date(Date.now() + duration * 60 * 1000).toISOString();
      
      // Deactivate any existing Right Now status
      const existing = await base44.entities.RightNowStatus.filter({ 
        user_email: currentUser.email,
        active: true 
      });
      
      for (const status of existing) {
        await base44.entities.RightNowStatus.update(status.id, { active: false });
      }
      
      // Create new status
      return base44.entities.RightNowStatus.create({
        user_email: currentUser.email,
        duration_minutes: duration,
        expires_at: expiresAt,
        logistics,
        active: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['right-now-status']);
      toast.success('You\'re live! Status auto-expires.');
      onClose();
    }
  });

  const toggleLogistics = (value) => {
    setLogistics(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border-2 border-[#FF1493] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase flex items-center gap-2">
            <Zap className="w-6 h-6 text-[#FF1493]" />
            Go Right Now
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Duration */}
          <div>
            <p className="text-xs uppercase tracking-wider text-white/60 mb-3">Pick duration</p>
            <div className="grid grid-cols-2 gap-2">
              {DURATIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setDuration(value)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 border-2 transition-all ${
                    duration === value
                      ? 'bg-[#FF1493] border-[#FF1493] text-black'
                      : 'border-white/20 text-white hover:border-white/40'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-bold text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Logistics */}
          <div>
            <p className="text-xs uppercase tracking-wider text-white/60 mb-3">Pick logistics</p>
            <div className="grid grid-cols-2 gap-2">
              {LOGISTICS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => toggleLogistics(value)}
                  className={`flex items-center justify-center gap-2 px-4 py-3 border-2 transition-all ${
                    logistics.includes(value)
                      ? 'bg-[#00D9FF] border-[#00D9FF] text-black'
                      : 'border-white/20 text-white hover:border-white/40'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-bold text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Microcopy */}
          <p className="text-xs text-white/40 text-center">
            Ends automatically. No ghost status.
          </p>

          {/* CTA */}
          <Button
            onClick={() => goLiveMutation.mutate()}
            disabled={goLiveMutation.isPending}
            className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black uppercase py-6"
          >
            {goLiveMutation.isPending ? 'Going live...' : 'Go live'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}