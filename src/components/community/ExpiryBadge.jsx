import React, { useState, useEffect } from 'react';
import { Clock, Flame } from 'lucide-react';
import { formatDistanceToNow, differenceInHours, differenceInMinutes } from 'date-fns';

export default function ExpiryBadge({ expiresAt }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = new Date();
      const expiry = new Date(expiresAt);
      
      if (now >= expiry) {
        setTimeLeft('EXPIRED');
        return;
      }

      const hours = differenceInHours(expiry, now);
      const minutes = differenceInMinutes(expiry, now) % 60;
      
      setIsUrgent(hours < 6);
      
      if (hours < 1) {
        setTimeLeft(`${minutes}m left`);
      } else if (hours < 24) {
        setTimeLeft(`${hours}h left`);
      } else {
        setTimeLeft(formatDistanceToNow(expiry, { addSuffix: true }));
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
      timeLeft === 'EXPIRED' ? 'bg-white/10 text-white/40' :
      isUrgent ? 'bg-[#FF073A]/20 border border-[#FF073A] text-[#FF073A] animate-pulse' :
      'bg-[#FFEB3B]/20 border border-[#FFEB3B]/40 text-[#FFEB3B]'
    }`}>
      {timeLeft === 'EXPIRED' ? (
        <Clock className="w-3 h-3" />
      ) : (
        <Flame className="w-3 h-3" />
      )}
      <span>{timeLeft}</span>
    </div>
  );
}