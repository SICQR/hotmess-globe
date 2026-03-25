/**
 * HomePage — Main Dashboard
 *
 * Unified dark/gold theme with hero banner, trending events, search,
 * shop CTA, and consistent navigation.
 */

import { motion } from 'framer-motion';
import { FaBell, FaPlus, FaSearch, FaFire, FaUsers, FaCalendarAlt, FaBroadcastTower } from 'react-icons/fa';
import { ShoppingBag, ArrowRight, Sparkles } from 'lucide-react';
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
          HERO SECTION — Shop Promo
      ───────────────────────────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative mx-4 mb-5 rounded-2xl overflow-hidden cursor-pointer"
        onClick={() => navigate('/market')}
      >
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://cdn.shopify.com/s/files/1/0898/3245/6517/files/upload_vfKIW_gxRluGoOwPLITLrg.png?v=1750505220)',
          }}
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-transparent" />

        <div className="relative z-10 flex items-center gap-4 p-6 min-h-[160px]">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#C8962C] text-black text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-sm">
                New Drop
              </span>
              <Sparkles className="w-4 h-4 text-[#C8962C]" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight leading-tight mb-1">
              HNH MESS Lube
            </h2>
            <p className="text-sm text-white/70 mb-3">
              Premium intimate lubricant. From £9.99
            </p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-flex items-center gap-2 bg-[#C8962C] hover:bg-[#C8962C]/90 text-black font-black uppercase tracking-wider text-xs px-5 py-2.5 rounded-none transition-all shadow-[0_0_20px_rgba(200,150,44,0.4)]"
            >
              <ShoppingBag className="w-4 h-4" />
              Shop Now
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>

          {/* Product thumbnail */}
          <div className="hidden sm:block w-24 h-24 flex-shrink-0">
            <img
              src="https://cdn.shopify.com/s/files/1/0898/3245/6517/files/bottlesmall.png?v=1751020652"
              alt="HNH MESS Lube bottle"
              className="w-full h-full object-contain drop-shadow-[0_0_12px_rgba(200,150,44,0.5)]"
            />
          </div>
        </div>
      </motion.section>

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
            <FaBroadcastTower className="text-accent" />
            HOTMESS Radio
          </h2>
          <button
            onClick={() => navigate('/radio')}
            className="w-full bg-gray rounded-lg shadow-gold border border-borderGlow p-4 flex items-center gap-4 hover:bg-chatGray transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent to-gold flex items-center justify-center">
              <FaBroadcastTower className="text-dark text-xl" />
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

      {/* ─────────────────────────────────────────────────────────────────────
          CTA BANNER — Market Strip
      ───────────────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mx-4 mb-4 mt-2"
      >
        <button
          onClick={() => navigate('/market')}
          className="w-full flex items-center justify-between bg-gradient-to-r from-[#C8962C]/20 to-[#C8962C]/5 border border-[#C8962C]/30 rounded-lg px-4 py-3 hover:border-[#C8962C]/60 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#C8962C]/20 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-[#C8962C]" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-white">Browse the Market</div>
              <div className="text-xs text-white/50">Shop, sell preloved & discover drops</div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#C8962C] group-hover:translate-x-1 transition-transform" />
        </button>
      </motion.div>

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
