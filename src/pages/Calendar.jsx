import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, MapPin, Clock, Users, Download, Share2, Bell, BellOff, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import PageShell from '@/components/shell/PageShell';
import { toast } from 'sonner';

export default function Calendar() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [reminders, setReminders] = useState({});

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
    // Load reminders from localStorage
    const saved = localStorage.getItem('event_reminders');
    if (saved) setReminders(JSON.parse(saved));
  }, []);

  const { data: events = [] } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: async () => {
      const beacons = await base44.entities.Beacon.filter(
        { kind: 'event', status: 'published', active: true },
        '-event_date'
      );
      return beacons.filter(b => b.event_date);
    }
  });

  const { data: myRsvps = [] } = useQuery({
    queryKey: ['my-rsvps', currentUser?.email],
    queryFn: () => base44.entities.EventRSVP.filter({ user_email: currentUser?.email }),
    enabled: !!currentUser
  });

  const myRsvpIds = new Set(myRsvps.map(r => r.event_id));

  // Generate calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped = {};
    events.forEach(event => {
      const dateKey = format(new Date(event.event_date), 'yyyy-MM-dd');
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [events]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return eventsByDate[dateKey] || [];
  }, [selectedDate, eventsByDate]);

  // Generate ICS file for export
  const generateICS = (eventsList = events) => {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//HOTMESS//Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    eventsList.forEach(event => {
      if (!event.event_date) return;
      const start = new Date(event.event_date);
      const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2 hours default
      
      lines.push('BEGIN:VEVENT');
      lines.push(`DTSTART:${format(start, "yyyyMMdd'T'HHmmss")}`);
      lines.push(`DTEND:${format(end, "yyyyMMdd'T'HHmmss")}`);
      lines.push(`SUMMARY:${event.title}`);
      lines.push(`DESCRIPTION:${event.description || 'HOTMESS Event'}`);
      if (event.venue_name) lines.push(`LOCATION:${event.venue_name}`);
      lines.push(`UID:${event.id}@hotmess.london`);
      lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  };

  const handleExportAll = () => {
    const ics = generateICS();
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hotmess-events.ics';
    a.click();
    toast.success('Calendar exported!');
  };

  const handleExportMyEvents = () => {
    const myEvents = events.filter(e => myRsvpIds.has(e.id));
    if (myEvents.length === 0) {
      toast.error('No events to export');
      return;
    }
    const ics = generateICS(myEvents);
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-hotmess-events.ics';
    a.click();
    toast.success(`${myEvents.length} events exported!`);
  };

  const handleAddToGoogleCalendar = (event) => {
    if (!event.event_date) return;
    const start = new Date(event.event_date);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: event.title,
      dates: `${format(start, "yyyyMMdd'T'HHmmss")}/${format(end, "yyyyMMdd'T'HHmmss")}`,
      details: event.description || 'HOTMESS Event',
      location: event.venue_name || '',
    });
    
    window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
  };

  const toggleReminder = (eventId) => {
    const newReminders = { ...reminders };
    if (newReminders[eventId]) {
      delete newReminders[eventId];
      toast.success('Reminder removed');
    } else {
      newReminders[eventId] = true;
      toast.success('Reminder set!');
    }
    setReminders(newReminders);
    localStorage.setItem('event_reminders', JSON.stringify(newReminders));
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'HOTMESS Events Calendar',
        text: 'Check out the events on HOTMESS!',
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied!');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <PageShell
        eyebrow="MORE"
        title="Calendar"
        subtitle="Your events schedule"
        maxWidth="7xl"
        right={
          <div className="flex gap-2">
            <Button onClick={handleExportMyEvents} variant="glass" size="sm" className="border-white/20">
              <Download className="w-4 h-4 mr-1" /> My Events
            </Button>
            <Button onClick={handleShare} variant="glass" size="sm" className="border-white/20">
              <Share2 className="w-4 h-4" />
            </Button>
            <Button asChild variant="glass" className="border-white/20 font-black uppercase">
              <Link to={createPageUrl('Events')}>Browse events</Link>
            </Button>
          </div>
        }
      >

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white/5 border-2 border-white/10 p-6">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <Button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                variant="ghost"
                className="text-white hover:bg-white/10"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-2xl font-black uppercase">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <Button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                variant="ghost"
                className="text-white hover:bg-white/10"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                <div key={day} className="text-center text-xs font-black text-white/40 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDate[dateKey] || [];
                const hasEvents = dayEvents.length > 0;
                const hasMyEvents = dayEvents.some(e => myRsvpIds.has(e.id));
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={day.toString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      aspect-square border-2 p-2 transition-all relative
                      ${isSelected ? 'border-[#C8962C] bg-[#C8962C]/20' : 'border-white/10 hover:border-white/30'}
                      ${!isCurrentMonth && 'opacity-40'}
                      ${isToday && 'border-[#00D9FF]'}
                    `}
                  >
                    <div className={`text-sm font-bold ${isToday && 'text-[#00D9FF]'}`}>
                      {format(day, 'd')}
                    </div>
                    {hasEvents && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {dayEvents.slice(0, 3).map((event, idx) => (
                          <div
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full ${
                              myRsvpIds.has(event.id) ? 'bg-[#39FF14]' : 'bg-[#C8962C]'
                            }`}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[8px] text-white/60">+{dayEvents.length - 3}</div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#39FF14]" />
                <span className="text-white/60">Your Events</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#C8962C]" />
                <span className="text-white/60">Other Events</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-[#00D9FF]" />
                <span className="text-white/60">Today</span>
              </div>
            </div>
          </div>

          {/* Selected Date Events */}
          <div className="bg-white/5 border-2 border-white/10 p-6">
            <div className="flex items-center gap-2 mb-6">
              <CalendarIcon className="w-5 h-5 text-[#C8962C]" />
              <h3 className="text-xl font-black uppercase">
                {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select a Date'}
              </h3>
            </div>

            {selectedDateEvents.length > 0 ? (
              <div className="space-y-4">
                {selectedDateEvents.map(event => (
                  <Link key={event.id} to={createPageUrl(`BeaconDetail?id=${event.id}`)}>
                    <div className="group border-2 border-white/10 hover:border-[#C8962C] transition-all p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-black uppercase text-sm line-clamp-2 flex-1">
                          {event.title}
                        </h4>
                        <div className="flex items-center gap-1 ml-2">
                          {myRsvpIds.has(event.id) && (
                            <div className="px-2 py-0.5 bg-[#39FF14] text-black text-[10px] font-black uppercase">
                              GOING
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="space-y-1 text-xs text-white/60">
                        {event.event_date && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {format(new Date(event.event_date), 'HH:mm')}
                          </div>
                        )}
                        {event.venue_name && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3" />
                            {event.venue_name}
                          </div>
                        )}
                      </div>

                      {/* Quick actions */}
                      <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            toggleReminder(event.id);
                          }}
                          className={`flex-1 py-1.5 text-xs font-bold uppercase flex items-center justify-center gap-1 rounded ${
                            reminders[event.id] 
                              ? 'bg-[#FFD700]/20 text-[#FFD700]' 
                              : 'bg-white/5 text-white/60 hover:bg-white/10'
                          }`}
                        >
                          {reminders[event.id] ? <BellOff className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                          {reminders[event.id] ? 'Reminded' : 'Remind'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleAddToGoogleCalendar(event);
                          }}
                          className="flex-1 py-1.5 text-xs font-bold uppercase flex items-center justify-center gap-1 bg-white/5 text-white/60 hover:bg-white/10 rounded"
                        >
                          <ExternalLink className="w-3 h-3" /> Google
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : selectedDate ? (
              <div className="text-center py-12">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-white/20" />
                <p className="text-white/60 text-sm">No events on this date</p>
              </div>
            ) : (
              <div className="text-center py-12">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-white/20" />
                <p className="text-white/60 text-sm">Select a date to view events</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Events Summary */}
        {myRsvps.length > 0 && (
          <div className="mt-8 bg-white/5 border-2 border-white/10 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-[#39FF14]" />
              <h3 className="text-xl font-black uppercase">YOUR UPCOMING EVENTS</h3>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myRsvps.slice(0, 6).map(rsvp => {
                const event = events.find(e => e.id === rsvp.event_id);
                if (!event || !event.event_date) return null;
                const eventDate = new Date(event.event_date);
                if (eventDate < new Date()) return null;

                return (
                  <Link key={rsvp.id} to={createPageUrl(`BeaconDetail?id=${event.id}`)}>
                    <div className="border-2 border-white/10 hover:border-[#39FF14] transition-all p-4">
                      <div className="text-[#39FF14] text-xs font-black uppercase mb-2">
                        {format(eventDate, 'MMM d')} • {format(eventDate, 'HH:mm')}
                      </div>
                      <h4 className="font-black uppercase text-sm mb-2 line-clamp-2">
                        {event.title}
                      </h4>
                      {event.venue_name && (
                        <div className="flex items-center gap-1 text-xs text-white/60">
                          <MapPin className="w-3 h-3" />
                          {event.venue_name}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </PageShell>
    </div>
  );
}