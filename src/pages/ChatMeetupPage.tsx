/**
 * ChatMeetupPage — Chat with Location Meet-Up
 * 
 * Pure dark/gold palette, unified navigation, animated chat bubbles,
 * embedded map card with Start/Uber/Share CTAs.
 */

import { useRef, useCallback } from 'react';
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query';
import { useLocalPullToRefresh } from '@/hooks/useLocalPullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';


import { FaMapMarkerAlt, FaLocationArrow, FaUber, FaShareAlt, FaChevronLeft, FaEllipsisV, FaHome, FaCompass, FaRegComments, FaUser } from 'react-icons/fa'
import ChatMapCard from '@/components/chat/ChatMapCard';

const messages = [
  {
    sender: 'them',
    time: '20:41',
    text: <>Just got into Berlin! <span role="img" aria-label="plane">✈️</span><br />Trying to find a bar now <span role="img" aria-label="smile">😊</span></>,
  },
  {
    sender: 'me',
    time: '20:43',
    text: <>Right now? I'm in <span className="font-semibold text-accent">Schöneberg</span> <span role="img" aria-label="fire">🔥</span></>,
  },
  {
    sender: 'them',
    time: '20:44',
    text: "Perfect! Let's meet there!",
  }
]

export default function ChatMeetupPage() {
  const queryClient = useQueryClient();
  const scrollRef = useRef(null);
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const { pullDistance, isRefreshing } = useLocalPullToRefresh({
    onRefresh: handleRefresh,
    scrollRef,
  });



  return (
    <div className="relative min-h-screen bg-dark text-light font-sans flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-4">
        <button className="text-gold text-2xl"><FaChevronLeft /></button>
        <div className="font-mono text-xl tracking-wide"><span className="text-white">HOT</span><span className="text-[#C8962C] drop-shadow-[0_0_10px_#FFB80077]">MESS</span></div>
        <button className="text-gold text-2xl"><FaEllipsisV /></button>
      </header>
      
      {/* User Meta */}
      <section className="flex items-center gap-3 px-4 pb-2">
        <div className="relative">
          <img src="/avatar.jpg" alt="User avatar" className="w-14 h-14 rounded-full border-2 border-gold shadow-gold object-cover"/>
          <span className="absolute bottom-1 right-1 w-3 h-3 bg-online rounded-full border-2 border-darkest" />
        </div>
        <div>
          <div className="font-bold text-light text-base">AlexTravels</div>
          <div className="text-muted text-sm">Visiting Berlin · 1.2 km away</div>
        </div>
      </section>

      {/* Chat Bubbles */}
      <main ref={scrollRef} className="flex-1 px-4 py-2 flex flex-col gap-3 overflow-y-auto scroll-momentum">
        <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

        {messages.map((msg, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06, type: 'spring', stiffness: 48 }}
            className={`max-w-[78%] rounded-bubble px-4 py-3 shadow-gold text-base ${msg.sender === 'me' ? 'self-end bg-gold text-dark' : 'self-start bg-chatGray text-light'}`}
            key={idx}
          >
            <span>{msg.text}</span>
            <span className="block text-xs text-muted mt-1">{msg.time}</span>
          </motion.div>
        ))}

        {/* Map Card — location-type message */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: messages.length * 0.08 + 0.3, type: 'spring', stiffness: 48 }}
          className="max-w-[90%] self-end mt-2 w-72"
        >
          <ChatMapCard
            label="Soho Cluster"
            distance="720 m · 4 min"
            lat={51.5127}
            lng={-0.1338}
            address="Soho, London W1D"
          />
        </motion.div>
      </main>

      {/* Message Input */}
      <form className="w-full px-4 py-3 flex items-center gap-2 bg-darkest border-t border-borderGlow">
        <input
          className="flex-1 bg-chatGray text-light rounded-full px-5 py-3 border border-borderGlow placeholder-muted outline-none focus:ring-2 focus:ring-gold transition"
          type="text"
          placeholder="Type a message…"
        />
        <button type="button" className="text-gold text-2xl"><FaRegComments /></button>
        <button type="button" className="text-gold text-2xl"><FaUser /></button>
      </form>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-darkest border-t border-borderGlow shadow-navbar flex justify-between items-center px-4 py-2 z-10">
        <button className="text-gold flex flex-col items-center"><FaHome /><span className="text-xs">Home</span></button>
        <button className="text-light flex flex-col items-center"><FaCompass /><span className="text-xs">Map</span></button>
        <button className="text-light flex flex-col items-center"><FaLocationArrow /><span className="text-xs">Explore</span></button>
        <button className="text-light relative flex flex-col items-center">
          <FaRegComments />
          <span className="absolute -top-1 -right-3 bg-gold text-dark text-xs font-bold px-1.5 rounded-full">3</span>
          <span className="text-xs">Chats</span>
        </button>
        <button className="text-light flex flex-col items-center"><FaUser /><span className="text-xs">Profile</span></button>
      </nav>
    </div>
  )
}
