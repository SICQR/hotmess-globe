import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Radio as RadioIcon, Calendar, ExternalLink, Download, Clock, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import schedule from '../components/radio/radioSchedule.json';
import { getNextEpisode, formatSchedule, generateICS, downloadICS } from '../components/radio/radioUtils';
import { format } from 'date-fns';

export default function HandNHand() {
  const show = schedule.shows[2];
  const nextEpisode = getNextEpisode(show.id);

  const handleAddToCalendar = () => {
    if (!nextEpisode) return;
    const ics = generateICS(show, nextEpisode);
    downloadICS(ics, `${show.slug}-${format(nextEpisode.date, 'yyyy-MM-dd')}.ics`);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <div className="relative overflow-hidden border-b-2 border-white">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFEB3B]/20 to-[#FF6B35]/20" />
        <div className="relative max-w-4xl mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <RadioIcon className="w-8 h-8 text-[#FFEB3B]" />
              <span className="text-xs uppercase tracking-widest text-white/60 font-bold">HOTMESS Radio</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black uppercase mb-4">
              {show.title}
            </h1>
            <p className="text-xl md:text-2xl text-white/80 mb-8">
              {show.tagline}
            </p>
            <div className="flex flex-wrap gap-4">
              <Button className="bg-[#FFEB3B] hover:bg-white text-black hover:text-black font-black px-8 py-6 border-2 border-white uppercase">
                <ExternalLink className="w-5 h-5 mr-2" />
                Listen Live
              </Button>
              <Button
                onClick={handleAddToCalendar}
                variant="outline"
                className="border-2 border-white bg-transparent hover:bg-white text-white hover:text-black font-black px-8 py-6 uppercase"
              >
                <Download className="w-5 h-5 mr-2" />
                Add to Calendar
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-12">
        {/* Next Episode */}
        {nextEpisode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 border-2 border-white p-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-[#FFEB3B]" />
              <h2 className="text-lg font-black uppercase">Next Episode</h2>
            </div>
            <p className="text-2xl font-bold">
              {format(nextEpisode.date, 'EEEE, MMMM d')} at {nextEpisode.startTime}
            </p>
            <p className="text-white/60 mt-2">
              {nextEpisode.duration} minutes • Europe/London
            </p>
          </motion.div>
        )}

        {/* Schedule */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-black border-2 border-white p-6"
        >
          <h2 className="text-xl font-black uppercase mb-4">Schedule</h2>
          <p className="text-lg">
            {formatSchedule(show.schedule)}
          </p>
          <p className="text-white/60 mt-2 text-sm">
            Timezone: Europe/London
          </p>
        </motion.div>

        {/* Show Format */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-black border-2 border-white p-6 space-y-6"
        >
          <h2 className="text-xl font-black uppercase">Show Rundown</h2>
          
          <div>
            <h3 className="text-sm uppercase tracking-widest text-white/60 mb-2 font-bold">Consent Cue (Pre-Show)</h3>
            <p className="text-white/90">
              Ask first. Confirm yes. Respect no. No pressure.
            </p>
          </div>

          <div>
            <h3 className="text-sm uppercase tracking-widest text-white/60 mb-2 font-bold">Aftercare Read</h3>
            <p className="text-white/90">
              Hydrate. Reset. Check in. Land in Care if you need it.
            </p>
          </div>

          <div>
            <h3 className="text-sm uppercase tracking-widest text-white/60 mb-2 font-bold">Wetter Watch</h3>
            <p className="text-white/90">
              30–45s quick segment
            </p>
          </div>

          <div>
            <h3 className="text-sm uppercase tracking-widest text-white/60 mb-2 font-bold">Closing Affirmation</h3>
            <p className="text-white/90">
              You're good. You're wanted. You're safe here.
            </p>
          </div>
        </motion.div>

        {/* Stingers & VO */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-black border-2 border-[#FFEB3B] p-6 space-y-4"
        >
          <h2 className="text-xl font-black uppercase text-[#FFEB3B]">Stingers & VO</h2>
          
          <div className="space-y-2">
            {show.stingers.map((stinger, idx) => (
              <p key={idx} className="text-white/90 pl-4 border-l-2 border-[#FFEB3B]">
                {stinger}
              </p>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10">
            <p className="text-sm uppercase tracking-widest text-white/60 mb-2 font-bold">Voice Over</p>
            <p className="text-white/90 italic">
              "{show.vo}"
            </p>
          </div>
        </motion.div>

        {/* Sponsor Block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/5 border-2 border-white/20 p-6"
        >
          <p className="text-sm uppercase tracking-widest text-white/40 font-bold">
            Sponsored by —
          </p>
        </motion.div>

        {/* Care-First Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-black border-2 border-[#FFEB3B] p-6"
        >
          <div className="flex items-start gap-3">
            <Heart className="w-5 h-5 text-[#FFEB3B] flex-shrink-0 mt-1" />
            <p className="text-white/90">
              Consent and respect are non-negotiable. Aftercare is real. If you need support, land in Care.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Footer Links */}
      <div className="border-t-2 border-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <Link to={createPageUrl('Radio')} className="text-white/60 hover:text-white uppercase font-bold">
              Radio Hub
            </Link>
            <span className="text-white/20">•</span>
            <Link to={createPageUrl('RadioSchedule')} className="text-white/60 hover:text-white uppercase font-bold">
              Schedule
            </Link>
            <span className="text-white/20">•</span>
            <Link to={createPageUrl('Home')} className="text-white/60 hover:text-white uppercase font-bold">
              Care
            </Link>
            <span className="text-white/20">•</span>
            <Link to={createPageUrl('Settings')} className="text-white/60 hover:text-white uppercase font-bold">
              Legal
            </Link>
            <span className="text-white/20">•</span>
            <Link to={createPageUrl('Settings')} className="text-white/60 hover:text-white uppercase font-bold">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}