import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Clock, Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';

export default function EventWaitlist({ event, currentUser }) {
  const queryClient = useQueryClient();

  const { data: waitlistEntry } = useQuery({
    queryKey: ['waitlist', event.id, currentUser?.email],
    queryFn: async () => {
      const entries = await base44.entities.EventRSVP.filter({
        user_email: currentUser.email,
        event_id: event.id,
        status: 'waitlist'
      });
      return entries[0] || null;
    },
    enabled: !!currentUser
  });

  const { data: allWaitlist = [] } = useQuery({
    queryKey: ['waitlist-count', event.id],
    queryFn: () => base44.entities.EventRSVP.filter({ 
      event_id: event.id, 
      status: 'waitlist' 
    })
  });

  const joinWaitlistMutation = useMutation({
    mutationFn: async () => {
      if (waitlistEntry) {
        await base44.entities.EventRSVP.delete(waitlistEntry.id);
        return null;
      }
      
      return await base44.entities.EventRSVP.create({
        user_email: currentUser.email,
        event_id: event.id,
        event_title: event.title,
        status: 'waitlist',
        waitlist_position: allWaitlist.length + 1
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['waitlist']);
      queryClient.invalidateQueries(['my-rsvps']);
      
      if (!data) {
        toast.success('Removed from waitlist');
      } else {
        toast.success('Added to waitlist - we\'ll notify you if spots open');
        
        // Create notification for user
        base44.entities.Notification.create({
          user_email: currentUser.email,
          type: 'event_reminder',
          title: 'Joined Waitlist',
          message: `You're on the waitlist for ${event.title}. We'll notify you if a spot opens up.`,
          link: `/BeaconDetail?id=${event.id}`,
          metadata: { event_id: event.id }
        });
      }
    }
  });

  const { data: allRsvps = [] } = useQuery({
    queryKey: ['event-rsvps', event.id],
    queryFn: () => base44.entities.EventRSVP.filter({ event_id: event.id })
  });

  const goingCount = allRsvps.filter(r => r.status === 'going').length;
  const isAtCapacity = event.capacity && goingCount >= event.capacity;

  if (!isAtCapacity) return null;

  const position = waitlistEntry?.waitlist_position;

  return (
    <div className="bg-[#FF6B35]/10 border-2 border-[#FF6B35] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-[#FF6B35]" />
        <span className="font-black uppercase text-sm">Event at Capacity</span>
      </div>
      
      <p className="text-xs text-white/80">
        {allWaitlist.length} {allWaitlist.length === 1 ? 'person' : 'people'} on waitlist
      </p>

      <Button
        onClick={async () => {
          const ok = await base44.auth.requireProfile(window.location.href);
          if (!ok) return;
          joinWaitlistMutation.mutate();
        }}
        disabled={joinWaitlistMutation.isPending}
        className={`w-full font-black uppercase ${
          waitlistEntry
            ? 'bg-white/20 hover:bg-white/30 text-white border-2 border-white/40'
            : 'bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-black border-2 border-white'
        }`}
      >
        {waitlistEntry ? (
          <>
            <BellOff className="w-4 h-4 mr-2" />
            LEAVE WAITLIST
          </>
        ) : (
          <>
            <Bell className="w-4 h-4 mr-2" />
            JOIN WAITLIST
          </>
        )}
      </Button>

      {position && (
        <p className="text-xs text-center text-white/60 font-mono">
          Position #{position}
        </p>
      )}
    </div>
  );
}