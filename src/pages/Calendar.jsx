import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, MapPin, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, isSameDay } from 'date-fns';

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('month'); // month, week, day

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
  }, []);

  const { data: beacons = [] } = useQuery({
    queryKey: ['beacons-calendar'],
    queryFn: () => base44.entities.Beacon.filter({ kind: 'event', active: true })
  });

  const { data: myRsvps = [] } = useQuery({
    queryKey: ['my-rsvps-calendar', currentUser?.email],
    queryFn: () => base44.entities.EventRSVP.filter({ 
      user_email: currentUser.email,
      status: 'going'
    }),
    enabled: !!currentUser
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getBeaconsForDay = (day) => {
    return beacons.filter(b => {
      if (!b.event_date) return false;
      return isSameDay(new Date(b.event_date), day);
    });
  };

  const getMyEventsForDay = (day) => {
    return beacons.filter(b => {
      if (!b.event_date) return false;
      const isMyEvent = myRsvps.some(r => r.event_id === b.id);
      return isSameDay(new Date(b.event_date), day) && isMyEvent;
    });
  };

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)));

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-[#FF1493]" />
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Event Calendar</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex gap-2 bg-white/5 p-1 rounded-lg">
              <button
                onClick={() => setView('month')}
                className={`px-4 py-2 rounded font-bold text-xs uppercase transition-all ${
                  view === 'month' ? 'bg-[#FF1493] text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-4 py-2 rounded font-bold text-xs uppercase transition-all ${
                  view === 'week' ? 'bg-[#FF1493] text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setView('day')}
                className={`px-4 py-2 rounded font-bold text-xs uppercase transition-all ${
                  view === 'day' ? 'bg-[#FF1493] text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                Day
              </button>
            </div>
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button onClick={prevMonth} variant="ghost" size="icon" className="bg-white/5">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="text-lg font-bold min-w-[150px] text-center">
                {format(currentMonth, view === 'day' ? 'MMMM d, yyyy' : 'MMMM yyyy')}
              </span>
              <Button onClick={nextMonth} variant="ghost" size="icon" className="bg-white/5">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Calendar Views */}
        {view === 'month' && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-bold text-white/60 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, idx) => {
              const dayBeacons = getBeaconsForDay(day);
              const myEvents = getMyEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.01 }}
                  className={`
                    min-h-[120px] p-2 rounded-lg border transition-all
                    ${isCurrentMonth ? 'bg-white/5 border-white/10' : 'bg-transparent border-transparent'}
                    ${isTodayDate ? 'border-[#FF1493] bg-[#FF1493]/10' : ''}
                    ${myEvents.length > 0 ? 'border-[#00D9FF] bg-[#00D9FF]/5' : ''}
                    ${dayBeacons.length > 0 ? 'cursor-pointer hover:bg-white/10' : ''}
                  `}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className={`text-sm font-bold ${isCurrentMonth ? 'text-white' : 'text-white/30'}`}>
                      {format(day, 'd')}
                    </div>
                    {myEvents.length > 0 && (
                      <Badge className="bg-[#00D9FF] text-black text-[8px] h-4 px-1">
                        {myEvents.length}
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    {myEvents.map(beacon => (
                      <Link key={beacon.id} to={createPageUrl(`BeaconDetail?id=${beacon.id}`)}>
                        <div className="text-xs p-1 bg-[#00D9FF]/20 border border-[#00D9FF]/40 rounded truncate hover:bg-[#00D9FF]/30 transition-colors font-bold">
                          {beacon.title}
                        </div>
                      </Link>
                    ))}
                    {dayBeacons.filter(b => !myEvents.find(m => m.id === b.id)).slice(0, 1).map(beacon => (
                      <Link key={beacon.id} to={createPageUrl(`BeaconDetail?id=${beacon.id}`)}>
                        <div className="text-xs p-1 bg-[#FF1493]/20 border border-[#FF1493]/40 rounded truncate hover:bg-[#FF1493]/30 transition-colors">
                          {beacon.title}
                        </div>
                      </Link>
                    ))}
                    {dayBeacons.length > (myEvents.length + 1) && (
                      <div className="text-xs text-white/40">+{dayBeacons.length - myEvents.length - 1}</div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
        )}

        {/* Week View */}
        {view === 'week' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="grid grid-cols-7 gap-4">
              {eachDayOfInterval({ 
                start: startOfWeek(currentMonth), 
                end: endOfWeek(currentMonth) 
              }).map((day, idx) => {
                const dayBeacons = getBeaconsForDay(day);
                const myEvents = getMyEventsForDay(day);
                return (
                  <div key={idx} className="border-l-2 border-white/10 pl-4 min-h-[400px]">
                    <div className={`text-center mb-4 ${isToday(day) ? 'text-[#FF1493] font-black' : 'text-white/60'}`}>
                      <div className="text-xs uppercase">{format(day, 'EEE')}</div>
                      <div className="text-2xl font-bold">{format(day, 'd')}</div>
                    </div>
                    <div className="space-y-2">
                      {myEvents.map(beacon => (
                        <Link key={beacon.id} to={createPageUrl(`BeaconDetail?id=${beacon.id}`)}>
                          <div className="p-2 bg-[#00D9FF]/20 border border-[#00D9FF] rounded text-xs hover:bg-[#00D9FF]/30">
                            <div className="font-bold">{beacon.title}</div>
                            {beacon.event_date && (
                              <div className="text-white/60">{format(new Date(beacon.event_date), 'p')}</div>
                            )}
                          </div>
                        </Link>
                      ))}
                      {dayBeacons.filter(b => !myEvents.find(m => m.id === b.id)).map(beacon => (
                        <Link key={beacon.id} to={createPageUrl(`BeaconDetail?id=${beacon.id}`)}>
                          <div className="p-2 bg-white/5 border border-white/10 rounded text-xs hover:bg-white/10">
                            <div className="font-bold truncate">{beacon.title}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Day View */}
        {view === 'day' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="space-y-4">
              {getBeaconsForDay(currentMonth).length === 0 ? (
                <div className="text-center py-20">
                  <CalendarIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/40">No events on this day</p>
                </div>
              ) : (
                getBeaconsForDay(currentMonth).map(beacon => {
                  const isMyEvent = myRsvps.some(r => r.event_id === beacon.id);
                  return (
                    <Link key={beacon.id} to={createPageUrl(`BeaconDetail?id=${beacon.id}`)}>
                      <div className={`p-6 rounded-xl border-2 transition-all ${
                        isMyEvent 
                          ? 'bg-[#00D9FF]/10 border-[#00D9FF] hover:bg-[#00D9FF]/20' 
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}>
                        <div className="flex items-start gap-4">
                          {beacon.image_url && (
                            <img src={beacon.image_url} alt={beacon.title} className="w-24 h-24 object-cover rounded-lg" />
                          )}
                          <div className="flex-1">
                            <h3 className="text-2xl font-black mb-2">{beacon.title}</h3>
                            <div className="space-y-2">
                              {beacon.event_date && (
                                <div className="flex items-center gap-2 text-white/80">
                                  <Clock className="w-4 h-4" />
                                  <span>{format(new Date(beacon.event_date), 'p')}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-white/60">
                                <MapPin className="w-4 h-4" />
                                <span>{beacon.venue_name || beacon.city}</span>
                              </div>
                            </div>
                            {isMyEvent && (
                              <Badge className="mt-3 bg-[#00D9FF] text-black">You're Going</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Your Events */}
        {currentUser && myRsvps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-8"
          >
            <h2 className="text-2xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-[#00D9FF]" />
              Your Events
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {beacons.filter(b => myRsvps.some(r => r.event_id === b.id)).slice(0, 6).map((beacon, idx) => (
                <Link key={beacon.id} to={createPageUrl(`BeaconDetail?id=${beacon.id}`)}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + idx * 0.05 }}
                    className="bg-[#00D9FF]/10 border-2 border-[#00D9FF] rounded-xl p-4 hover:bg-[#00D9FF]/20 transition-all"
                  >
                    <h3 className="font-bold mb-2">{beacon.title}</h3>
                    {beacon.event_date && (
                      <div className="flex items-center gap-2 text-sm text-white/80 mb-2">
                        <Clock className="w-4 h-4" />
                        <span>{format(new Date(beacon.event_date), 'PPP p')}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <MapPin className="w-4 h-4" />
                      <span>{beacon.venue_name || beacon.city}</span>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* All Events This Month */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8"
        >
          <h2 className="text-2xl font-black uppercase tracking-tight mb-4">All Events This Month</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {beacons.slice(0, 9).map((beacon, idx) => (
              <Link key={beacon.id} to={createPageUrl(`BeaconDetail?id=${beacon.id}`)}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + idx * 0.05 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all"
                >
                  <h3 className="font-bold mb-2">{beacon.title}</h3>
                  {beacon.event_date && (
                    <div className="flex items-center gap-2 text-xs text-white/60 mb-2">
                      <Clock className="w-3 h-3" />
                      <span>{format(new Date(beacon.event_date), 'MMM d, p')}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <MapPin className="w-4 h-4" />
                    <span>{beacon.venue_name || beacon.city}</span>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}