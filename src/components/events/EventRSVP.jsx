import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Check, Star, X, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function EventRSVP({ event, currentUser }) {
  const queryClient = useQueryClient();

  const { data: myRsvp } = useQuery({
    queryKey: ['my-rsvp', event.id, currentUser?.email],
    queryFn: async () => {
      const rsvps = await base44.entities.EventRSVP.filter({
        user_email: currentUser.email,
        event_id: event.id
      });
      return rsvps[0] || null;
    },
    enabled: !!currentUser
  });

  const { data: allRsvps = [] } = useQuery({
    queryKey: ['event-rsvps', event.id],
    queryFn: () => base44.entities.EventRSVP.filter({ event_id: event.id })
  });

  const goingCount = allRsvps.filter(r => r.status === 'going').length;
  const interestedCount = allRsvps.filter(r => r.status === 'interested').length;
  const isAtCapacity = event.capacity && goingCount >= event.capacity;

  const rsvpMutation = useMutation({
    mutationFn: async (status) => {
      if (myRsvp) {
        if (myRsvp.status === status) {
          await base44.entities.EventRSVP.delete(myRsvp.id);
          return null;
        }
        return await base44.entities.EventRSVP.update(myRsvp.id, { status });
      }
      return await base44.entities.EventRSVP.create({
        user_email: currentUser.email,
        event_id: event.id,
        event_title: event.title,
        status
      });
    },
    onSuccess: (data, status) => {
      queryClient.invalidateQueries(['my-rsvp']);
      queryClient.invalidateQueries(['event-rsvps']);
      queryClient.invalidateQueries(['my-rsvps']);
      
      if (!data) {
        toast.success('RSVP removed');
      } else {
        toast.success(status === 'going' ? 'You\'re going!' : 'Marked as interested');
      }
    },
    onError: () => {
      toast.error('Failed to update RSVP');
    }
  });

  const eventPassed = event.event_date && new Date(event.event_date) < new Date();

  if (!currentUser || eventPassed) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          onClick={async () => {
            const ok = await base44.auth.requireProfile(window.location.href);
            if (!ok) return;
            rsvpMutation.mutate('going');
          }}
          disabled={rsvpMutation.isPending || (isAtCapacity && myRsvp?.status !== 'going')}
          className={`flex-1 font-black uppercase ${
            myRsvp?.status === 'going'
              ? 'bg-[#00D9FF] hover:bg-[#00D9FF]/90 text-black'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
          }`}
        >
          {myRsvp?.status === 'going' ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Going
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              RSVP
            </>
          )}
        </Button>

        <Button
          onClick={async () => {
            const ok = await base44.auth.requireProfile(window.location.href);
            if (!ok) return;
            rsvpMutation.mutate('interested');
          }}
          disabled={rsvpMutation.isPending}
          variant="outline"
          className={`flex-1 font-black uppercase ${
            myRsvp?.status === 'interested'
              ? 'bg-[#FF1493] border-[#FF1493] text-black hover:bg-[#FF1493]/90'
              : 'border-white/20 text-white hover:bg-white/10'
          }`}
        >
          {myRsvp?.status === 'interested' ? (
            <>
              <Star className="w-4 h-4 mr-2" />
              Interested
            </>
          ) : (
            <>
              <Star className="w-4 h-4 mr-2" />
              Interested
            </>
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#00D9FF]" />
            <span className="text-white/80">{goingCount} going</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-[#FF1493]" />
            <span className="text-white/80">{interestedCount} interested</span>
          </div>
        </div>
        {event.capacity && (
          <span className="text-white/40 text-xs">
            {goingCount}/{event.capacity} capacity
          </span>
        )}
      </div>

      {isAtCapacity && myRsvp?.status !== 'going' && (
        <div className="bg-[#FF6B35]/10 border border-[#FF6B35]/40 rounded-lg p-3 text-xs text-[#FF6B35]">
          ⚠ This event is at capacity. You can still mark yourself as interested.
        </div>
      )}
    </div>
  );
}