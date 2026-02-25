import { useState, useCallback } from 'react';
import { usePulse } from '@/contexts/PulseContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { MapPin, Clock, Users, Zap } from 'lucide-react';

/**
 * Beacon Composer
 * Creates venue/event beacons
 * 
 * CTAs:
 * - "Drop beacon"
 * - "Boost tonight"
 * 
 * Signal: Beacon → heat bloom
 */

export function BeaconComposer({ 
  onSubmit, 
  defaultLocation = null,
  className 
}) {
  const { bloom } = usePulse();
  const [title, setTitle] = useState('');
  const [capacity, setCapacity] = useState(50);
  const [duration, setDuration] = useState(4); // hours
  const [isBoost, setIsBoost] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) return;
    
    setIsSubmitting(true);
    try {
      const beacon = {
        title: title.trim(),
        capacity,
        duration_hours: duration,
        is_boosted: isBoost,
        location: defaultLocation,
      };
      
      await onSubmit?.(beacon);
      
      // Emit pulse
      bloom(defaultLocation, isBoost ? 2 : 1);
      
      // Reset
      setTitle('');
      setCapacity(50);
      setDuration(4);
      setIsBoost(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [title, capacity, duration, isBoost, defaultLocation, onSubmit, bloom]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Title */}
      <div>
        <label className="text-xs font-bold text-white/60 uppercase tracking-wider">
          What's happening?
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Friday night at..."
          className="mt-2 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:border-[#00D9FF]/50 focus:outline-none"
        />
      </div>

      {/* Capacity */}
      <div>
        <label className="text-xs font-bold text-white/60 uppercase tracking-wider flex items-center gap-2">
          <Users size={14} />
          Capacity
        </label>
        <CapacitySlider value={capacity} onChange={setCapacity} />
      </div>

      {/* Duration */}
      <div>
        <label className="text-xs font-bold text-white/60 uppercase tracking-wider flex items-center gap-2">
          <Clock size={14} />
          Duration
        </label>
        <DurationPicker value={duration} onChange={setDuration} />
      </div>

      {/* Location indicator */}
      {defaultLocation && (
        <div className="flex items-center gap-2 text-sm text-white/60">
          <MapPin size={14} className="text-[#C8962C]" />
          <span>Beacon will drop at your current location</span>
        </div>
      )}

      {/* CTAs */}
      <div className="flex gap-3">
        <Button
          variant="cyan"
          className="flex-1"
          disabled={!title.trim() || isSubmitting}
          onClick={handleSubmit}
        >
          <MapPin size={16} className="mr-2" />
          Drop beacon
        </Button>
        <Button
          variant={isBoost ? 'hot' : 'glass'}
          className="flex-1"
          onClick={() => setIsBoost(!isBoost)}
        >
          <Zap size={16} className="mr-2" />
          {isBoost ? 'Boosted!' : 'Boost tonight'}
        </Button>
      </div>
    </div>
  );
}

/**
 * Capacity Slider
 */
export function CapacitySlider({ value, onChange }) {
  return (
    <div className="mt-3 space-y-2">
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={10}
        max={500}
        step={10}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-white/50">
        <span>10</span>
        <span className="font-bold text-white">{value} people</span>
        <span>500+</span>
      </div>
    </div>
  );
}

/**
 * Duration Picker
 */
export function DurationPicker({ value, onChange }) {
  const options = [2, 4, 6, 8, 12];
  
  return (
    <div className="mt-3 flex gap-2">
      {options.map((hours) => (
        <button
          key={hours}
          onClick={() => onChange(hours)}
          className={cn(
            'flex-1 py-2 rounded-lg text-sm font-bold transition-all',
            value === hours
              ? 'bg-[#00D9FF] text-black'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
          )}
        >
          {hours}h
        </button>
      ))}
    </div>
  );
}

export default BeaconComposer;
