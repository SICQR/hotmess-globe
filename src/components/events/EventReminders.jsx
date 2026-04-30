import { supabase } from '@/components/utils/supabaseClient';
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { differenceInHours, differenceInMinutes } from 'date-fns';

export default function EventReminders({ currentUser }) {
  const queryClient = useQueryClient();

  const { data: upcomingRsvps = [] } = useQuery({
    queryKey: ['upcoming-rsvps', currentUser?.email],
    queryFn: async () => {
      const rsvps = await supabase.from('event_rsvps').select('*')
        .eq('user_email', currentUser.email)
        .eq('status', 'going');
      return rsvps.data || [];
    },
    enabled: !!currentUser,
    refetchInterval: 5 * 60000 // Check every 5 minutes (reduced from 1min)
  });

  const { data: allEvents = [] } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await supabase.from('beacons').select('*')
        .eq('kind', 'event')
        .eq('active', true);
      return res.data || [];
    }
  });

  const sendReminderMutation = useMutation({
    mutationFn: async ({ rsvp, event, type }) => {
      // Update specific reminder flag to prevent duplicates
      const updateData = type === '24h' 
        ? { reminder_24h_sent: true } 
        : { reminder_1h_sent: true };
      
      await supabase.from('event_rsvps').update(updateData);

      await supabase.from('notifications').insert({
        user_email: currentUser.email,
        type: 'event_reminder',
        title: type === '24h' ? 'Event Tomorrow!' : 'Event Starting Soon!',
        message: `${event.title} ${type === '24h' ? 'is tomorrow' : 'starts in 1 hour'}`,
        link: `/events/${event.id}`,
        metadata: { event_id: event.id, reminder_type: type }
      });

      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`${type === '24h' ? '📅' : '⏰'} ${event.title}`, {
          body: type === '24h' 
            ? `Don't forget - ${event.title} is tomorrow!`
            : `Starting in 1 hour at ${event.venue_name || event.city}`,
          icon: event.image_url || '/icon.png',
          tag: `event-${event.id}-${type}`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['upcoming-rsvps']);
    }
  });

  useEffect(() => {
    if (!currentUser || upcomingRsvps.length === 0) return;

    const checkReminders = () => {
      upcomingRsvps.forEach(rsvp => {
        const event = allEvents.find(e => e.id === rsvp.event_id);
        if (!event || !event.event_date || rsvp.reminder_sent) return;

        const eventDate = new Date(event.event_date);
        const now = new Date();
        const hoursUntil = differenceInHours(eventDate, now);
        const minutesUntil = differenceInMinutes(eventDate, now);

        // 24 hour reminder (between 23-25 hours)
        if (hoursUntil >= 23 && hoursUntil <= 25 && !rsvp.reminder_24h_sent) {
          sendReminderMutation.mutate({ rsvp, event, type: '24h' });
        }

        // 1 hour reminder (between 0.5-1.5 hours)
        if (minutesUntil >= 30 && minutesUntil <= 90 && !rsvp.reminder_1h_sent) {
          sendReminderMutation.mutate({ rsvp, event, type: '1h' });
        }
      });
    };

    checkReminders();
    const interval = setInterval(checkReminders, 60000); // Check every minute

    return () => {
      clearInterval(interval);
    };
  }, [upcomingRsvps, allEvents, currentUser, sendReminderMutation]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return null; // Background service, no UI
}