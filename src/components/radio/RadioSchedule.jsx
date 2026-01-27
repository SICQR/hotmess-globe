import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { 
  Radio, 
  Clock, 
  Calendar,
  Play,
  User,
  ChevronLeft,
  ChevronRight,
  Bell,
  BellOff,
  Music2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, addDays, isSameDay, isAfter, isBefore, parseISO, startOfDay } from 'date-fns';
import { toast } from 'sonner';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const GENRES = {
  techno: { label: 'Techno', color: '#E62020' },
  house: { label: 'House', color: '#00D9FF' },
  dnb: { label: 'D&B', color: '#39FF14' },
  ambient: { label: 'Ambient', color: '#B026FF' },
  experimental: { label: 'Experimental', color: '#FF6B35' },
  mixed: { label: 'Mixed', color: '#FFEB3B' },
};

export default function RadioSchedule() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [notifyEnabled, setNotifyEnabled] = useState({});

  // Fetch radio shows
  const { data: shows = [], isLoading } = useQuery({
    queryKey: ['radio-shows'],
    queryFn: async () => {
      try {
        const data = await base44.entities.RadioShow?.list() || [];
        return data;
      } catch {
        // Return mock data if entity doesn't exist
        return getMockShows();
      }
    },
  });

  // Get shows for selected date
  const showsForDate = useMemo(() => {
    return shows.filter(show => {
      if (!show.start_time) return false;
      return isSameDay(parseISO(show.start_time), selectedDate);
    }).sort((a, b) => {
      return new Date(a.start_time) - new Date(b.start_time);
    });
  }, [shows, selectedDate]);

  // Get currently live show
  const liveShow = useMemo(() => {
    const now = new Date();
    return shows.find(show => {
      if (!show.start_time || !show.end_time) return false;
      const start = parseISO(show.start_time);
      const end = parseISO(show.end_time);
      return isAfter(now, start) && isBefore(now, end);
    });
  }, [shows]);

  // Get upcoming shows
  const upcomingShows = useMemo(() => {
    const now = new Date();
    return shows
      .filter(show => show.start_time && isAfter(parseISO(show.start_time), now))
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
      .slice(0, 5);
  }, [shows]);

  // Generate week days
  const weekDays = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => addDays(today, i));
  }, []);

  const toggleNotify = (showId) => {
    setNotifyEnabled(prev => {
      const newState = { ...prev, [showId]: !prev[showId] };
      if (newState[showId]) {
        toast.success('You\'ll be notified when this show starts');
      }
      return newState;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Radio className="w-12 h-12 text-white/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Now Playing */}
      {liveShow && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#E62020]/20 to-[#B026FF]/20 border-2 border-[#E62020] rounded-xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold uppercase text-red-400">Live Now</span>
          </div>

          <div className="flex items-start gap-6">
            {liveShow.artwork_url && (
              <img 
                src={liveShow.artwork_url} 
                alt={liveShow.title}
                className="w-24 h-24 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <h2 className="text-2xl font-black mb-1">{liveShow.title}</h2>
              <p className="text-white/60 flex items-center gap-2 mb-3">
                <User className="w-4 h-4" />
                {liveShow.host || 'HOTMESS Radio'}
              </p>
              {liveShow.genre && (
                <Badge 
                  style={{ 
                    backgroundColor: `${GENRES[liveShow.genre]?.color}20`,
                    color: GENRES[liveShow.genre]?.color,
                    borderColor: GENRES[liveShow.genre]?.color,
                  }}
                >
                  {GENRES[liveShow.genre]?.label || liveShow.genre}
                </Badge>
              )}
            </div>
            <Button className="bg-[#E62020] hover:bg-[#E62020]/90 text-black font-bold">
              <Play className="w-4 h-4 mr-2 fill-current" />
              Listen
            </Button>
          </div>
        </motion.div>
      )}

      {/* Date Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {weekDays.map((date, idx) => {
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, new Date());
          const showCount = shows.filter(s => 
            s.start_time && isSameDay(parseISO(s.start_time), date)
          ).length;

          return (
            <button
              key={idx}
              onClick={() => setSelectedDate(date)}
              className={`flex-shrink-0 px-4 py-3 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'bg-[#E62020] border-[#E62020] text-black'
                  : 'bg-white/5 border-white/20 text-white hover:border-white/40'
              }`}
            >
              <div className="text-xs font-bold uppercase">
                {isToday ? 'Today' : DAYS_OF_WEEK[date.getDay()]}
              </div>
              <div className="text-lg font-black">{format(date, 'd')}</div>
              {showCount > 0 && (
                <div className={`text-xs ${isSelected ? 'text-black/60' : 'text-white/40'}`}>
                  {showCount} show{showCount > 1 ? 's' : ''}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Schedule for Selected Date */}
      <div className="bg-white/5 border border-white/10 rounded-xl">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-black uppercase flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#00D9FF]" />
            {format(selectedDate, 'EEEE, MMMM d')}
          </h3>
        </div>

        {showsForDate.length === 0 ? (
          <div className="p-8 text-center">
            <Radio className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">No shows scheduled for this day</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {showsForDate.map((show, idx) => {
              const startTime = parseISO(show.start_time);
              const endTime = show.end_time ? parseISO(show.end_time) : null;
              const isLive = liveShow?.id === show.id;

              return (
                <motion.div
                  key={show.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-4 flex items-center gap-4 ${isLive ? 'bg-[#E62020]/10' : ''}`}
                >
                  {/* Time */}
                  <div className="w-20 flex-shrink-0">
                    <div className="text-lg font-black">
                      {format(startTime, 'HH:mm')}
                    </div>
                    {endTime && (
                      <div className="text-xs text-white/40">
                        {format(endTime, 'HH:mm')}
                      </div>
                    )}
                  </div>

                  {/* Show Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold">{show.title}</span>
                      {isLive && (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded">
                          LIVE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-white/60">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {show.host || 'HOTMESS'}
                      </span>
                      {show.genre && (
                        <span 
                          className="px-2 py-0.5 rounded text-xs font-bold"
                          style={{
                            backgroundColor: `${GENRES[show.genre]?.color}20`,
                            color: GENRES[show.genre]?.color,
                          }}
                        >
                          {GENRES[show.genre]?.label || show.genre}
                        </span>
                      )}
                    </div>
                    {show.description && (
                      <p className="text-xs text-white/40 mt-1 line-clamp-1">
                        {show.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleNotify(show.id)}
                      className={notifyEnabled[show.id] ? 'text-[#00D9FF]' : 'text-white/40'}
                    >
                      {notifyEnabled[show.id] ? (
                        <Bell className="w-4 h-4" />
                      ) : (
                        <BellOff className="w-4 h-4" />
                      )}
                    </Button>
                    {isLive && (
                      <Button size="sm" className="bg-[#E62020] text-black">
                        <Play className="w-3 h-3 mr-1 fill-current" />
                        Listen
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming Shows */}
      {upcomingShows.length > 0 && (
        <div>
          <h3 className="font-black uppercase mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#39FF14]" />
            Coming Up
          </h3>
          <div className="space-y-2">
            {upcomingShows.map((show, idx) => (
              <motion.div
                key={show.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-4"
              >
                <div className="w-16 text-center">
                  <div className="text-xs text-white/40">
                    {format(parseISO(show.start_time), 'EEE')}
                  </div>
                  <div className="font-bold">
                    {format(parseISO(show.start_time), 'HH:mm')}
                  </div>
                </div>
                <div className="flex-1">
                  <span className="font-bold">{show.title}</span>
                  <span className="text-white/40 ml-2">• {show.host || 'HOTMESS'}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleNotify(show.id)}
                  className={notifyEnabled[show.id] ? 'text-[#00D9FF]' : 'text-white/40'}
                >
                  {notifyEnabled[show.id] ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Mock data for development
function getMockShows() {
  const now = new Date();
  const today = startOfDay(now);

  return [
    {
      id: '1',
      title: 'Morning Techno',
      host: 'DJ Pulse',
      genre: 'techno',
      description: 'Wake up with dark, driving techno',
      start_time: new Date(today.getTime() + 8 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(today.getTime() + 10 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      title: 'Midday Grooves',
      host: 'Sarah Sound',
      genre: 'house',
      description: 'Deep house vibes for your afternoon',
      start_time: new Date(today.getTime() + 12 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(today.getTime() + 14 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      title: 'Prime Time Mix',
      host: 'The Collective',
      genre: 'mixed',
      description: 'The best of everything',
      start_time: new Date(today.getTime() + 20 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(today.getTime() + 22 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      title: 'Late Night Session',
      host: 'Night Owl',
      genre: 'ambient',
      description: 'Wind down with ambient soundscapes',
      start_time: new Date(today.getTime() + 23 * 60 * 60 * 1000).toISOString(),
      end_time: new Date(today.getTime() + 25 * 60 * 60 * 1000).toISOString(),
    },
    // Tomorrow
    {
      id: '5',
      title: 'Jungle Pressure',
      host: 'Bass Crew',
      genre: 'dnb',
      description: 'Drum & bass and jungle classics',
      start_time: addDays(new Date(today.getTime() + 18 * 60 * 60 * 1000), 1).toISOString(),
      end_time: addDays(new Date(today.getTime() + 20 * 60 * 60 * 1000), 1).toISOString(),
    },
  ];
}
