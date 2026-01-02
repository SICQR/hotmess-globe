import React, { useState, useEffect } from 'react';
import { Clock, Save, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function CheckInTimerCustomizer() {
  const [customTimers, setCustomTimers] = useState([]);
  const [newHours, setNewHours] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      setCustomTimers(user.custom_check_in_timers || []);
    };
    fetchUser();
  }, []);

  const addTimer = async () => {
    const hours = parseInt(newHours);
    if (isNaN(hours) || hours < 1 || hours > 48) {
      toast.error('Enter hours between 1-48');
      return;
    }

    if (!newLabel.trim()) {
      toast.error('Enter a label');
      return;
    }

    const newTimers = [...customTimers, { hours, label: newLabel.trim() }];
    
    try {
      await base44.auth.updateMe({ custom_check_in_timers: newTimers });
      setCustomTimers(newTimers);
      setNewHours('');
      setNewLabel('');
      toast.success('Timer added');
    } catch (error) {
      toast.error('Failed to add timer');
    }
  };

  const removeTimer = async (index) => {
    const newTimers = customTimers.filter((_, i) => i !== index);
    try {
      await base44.auth.updateMe({ custom_check_in_timers: newTimers });
      setCustomTimers(newTimers);
      toast.success('Timer removed');
    } catch (error) {
      toast.error('Failed to remove timer');
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 p-6">
      <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-[#00D9FF]" />
        Custom Check-In Timers
      </h3>

      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            placeholder="Hours (1-48)"
            value={newHours}
            onChange={(e) => setNewHours(e.target.value)}
            className="bg-white/5 border-white/20 text-white"
            min="1"
            max="48"
          />
          <Input
            placeholder="Label (e.g., Date night)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="bg-white/5 border-white/20 text-white"
          />
        </div>
        <Button
          onClick={addTimer}
          className="w-full bg-[#00D9FF] hover:bg-white text-black font-black"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Custom Timer
        </Button>
      </div>

      {customTimers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-white/40 uppercase mb-2">Your Custom Timers</p>
          {customTimers.map((timer, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-white/5 p-3 border border-white/10"
            >
              <div>
                <p className="font-bold text-sm">{timer.label}</p>
                <p className="text-xs text-white/60">{timer.hours} hour{timer.hours !== 1 ? 's' : ''}</p>
              </div>
              <Button
                onClick={() => removeTimer(index)}
                variant="ghost"
                size="sm"
                className="text-white/40 hover:text-red-500"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}