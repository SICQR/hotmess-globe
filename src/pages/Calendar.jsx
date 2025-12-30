import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek } from 'date-fns';

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: beacons = [] } = useQuery({
    queryKey: ['beacons-calendar'],
    queryFn: () => base44.entities.Beacon.filter({ active: true })
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getBeaconsForDay = (day) => {
    return beacons.filter(b => {
      const beaconDate = new Date(b.created_date);
      return format(beaconDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
    });
  };

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)));

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-8 h-8 text-[#FF1493]" />
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">Event Calendar</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={prevMonth} variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-xl font-bold min-w-[200px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button onClick={nextMonth} variant="ghost" size="icon">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
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
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isTodayDate = isToday(day);

              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: idx * 0.01 }}
                  className={`
                    min-h-[100px] p-2 rounded-lg border transition-all
                    ${isCurrentMonth ? 'bg-white/5 border-white/10' : 'bg-transparent border-transparent'}
                    ${isTodayDate ? 'border-[#FF1493] bg-[#FF1493]/10' : ''}
                    ${dayBeacons.length > 0 ? 'cursor-pointer hover:bg-white/10' : ''}
                  `}
                >
                  <div className={`text-sm font-bold mb-1 ${isCurrentMonth ? 'text-white' : 'text-white/30'}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayBeacons.slice(0, 2).map(beacon => (
                      <Link key={beacon.id} to={createPageUrl(`BeaconDetail?id=${beacon.id}`)}>
                        <div className="text-xs p-1 bg-[#FF1493]/20 border border-[#FF1493]/40 rounded truncate hover:bg-[#FF1493]/30 transition-colors">
                          {beacon.title}
                        </div>
                      </Link>
                    ))}
                    {dayBeacons.length > 2 && (
                      <div className="text-xs text-white/40">+{dayBeacons.length - 2} more</div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Upcoming Events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <h2 className="text-2xl font-black uppercase tracking-tight mb-4">Upcoming This Month</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {beacons.slice(0, 6).map((beacon, idx) => (
              <Link key={beacon.id} to={createPageUrl(`BeaconDetail?id=${beacon.id}`)}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + idx * 0.05 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all"
                >
                  <h3 className="font-bold mb-2">{beacon.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <MapPin className="w-4 h-4" />
                    <span>{beacon.city}</span>
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