/**
 * L2EventSheet — Event detail as a sheet overlay
 * 
 * Replaces: /events/:id page navigation
 * Opens over: Globe (Globe stays visible)
 * 
 * Features:
 * - Event info (title, date, venue, description)
 * - RSVP button with real-time count
 * - Attendee preview
 * - Location mini-map
 * - Share / Add to calendar
 * - Related events
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  Share2, 
  CalendarPlus,
  Ticket,
  CheckCircle,
  Loader2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns';
import { base44 } from '@/components/utils/supabaseClient';
import { Button } from '@/components/ui/button';
import { SheetSection, SheetActions, SheetDivider } from './L2SheetContainer';
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function L2EventSheet({ id }) {
  const queryClient = useQueryClient();
  const { openSheet, closeSheet } = useSheet();
  const [isSharing, setIsSharing] = useState(false);

  // Fetch event details
  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event-detail', id],
    queryFn: async () => {
      if (!id) return null;
      const events = await base44.entities.Beacon.filter({ id });
      return events?.[0] || null;
    },
    enabled: !!id,
  });

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch RSVP status
  const { data: rsvp } = useQuery({
    queryKey: ['event-rsvp', id, currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email || !id) return null;
      const rsvps = await base44.entities.EventRSVP.filter({ 
        beacon_id: id, 
        user_email: currentUser.email 
      });
      return rsvps?.[0] || null;
    },
    enabled: !!currentUser?.email && !!id,
  });

  // Fetch RSVP count
  const { data: rsvpCount = 0 } = useQuery({
    queryKey: ['event-rsvp-count', id],
    queryFn: async () => {
      if (!id) return 0;
      const rsvps = await base44.entities.EventRSVP.filter({ beacon_id: id });
      return rsvps?.length || 0;
    },
    enabled: !!id,
  });

  // RSVP mutation
  const rsvpMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.email) {
        throw new Error('Please log in to RSVP');
      }

      if (rsvp) {
        // Cancel RSVP
        await base44.entities.EventRSVP.delete(rsvp.id);
        return { action: 'cancelled' };
      } else {
        // Create RSVP
        await base44.entities.EventRSVP.create({
          beacon_id: id,
          user_email: currentUser.email,
          status: 'going',
          created_at: new Date().toISOString(),
        });
        return { action: 'created' };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['event-rsvp', id]);
      queryClient.invalidateQueries(['event-rsvp-count', id]);
      
      if (result.action === 'created') {
        toast.success("You're going! 🎉");
      } else {
        toast.success('RSVP cancelled');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update RSVP');
    },
  });

  // Share event
  const handleShare = async () => {
    setIsSharing(true);
    try {
      const url = `${window.location.origin}/?sheet=event&id=${id}`;
      
      if (navigator.share) {
        await navigator.share({
          title: event?.title || 'HOTMESS Event',
          text: event?.description?.slice(0, 100) || 'Check out this event!',
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast.error('Failed to share');
      }
    }
    setIsSharing(false);
  };

  // Add to calendar
  const handleAddToCalendar = () => {
    if (!event) return;

    const startDate = new Date(event.event_date || event.starts_at);
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000); // +3 hours

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//HOTMESS//Event//EN',
      'BEGIN:VEVENT',
      `DTSTART:${format(startDate, "yyyyMMdd'T'HHmmss")}`,
      `DTEND:${format(endDate, "yyyyMMdd'T'HHmmss")}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')}`,
      `LOCATION:${event.venue || event.city || ''}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title?.replace(/\s+/g, '-') || 'event'}.ics`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Calendar file downloaded');
  };

  // View organizer profile
  const handleViewOrganizer = () => {
    if (event?.creator_email) {
      openSheet(SHEET_TYPES.PROFILE, { email: event.creator_email });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <p className="text-white/60 mb-4">Event not found</p>
        <Button variant="outline" onClick={closeSheet}>
          Close
        </Button>
      </div>
    );
  }

  const eventDate = new Date(event.event_date || event.starts_at);
  const isEventPast = isPast(eventDate);
  const isEventSoon = isFuture(eventDate) && eventDate.getTime() - Date.now() < 24 * 60 * 60 * 1000;

  return (
    <div className="pb-24">
      {/* Hero Image */}
      {event.image_url && (
        <div className="relative h-48 overflow-hidden">
          <img 
            src={event.image_url} 
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          
          {/* Status badge */}
          {isEventPast && (
            <div className="absolute top-4 right-4 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-bold text-white/80">
              PAST EVENT
            </div>
          )}
          {isEventSoon && !isEventPast && (
            <div className="absolute top-4 right-4 px-3 py-1 bg-[#C8962C] rounded-full text-xs font-bold text-white animate-pulse">
              HAPPENING SOON
            </div>
          )}
        </div>
      )}

      {/* Title & Date */}
      <SheetSection>
        <h1 className="text-2xl font-black text-white mb-2">{event.title}</h1>
        
        <div className="flex flex-wrap gap-4 text-sm text-white/60">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#00D9FF]" />
            <span>{format(eventDate, 'EEE, MMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#00D9FF]" />
            <span>{format(eventDate, 'h:mm a')}</span>
          </div>
        </div>

        {/* Time until event */}
        {isFuture(eventDate) && (
          <p className="text-[#C8962C] text-sm font-bold mt-2">
            {formatDistanceToNow(eventDate, { addSuffix: true })}
          </p>
        )}
      </SheetSection>

      <SheetDivider />

      {/* Venue */}
      {(event.venue || event.city) && (
        <>
          <SheetSection title="Location">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#39FF14] flex-shrink-0 mt-0.5" />
              <div>
                {event.venue && <p className="text-white font-medium">{event.venue}</p>}
                {event.city && <p className="text-white/60 text-sm">{event.city}</p>}
                {event.address && <p className="text-white/40 text-sm">{event.address}</p>}
              </div>
            </div>
            
            {/* Mini map or directions button */}
            {(event.lat && event.lng) && (
              <a
                href={`https://maps.google.com/?q=${event.lat},${event.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center gap-2 text-[#00D9FF] text-sm hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Get Directions
              </a>
            )}
          </SheetSection>
          <SheetDivider />
        </>
      )}

      {/* Attendees */}
      <SheetSection title="Going">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#C8962C]" />
            <span className="text-white font-bold text-lg">{rsvpCount}</span>
            <span className="text-white/60 text-sm">attending</span>
          </div>
          
          {rsvp && (
            <span className="px-2 py-0.5 bg-[#39FF14]/20 text-[#39FF14] text-xs font-bold rounded-full">
              You're going!
            </span>
          )}
        </div>
      </SheetSection>

      <SheetDivider />

      {/* Description */}
      {event.description && (
        <>
          <SheetSection title="About">
            <p className="text-white/80 text-sm whitespace-pre-wrap leading-relaxed">
              {event.description}
            </p>
          </SheetSection>
          <SheetDivider />
        </>
      )}

      {/* Organizer */}
      {event.creator_email && (
        <>
          <SheetSection title="Organizer">
            <button
              onClick={handleViewOrganizer}
              className="flex items-center justify-between w-full p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#C8962C] to-[#B026FF] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {event.organizer_name?.[0] || 'O'}
                  </span>
                </div>
                <span className="text-white font-medium">
                  {event.organizer_name || 'View Organizer'}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-white/40" />
            </button>
          </SheetSection>
          <SheetDivider />
        </>
      )}

      {/* Quick Actions */}
      <SheetSection>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-white/20"
            onClick={handleShare}
            disabled={isSharing}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-white/20"
            onClick={handleAddToCalendar}
          >
            <CalendarPlus className="w-4 h-4 mr-2" />
            Calendar
          </Button>
        </div>
      </SheetSection>

      {/* Sticky RSVP Button */}
      <SheetActions>
        {!isEventPast ? (
          <Button
            onClick={() => rsvpMutation.mutate()}
            disabled={rsvpMutation.isPending || !currentUser}
            className={cn(
              'flex-1 h-14 text-lg font-black',
              rsvp 
                ? 'bg-white/10 hover:bg-white/20 text-white' 
                : 'bg-[#C8962C] hover:bg-[#C8962C]/90 text-white'
            )}
          >
            {rsvpMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : rsvp ? (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Going
              </>
            ) : (
              <>
                <Ticket className="w-5 h-5 mr-2" />
                RSVP
              </>
            )}
          </Button>
        ) : (
          <Button disabled className="flex-1 h-14 text-lg font-black bg-white/10">
            Event Ended
          </Button>
        )}
      </SheetActions>
    </div>
  );
}
