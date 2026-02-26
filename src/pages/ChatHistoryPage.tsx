/**
 * ChatHistoryPage — Conversation List
 * 
 * Shows all chat threads with avatars, snippets, timestamps.
 * Unified dark/gold theme.
 */

import { motion } from 'framer-motion';
import { FaChevronLeft, FaSearch, FaCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { AppNavBar } from '@/components/nav/AppNavBar';

const conversations = [
  { 
    id: '1',
    username: 'AlexTravels', 
    snippet: 'Meeting at Soho tonight', 
    time: '21:46',
    unread: 2,
    online: true,
    avatar: '/avatars/alex.jpg'
  },
  { 
    id: '2',
    username: 'Tyme', 
    snippet: 'See you at RAW', 
    time: '16:29',
    unread: 0,
    online: true,
    avatar: '/avatars/tyme.jpg'
  },
  { 
    id: '3',
    username: 'JordanK', 
    snippet: 'That was wild last night 🔥', 
    time: '14:12',
    unread: 0,
    online: false,
    avatar: '/avatars/jordan.jpg'
  },
  { 
    id: '4',
    username: 'SamXXL', 
    snippet: 'Sending you the address now', 
    time: 'Yesterday',
    unread: 0,
    online: false,
    avatar: '/avatars/sam.jpg'
  },
  { 
    id: '5',
    username: 'ChrisB', 
    snippet: 'Thanks for the invite!', 
    time: 'Yesterday',
    unread: 0,
    online: true,
    avatar: '/avatars/chris.jpg'
  },
];

export default function ChatHistoryPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-dark font-sans text-light flex flex-col pb-20">
      {/* ─────────────────────────────────────────────────────────────────────
          HEADER
      ───────────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-4 bg-darkest/95 backdrop-blur border-b border-borderGlow">
        <button 
          onClick={() => navigate(-1)}
          className="text-gold hover:text-goldGlow transition-colors"
        >
          <FaChevronLeft className="text-xl" />
        </button>
        <span className="font-mono text-gold text-xl tracking-wide">Chats</span>
        <button className="text-gold hover:text-goldGlow transition-colors">
          <FaSearch className="text-xl" />
        </button>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────
          SEARCH BAR
      ───────────────────────────────────────────────────────────────────── */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 bg-chatGray rounded-full px-4 py-2 border border-borderGlow">
          <FaSearch className="text-muted" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="flex-1 bg-transparent text-light placeholder-muted outline-none"
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          CONVERSATION LIST
      ───────────────────────────────────────────────────────────────────── */}
      <main className="flex-1 px-4">
        {conversations.length === 0 ? (
          <div className="text-center text-muted py-12">
            <p>No conversations yet</p>
            <p className="text-sm mt-1">Start chatting with someone!</p>
          </div>
        ) : (
          conversations.map((conv, idx) => (
            <motion.button
              key={conv.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => navigate(`/chat/${conv.id}`)}
              className="w-full flex items-center gap-3 py-4 border-b border-chatGray hover:bg-chatGray/50 rounded-lg transition-colors"
            >
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gray border-2 border-gold overflow-hidden">
                  {conv.avatar ? (
                    <img src={conv.avatar} alt={conv.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gold/30 to-accent/30" />
                  )}
                </div>
                {conv.online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-online rounded-full border-2 border-darkest" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <span className={`font-bold truncate ${conv.unread > 0 ? 'text-gold' : 'text-light'}`}>
                    {conv.username}
                  </span>
                  <span className={`text-xs ml-2 flex-shrink-0 ${conv.unread > 0 ? 'text-gold' : 'text-muted'}`}>
                    {conv.time}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className={`text-sm truncate ${conv.unread > 0 ? 'text-light' : 'text-muted'}`}>
                    {conv.snippet}
                  </span>
                  {conv.unread > 0 && (
                    <span className="ml-2 flex-shrink-0 bg-gold text-dark text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {conv.unread}
                    </span>
                  )}
                </div>
              </div>
            </motion.button>
          ))
        )}
      </main>

      {/* Bottom Nav */}
      <AppNavBar />
    </div>
  );
}
