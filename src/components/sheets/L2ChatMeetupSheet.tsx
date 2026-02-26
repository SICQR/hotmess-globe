/**
 * L2ChatMeetupSheet — Chat with Location Meet-Up
 * 
 * Full-featured chat with embedded map, location sharing,
 * and meet-up facilitation (Start, Uber, Share).
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSheet } from '@/contexts/SheetContext';
import { BaseSheet } from './BaseSheet';
import {
  Header,
  UserInfoBar,
  ChatBubble,
  MapCard,
  TextInput,
  Button,
  motionPresets,
} from '@/components/ui/design-system';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Smile, Mic, MapPin } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  type: 'text' | 'location';
  location_data?: {
    name: string;
    lat: number;
    lng: number;
    distance?: string;
    travel_time?: string;
  };
}

interface ChatMeetupSheetProps {
  threadId: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar: string;
  recipientTagline?: string;
  recipientDistance?: string;
  recipientStatus?: 'online' | 'offline' | 'away' | 'busy';
}

export function L2ChatMeetupSheet({
  threadId,
  recipientId,
  recipientName,
  recipientAvatar,
  recipientTagline,
  recipientDistance,
  recipientStatus = 'online',
}: ChatMeetupSheetProps) {
  const { closeSheet } = useSheet();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load messages
  useEffect(() => {
    loadMessages();
    
    // Subscribe to realtime messages
    const channel = supabase
      .channel(`chat-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  async function loadMessages() {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('[chat] load failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !user) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase.from('messages').insert({
        thread_id: threadId,
        sender_id: user.id,
        recipient_id: recipientId,
        content: messageContent,
        type: 'text',
      });

      if (error) throw error;
    } catch (err) {
      console.error('[chat] send failed:', err);
      setNewMessage(messageContent); // Restore on failure
    }
  }

  async function sendLocation(location: Message['location_data']) {
    if (!user || !location) return;

    try {
      const { error } = await supabase.from('messages').insert({
        thread_id: threadId,
        sender_id: user.id,
        recipient_id: recipientId,
        content: `📍 ${location.name}`,
        type: 'location',
        location_data: location,
      });

      if (error) throw error;
      setShowLocationPicker(false);
    } catch (err) {
      console.error('[chat] location send failed:', err);
    }
  }

  function handleStart(location: Message['location_data']) {
    if (!location) return;
    // Open native maps with directions
    const url = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
    window.open(url, '_blank');
  }

  function handleUber(location: Message['location_data']) {
    if (!location) return;
    // Deep link to Uber
    const url = `https://m.uber.com/ul/?action=setPickup&dropoff[latitude]=${location.lat}&dropoff[longitude]=${location.lng}&dropoff[nickname]=${encodeURIComponent(location.name)}`;
    window.open(url, '_blank');
  }

  function handleShare(location: Message['location_data']) {
    if (!location || !navigator.share) return;
    navigator.share({
      title: `Meet at ${location.name}`,
      text: `Let's meet at ${location.name}`,
      url: `https://www.google.com/maps?q=${location.lat},${location.lng}`,
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <BaseSheet onClose={closeSheet} fullHeight>
      <div className="flex flex-col h-full bg-dark">
        {/* Header */}
        <Header
          showBrand
          onBack={closeSheet}
          onOptions={() => {/* TODO: Chat options menu */}}
        />

        {/* User Info */}
        <UserInfoBar
          avatar={recipientAvatar}
          username={recipientName}
          tagline={recipientTagline}
          distance={recipientDistance}
          status={recipientStatus}
          onTap={() => {/* TODO: Open profile */}}
        />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted py-8">
              <p>No messages yet</p>
              <p className="text-sm mt-1">Say hi to {recipientName}!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOutgoing = msg.sender_id === user?.id;

              if (msg.type === 'location' && msg.location_data) {
                return (
                  <motion.div
                    key={msg.id}
                    className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}
                    {...motionPresets.messageIn}
                  >
                    <div className="max-w-[85%]">
                      <MapCard
                        placeName={msg.location_data.name}
                        distance={msg.location_data.distance || '—'}
                        travelTime={msg.location_data.travel_time || '—'}
                        onStart={() => handleStart(msg.location_data)}
                        onUber={() => handleUber(msg.location_data)}
                        onShare={() => handleShare(msg.location_data)}
                      />
                    </div>
                  </motion.div>
                );
              }

              return (
                <ChatBubble
                  key={msg.id}
                  message={msg.content}
                  isOutgoing={isOutgoing}
                  timestamp={new Date(msg.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                />
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="px-4 py-3 bg-darkest border-t border-borderGlow">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLocationPicker(true)}
              className="p-2 text-muted hover:text-gold transition-colors"
            >
              <MapPin className="w-5 h-5" />
            </button>
            <button className="p-2 text-muted hover:text-gold transition-colors">
              <Smile className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <TextInput
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onSend={sendMessage}
              />
            </div>
            <button className="p-2 text-muted hover:text-gold transition-colors">
              <Mic className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Location Picker Modal */}
        <AnimatePresence>
          {showLocationPicker && (
            <LocationPickerModal
              onClose={() => setShowLocationPicker(false)}
              onSelect={sendLocation}
            />
          )}
        </AnimatePresence>
      </div>
    </BaseSheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Location Picker Modal
// ─────────────────────────────────────────────────────────────────────────────

interface LocationPickerModalProps {
  onClose: () => void;
  onSelect: (location: Message['location_data']) => void;
}

function LocationPickerModal({ onClose, onSelect }: LocationPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setCurrentLocation(pos),
      (err) => console.error('[geo] failed:', err)
    );
  }, []);

  function sendCurrentLocation() {
    if (!currentLocation) return;
    onSelect({
      name: 'My Current Location',
      lat: currentLocation.coords.latitude,
      lng: currentLocation.coords.longitude,
      distance: '0 m',
      travel_time: '0 min',
    });
  }

  // Simplified: In production, integrate with Google Places API
  const suggestedPlaces = [
    { name: 'Soho Cluster', lat: 51.5137, lng: -0.1337, distance: '720 m', travel_time: '4 min' },
    { name: 'Heaven (Under the Arches)', lat: 51.5075, lng: -0.1235, distance: '1.2 km', travel_time: '8 min' },
    { name: 'XXL London', lat: 51.5042, lng: -0.1058, distance: '1.8 km', travel_time: '12 min' },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-lg bg-darkest rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-light font-bold text-lg">Share Location</h3>
          <button onClick={onClose} className="text-muted hover:text-light">
            ✕
          </button>
        </div>

        {/* Current Location */}
        <Button
          variant="primary"
          className="w-full mb-4"
          onClick={sendCurrentLocation}
          disabled={!currentLocation}
        >
          <MapPin className="w-4 h-4 mr-2" />
          Send My Current Location
        </Button>

        {/* Search */}
        <TextInput
          placeholder="Search for a place..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mb-4"
        />

        {/* Suggestions */}
        <div className="space-y-2">
          <p className="text-muted text-sm">Suggested meet-up spots</p>
          {suggestedPlaces.map((place) => (
            <motion.button
              key={place.name}
              className="w-full flex items-center gap-3 p-3 bg-gray rounded-lg hover:bg-chatGray transition-colors text-left"
              onClick={() => onSelect(place)}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-gold" />
              </div>
              <div className="flex-1">
                <div className="text-light font-medium">{place.name}</div>
                <div className="text-muted text-sm">
                  {place.distance} · {place.travel_time}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default L2ChatMeetupSheet;
