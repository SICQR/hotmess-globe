/**
 * ChatMeetupPage — Chat with Location Meet-Up
 * 
 * Key Features:
 * - Pure dark/gold palette, consistent spacing, typography, border glow
 * - Unified navigation same as every page
 * - Chat bubbles, interactive map card, unified CTA buttons
 * - Framer Motion animations for premium UX
 * - Fully componentized for app-wide reuse
 */

import { motion } from 'framer-motion';
import { 
  FaMapMarkerAlt, 
  FaLocationArrow, 
  FaShareAlt, 
  FaChevronLeft, 
  FaEllipsisV, 
  FaHome, 
  FaCompass, 
  FaRegComments, 
  FaUser,
  FaSmile,
  FaMicrophone
} from 'react-icons/fa';
import { SiUber } from 'react-icons/si';
import { useState } from 'react';

const messages = [
  {
    sender: 'them',
    time: '20:41',
    text: (
      <>
        Just got into Berlin! <span role="img" aria-label="plane">✈️</span>
        <br />
        Trying to find a bar now <span role="img" aria-label="smile">😊</span>
      </>
    ),
  },
  {
    sender: 'me',
    time: '20:43',
    text: (
      <>
        Right now? I'm in <span className="font-semibold text-accent">Schöneberg</span>{' '}
        <span role="img" aria-label="fire">🔥</span>
      </>
    ),
  },
  {
    sender: 'them',
    time: '20:44',
    text: "Perfect! Let's meet there!",
  },
];

export default function ChatMeetupPage() {
  const [inputValue, setInputValue] = useState('');

  return (
    <div className="relative min-h-screen bg-dark text-light font-sans flex flex-col pb-20">
      {/* ─────────────────────────────────────────────────────────────────────
          HEADER
      ───────────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-4 bg-darkest/95 backdrop-blur border-b border-borderGlow">
        <button className="text-gold text-2xl hover:text-goldGlow transition-colors">
          <FaChevronLeft />
        </button>
        <div className="text-gold font-mono text-xl tracking-wide drop-shadow-[0_0_14px_#FFB80099]">
          HOTMESS
        </div>
        <button className="text-gold text-2xl hover:text-goldGlow transition-colors">
          <FaEllipsisV />
        </button>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────
          USER META
      ───────────────────────────────────────────────────────────────────── */}
      <section className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <div className="relative">
          <img
            src="/avatar.jpg"
            alt="User avatar"
            className="w-14 h-14 rounded-full border-2 border-gold shadow-gold object-cover"
          />
          <span className="absolute bottom-1 right-1 w-3 h-3 bg-online rounded-full border-2 border-darkest" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-light text-base">AlexTravels</div>
          <div className="text-muted text-sm">Visiting Berlin · 1.2 km away</div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────
          CHAT MESSAGES
      ───────────────────────────────────────────────────────────────────── */}
      <main className="flex-1 px-4 py-4 flex flex-col gap-3 overflow-y-auto">
        {messages.map((msg, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08, type: 'spring', stiffness: 55, damping: 15 }}
            className={`max-w-[78%] rounded-bubble px-4 py-3 shadow-gold text-base ${
              msg.sender === 'me'
                ? 'self-end bg-gold text-dark'
                : 'self-start bg-chatGray text-light'
            }`}
          >
            <div>{msg.text}</div>
            <span
              className={`block text-xs mt-1 ${
                msg.sender === 'me' ? 'text-dark/60' : 'text-muted'
              }`}
            >
              {msg.time}
            </span>
          </motion.div>
        ))}

        {/* ─────────────────────────────────────────────────────────────────────
            MAP CARD (Embedded Location)
        ───────────────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: messages.length * 0.08 + 0.15,
            type: 'spring',
            stiffness: 55,
            damping: 15,
          }}
          className="bg-gray rounded-lg mt-2 shadow-gold border border-borderGlow p-4 flex flex-col gap-2 max-w-[90%] self-end"
        >
          {/* Map Preview */}
          <div className="w-full h-32 rounded-md bg-darkest bg-[url('/static/map-sample.png')] bg-cover bg-center relative overflow-hidden">
            {/* Gold route line overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gold/10" />
            {/* Pin marker */}
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              animate={{
                y: [0, -8, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <FaMapMarkerAlt className="text-goldGlow text-3xl drop-shadow-[0_0_10px_#FFC940]" />
            </motion.div>
          </div>

          {/* Location Info */}
          <div className="font-semibold text-light text-lg">Soho Cluster</div>
          <div className="flex items-center gap-2 text-muted text-xs">
            <FaMapMarkerAlt className="text-gold" />
            720 m · 4 min
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-2 mt-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ boxShadow: '0 0 24px #FFC94088' }}
              className="flex-1 bg-gold text-dark font-bold rounded-md px-4 py-2.5 shadow-gold transition flex items-center justify-center gap-2"
            >
              <FaLocationArrow />
              Start
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="flex-1 bg-dark border border-gold text-gold rounded-md px-4 py-2.5 flex items-center justify-center gap-2 hover:bg-gold/10 transition"
            >
              <SiUber />
              Uber
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="flex-1 bg-dark border border-gold text-gold rounded-md px-4 py-2.5 flex items-center justify-center gap-2 hover:bg-gold/10 transition"
            >
              <FaShareAlt />
              Share
            </motion.button>
          </div>
        </motion.div>
      </main>

      {/* ─────────────────────────────────────────────────────────────────────
          MESSAGE INPUT
      ───────────────────────────────────────────────────────────────────── */}
      <form className="fixed bottom-16 left-0 right-0 px-4 py-3 flex items-center gap-2 bg-darkest border-t border-borderGlow z-40">
        <button type="button" className="text-muted hover:text-gold text-xl transition-colors">
          <FaSmile />
        </button>
        <input
          className="flex-1 bg-chatGray text-light rounded-full px-5 py-3 border border-borderGlow placeholder-muted outline-none focus:ring-2 focus:ring-gold/50 transition"
          type="text"
          placeholder="Type a message…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button type="button" className="text-muted hover:text-gold text-xl transition-colors">
          <FaMicrophone />
        </button>
        <motion.button
          type="submit"
          whileTap={{ scale: 0.95 }}
          className="bg-gold text-dark rounded-full p-3 shadow-gold"
        >
          <FaLocationArrow className="rotate-45" />
        </motion.button>
      </form>

      {/* ─────────────────────────────────────────────────────────────────────
          BOTTOM NAVIGATION
      ───────────────────────────────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-darkest border-t border-borderGlow shadow-navbar flex justify-around items-center px-2 py-2 z-50">
        <NavItem icon={<FaHome />} label="Home" />
        <NavItem icon={<FaCompass />} label="Map" />
        <NavItem icon={<FaLocationArrow />} label="Explore" />
        <NavItem icon={<FaRegComments />} label="Chats" active badge={3} />
        <NavItem icon={<FaUser />} label="Profile" />
      </nav>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NAV ITEM COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
}

function NavItem({ icon, label, active = false, badge }: NavItemProps) {
  return (
    <button
      className={`relative flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
        active ? 'text-gold' : 'text-muted hover:text-light'
      }`}
    >
      <span className="text-xl">{icon}</span>
      {badge && badge > 0 && (
        <span className="absolute -top-1 right-0 bg-gold text-dark text-xs font-bold px-1.5 rounded-full min-w-[18px] text-center">
          {badge}
        </span>
      )}
      <span className="text-xs">{label}</span>
      {active && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gold rounded-full"
        />
      )}
    </button>
  );
}
