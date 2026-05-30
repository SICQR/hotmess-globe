import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Clock, Calendar } from 'lucide-react';
import { schedule, formatSchedule } from '../components/radio/radioUtils';
import PageShell from '@/components/shell/PageShell';

export default function RadioSchedule() {
  const dayMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Build weekly grid
  const weeklyGrid = [];
  for (let day = 0; day < 7; day++) {
    const daySlots = [];
    schedule.shows.forEach(show => {
      show.schedule.forEach(slot => {
        if (slot.day === day) {
          daySlots.push({ ...show, ...slot });
        }
      });
    });
    weeklyGrid.push({ day, dayName: dayMap[day], slots: daySlots });
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <PageShell
        eyebrow="MUSIC"
        title="Schedule"
        subtitle="All times Europe/London"
        maxWidth="7xl"
        back={createPageUrl('Music')}
        backLabel="Back to music"
        right={<Calendar className="w-5 h-5 text-white/60" />}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
        {/* Show Quick Reference */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {schedule.shows.map((show, idx) => (
            <motion.div
              key={show.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-black border-2 border-white p-6"
            >
              <h3 className="text-xl font-black uppercase mb-2">{show.title}</h3>
              <p className="text-sm text-white/60 mb-4">{show.tagline}</p>
              <div className="flex items-start gap-2 text-sm">
                <Clock className="w-4 h-4 text-[#C8962C] flex-shrink-0 mt-0.5" />
                <span>{formatSchedule(show.schedule)}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Weekly Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-black border-2 border-white"
        >
          <div className="p-6">
            <h2 className="text-2xl font-black uppercase mb-6">Weekly Grid</h2>
            <div className="space-y-4">
              {weeklyGrid.map(({ day, dayName, slots }) => (
                <div key={day} className="grid grid-cols-[120px_1fr] gap-4 border-b border-white/10 pb-4 last:border-b-0">
                  <div className="font-black uppercase text-sm">
                    {dayName}
                  </div>
                  <div className="space-y-2">
                    {slots.length === 0 ? (
                      <p className="text-white/40 text-sm">No shows scheduled</p>
                    ) : (
                      slots.map((slot, idx) => (
                        <Link
                          key={idx}
                          to={`/music/shows/${slot.slug}`}
                          className="block group"
                        >
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-white/60 font-mono">{slot.start}</span>
                            <span className="font-bold group-hover:text-[#C8962C] transition-colors">
                              {slot.title}
                            </span>
                            <span className="text-white/40">({slot.duration}min)</span>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Add Next Episode Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 bg-white/5 border border-white/20 p-6"
        >
          <p className="text-sm text-white/60">
            <strong className="text-white">Want to add an episode?</strong> Visit the individual show page and use "Add to Calendar" to download the .ics file.
          </p>
        </motion.div>
        </motion.div>
      </PageShell>
    </div>
  );
}