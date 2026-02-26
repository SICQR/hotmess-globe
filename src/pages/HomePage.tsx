/**
 * HomePage — Main Dashboard
 * 
 * Unified dark/gold theme with trending events, search,
 * and consistent navigation.
 */

import { motion } from 'framer-motion';
import { FaBell, FaPlus, FaSearch, FaFire, FaUsers, FaCalendarAlt, FaRadio } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { AppNavBar } from '@/components/nav/AppNavBar';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark text-light font-sans flex flex-col pb-20">
      {/* ─────────────────────────────────────────────────────────────────────
          HEADER
      ───────────────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-5">
        <div className="font-mono text-gold text-[2.1rem] tracking-wide drop-shadow-[0_0_12px_#FFB80055]">
          HOTMESS
        </div>
        <div className="flex gap-4 items-center">
          <button className="text-gold text-xl hover:text-goldGlow transition-colors relative">
            <FaBell />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-accent rounded-full" />
          </button>
          <button 
            onClick={() => navigate('/more/beacons/new')}
            className="bg-gold text-dark rounded-full p-2 shadow-gold hover:shadow-[0_0_24px_#FFC94088] transition-shadow"
          >
            <FaPlus />
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────
          SEARCH
      ───────────────────────────────────────────────────────────────────── */}
      <div className="flex gap-2 px-4 mb-5">
        <input
          className="flex-1 bg-chatGray text-light rounded-full px-5 py-3 border border-borderGlow placeholder-muted outline-none focus:ring-2 focus:ring-gold/50 transition"
          placeholder="Search events, users…"
        />
        <button className="text-gold text-2xl hover:text-goldGlow transition-colors">
          <FaSearch />
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          CONTENT GRID
      ───────────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col gap-6 px-4">
        {/* Trending Now */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="font-bold text-light tracking-wide mb-3 flex items-center gap-2">
            <FaFire className="text-accent" />
            Trending Now
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <TrendingCard
              title="RAW Party"
              subtitle="Tonight · 11PM"
              onClick={() => navigate('/events')}
            />
            <TrendingCard
              title="Berghain"
              subtitle="Fri · 1AM"
              onClick={() => navigate('/events')}
            />
            <TrendingCard
              title="Heaven"
              subtitle="Sat · 10PM"
              onClick={() => navigate('/events')}
            />
            <TrendingCard
              title="XXL London"
              subtitle="Sun · 9PM"
              onClick={() => navigate('/events')}
            />
          </div>
        </motion.section>

        {/* Friends Online */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="font-bold text-light tracking-wide mb-3 flex items-center gap-2">
            <FaUsers className="text-online" />
            Friends Online
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {['Alex', 'Jordan', 'Sam', 'Chris', 'Taylor'].map((name) => (
              <div key={name} className="flex flex-col items-center gap-1 min-w-[60px]">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gray border-2 border-gold shadow-gold" />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-online rounded-full border-2 border-darkest" />
                </div>
                <span className="text-xs text-muted">{name}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Upcoming Events */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="font-bold text-light tracking-wide mb-3 flex items-center gap-2">
            <FaCalendarAlt className="text-gold" />
            Your Events
          </h2>
          <div className="space-y-3">
            <EventCard
              title="TRADE"
              venue="Fabric London"
              date="Tomorrow, 11PM"
              attendees={42}
            />
            <EventCard
              title="Horse Meat Disco"
              venue="Eagle London"
              date="Sat, 10PM"
              attendees={128}
            />
          </div>
        </motion.section>

        {/* Radio */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="font-bold text-light tracking-wide mb-3 flex items-center gap-2">
            <FaRadio className="text-accent" />
            HOTMESS Radio
          </h2>
          <button
            onClick={() => navigate('/radio')}
            className="w-full bg-gray rounded-lg shadow-gold border border-borderGlow p-4 flex items-center gap-4 hover:bg-chatGray transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-gold flex items-center justify-center">
              <FaRadio className="text-dark text-xl" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-light">Live Now</div>
              <div className="text-muted text-sm">Wake The Mess · 127 listeners</div>
            </div>
            <motion.div
              className="w-3 h-3 rounded-full bg-accent"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </button>
        </motion.section>
      </main>

      {/* Bottom Nav */}
      <AppNavBar active="home" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRENDING CARD
// ─────────────────────────────────────────────────────────────────────────────

interface TrendingCardProps {
  title: string;
  subtitle: string;
  onClick?: () => void;
}

function TrendingCard({ title, subtitle, onClick }: TrendingCardProps) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className="bg-gray rounded-lg shadow-gold border border-borderGlow p-4 flex flex-col items-center text-center hover:bg-chatGray transition-colors"
    >
      <span className="font-semibold text-light">{title}</span>
      <span className="text-accent text-sm mt-1">{subtitle}</span>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT CARD
// ─────────────────────────────────────────────────────────────────────────────

interface EventCardProps {
  title: string;
  venue: string;
  date: string;
  attendees: number;
}

function EventCard({ title, venue, date, attendees }: EventCardProps) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="bg-gray rounded-lg shadow-gold border border-borderGlow p-4 flex items-center gap-4 cursor-pointer hover:bg-chatGray transition-colors"
    >
      <div className="w-14 h-14 rounded-lg bg-darkest flex items-center justify-center">
        <FaCalendarAlt className="text-gold text-xl" />
      </div>
      <div className="flex-1">
        <div className="font-semibold text-light">{title}</div>
        <div className="text-muted text-sm">{venue}</div>
        <div className="text-gold text-xs mt-1">{date}</div>
      </div>
      <div className="text-right">
        <div className="text-muted text-xs">Going</div>
        <div className="text-gold font-bold">{attendees}</div>
      </div>
    </motion.div>
  );
}
