/**
 * ChatWithMapExample — Demonstrates atomic component composition
 * 
 * This screen shows how to build a complete chat + location sharing
 * view using only design system components.
 */

import { useState, useRef, useEffect } from 'react';
import {
  ChatBubble,
  MapCard,
  MessageInputBar,
  Header,
  Avatar,
} from '@/components/ui/design-system';
import { AppNavBar } from '@/components/nav/AppNavBar';

const initialMessages = [
  { text: "Just got into Berlin! ✈️ Trying to find a bar now 😊", time: "20:41", outgoing: false },
  { text: "Right now? I'm in Schöneberg 🔥", time: "20:43", outgoing: true },
  { text: "Perfect! Let's meet there!", time: "20:44", outgoing: false },
];

export default function ChatWithMapExample() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend() {
    if (input.trim()) {
      setMessages([
        ...messages,
        {
          text: input,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          outgoing: true,
        },
      ]);
      setInput('');
    }
  }

  return (
    <div className="min-h-screen bg-dark flex flex-col">
      {/* Header with user info */}
      <Header
        title="AlexTravels ✈️"
        onBack={() => window.history.back()}
        onOptions={() => alert('Menu')}
      >
        <Avatar
          src="https://randomuser.me/api/portraits/men/75.jpg"
          size="sm"
          status="online"
        />
      </Header>

      {/* User info bar */}
      <div className="px-4 py-2 text-muted text-sm border-b border-borderGlow">
        Visiting Berlin · 1.2 km away
      </div>

      {/* Chat messages */}
      <div className="flex-1 flex flex-col px-4 py-3 gap-3 overflow-y-auto pb-32">
        {messages.map((msg, idx) => (
          <ChatBubble
            key={idx}
            message={msg.text}
            timestamp={msg.time}
            isOutgoing={msg.outgoing}
          />
        ))}

        {/* Embedded map card for location sharing */}
        <div className="self-end max-w-[85%]">
          <MapCard
            placeName="Soho Cluster"
            distance="720 m"
            travelTime="4 min"
            mapPreview="https://images.unsplash.com/photo-1506744038136-46273834b3fb?fit=crop&w=400&q=80"
            onStart={() => alert('Opening directions...')}
            onUber={() => window.open('https://uber.com', '_blank')}
            onShare={() => alert('Share location')}
          />
        </div>

        <div ref={chatEndRef} />
      </div>

      {/* Message input */}
      <div className="fixed bottom-16 left-0 right-0">
        <MessageInputBar
          value={input}
          onChange={setInput}
          onSend={handleSend}
          onAttach={() => alert('Attach media')}
          placeholder="Type a message..."
        />
      </div>

      {/* Bottom nav */}
      <AppNavBar />
    </div>
  );
}
