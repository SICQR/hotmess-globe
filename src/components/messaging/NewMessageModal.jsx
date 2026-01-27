import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Users, MessageCircle, Calendar, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function NewMessageModal({ currentUser, allUsers, onClose, onThreadCreated, prefillToEmail }) {
  const [messageType, setMessageType] = useState('dm'); // dm, group, event, squad
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedSquad, setSelectedSquad] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const didPrefillRef = useRef(false);

  useEffect(() => {
    const email = prefillToEmail ? String(prefillToEmail).trim().toLowerCase() : '';
    if (!email) return;
    if (didPrefillRef.current) return;
    if (!currentUser?.email) return;
    if (email === String(currentUser.email).trim().toLowerCase()) return;

    didPrefillRef.current = true;
    setMessageType('dm');
    setSearchQuery(email);

    setSelectedUsers([email]);
  }, [currentUser?.email, prefillToEmail]);

  // Fetch events for event chats
  const { data: events = [] } = useQuery({
    queryKey: ['events-for-chat'],
    queryFn: () => base44.entities.Beacon.filter({ kind: 'event', active: true }, '-event_date', 20),
  });

  // Fetch squads for squad chats
  const { data: squads = [] } = useQuery({
    queryKey: ['squads-for-chat'],
    queryFn: () => base44.entities.Squad.list(),
  });

  const { data: squadMembers = [] } = useQuery({
    queryKey: ['squad-members-for-chat'],
    queryFn: () => base44.entities.SquadMember.list(),
  });

  const createThreadMutation = useMutation({
    mutationFn: async () => {
      const ok = await base44.auth.requireProfile(window.location.href);
      if (!ok) return null;

      let participantEmails = [currentUser.email];
      let threadType = messageType;
      let metadata = {};

      if (messageType === 'dm') {
        if (selectedUsers.length !== 1) throw new Error('Select exactly one user for DM');
        const targetEmail = selectedUsers[0];
        
        // Check if thread already exists
        const existingThreads = await base44.entities.ChatThread.filter({ active: true });
        const existingThread = existingThreads.find(t => 
          t.thread_type === 'dm' &&
          t.participant_emails.length === 2 &&
          t.participant_emails.includes(currentUser.email) &&
          t.participant_emails.includes(targetEmail)
        );
        
        if (existingThread) return existingThread;

        participantEmails.push(targetEmail);
      } else if (messageType === 'group') {
        if (selectedUsers.length === 0) throw new Error('Select at least one user');
        participantEmails.push(...selectedUsers);
        threadType = 'dm'; // group DMs use 'dm' type
      } else if (messageType === 'event') {
        if (!selectedEvent) throw new Error('Select an event');
        metadata = { event_id: selectedEvent.id, event_title: selectedEvent.title };
        // Add all users who RSVP'd to the event
        const rsvps = await base44.entities.EventRSVP.filter({ event_id: selectedEvent.id });
        const attendeeEmails = rsvps.map(r => r.user_email).filter(e => e !== currentUser.email);
        participantEmails.push(...attendeeEmails);
      } else if (messageType === 'squad') {
        if (!selectedSquad) throw new Error('Select a squad');
        metadata = { squad_id: selectedSquad.id, squad_name: selectedSquad.name };
        // Add all squad members
        const members = squadMembers.filter(m => m.squad_id === selectedSquad.id);
        const memberEmails = members.map(m => m.user_email).filter(e => e !== currentUser.email);
        participantEmails.push(...memberEmails);
      }

      const thread = await base44.entities.ChatThread.create({
        participant_emails: [...new Set(participantEmails)], // Remove duplicates
        thread_type: threadType,
        active: true,
        metadata,
        unread_count: {},
      });

      // Send welcome message for groups
      if (participantEmails.length > 2) {
        await base44.entities.Message.create({
          thread_id: thread.id,
          sender_email: currentUser.email,
          content: `${currentUser.full_name} started the conversation`,
          message_type: 'system',
          read_by: [currentUser.email],
        });
      }

      return thread;
    },
    onSuccess: (thread) => {
      if (!thread) return;
      queryClient.invalidateQueries(['chat-threads']);
      toast.success('Thread created!');
      onThreadCreated(thread);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create thread');
    },
  });

  const toggleUser = (email) => {
    setSelectedUsers(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const filteredUsers = allUsers.filter(u =>
    u.email !== currentUser.email &&
    (u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     u.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-black border-2 border-white w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-message-title"
        >
          {/* Header */}
          <div className="border-b-2 border-white/20 p-6 flex items-center justify-between bg-black">
            <div>
              <h2 id="new-message-title" className="text-2xl font-black uppercase tracking-tighter">NEW MESSAGE</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">START A CONVERSATION</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white/60 hover:text-white">
              <X className="w-6 h-6" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="p-6">
            <Tabs value={messageType} onValueChange={setMessageType} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-black border-2 border-white/20 mb-6">
                <TabsTrigger value="dm" className="data-[state=active]:bg-[#E62020] data-[state=active]:text-black font-black uppercase text-xs">
                  <MessageCircle className="w-3 h-3 mr-1" />
                  DM
                </TabsTrigger>
                <TabsTrigger value="group" className="data-[state=active]:bg-[#00D9FF] data-[state=active]:text-black font-black uppercase text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  Group
                </TabsTrigger>
                <TabsTrigger value="event" className="data-[state=active]:bg-[#FF6B35] data-[state=active]:text-black font-black uppercase text-xs">
                  <Calendar className="w-3 h-3 mr-1" />
                  Event
                </TabsTrigger>
                <TabsTrigger value="squad" className="data-[state=active]:bg-[#B026FF] data-[state=active]:text-white font-black uppercase text-xs">
                  <MapPin className="w-3 h-3 mr-1" />
                  Squad
                </TabsTrigger>
              </TabsList>

              {/* DM Tab */}
              <TabsContent value="dm" className="space-y-4">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SEARCH USERS..."
                  className="bg-black border-2 border-white/20 text-white placeholder:text-white/40 placeholder:uppercase"
                />
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredUsers.map(user => {
                    return (
                      <button
                        key={user.email}
                        onClick={() => toggleUser(user.email)}
                        className={`w-full flex items-center gap-3 p-3 border-2 transition-all ${
                          selectedUsers.includes(user.email)
                            ? 'bg-[#E62020]/20 border-[#E62020]'
                            : 'bg-black border-white/20 hover:border-white/40'
                        }`}
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-[#E62020] to-[#B026FF] flex items-center justify-center border-2 border-white">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-bold text-sm">{user.full_name?.[0] || 'U'}</span>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-black text-sm uppercase">{user.full_name}</p>
                          <p className="text-xs text-white/40 font-mono">{user.email}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Group Tab */}
              <TabsContent value="group" className="space-y-4">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SEARCH USERS..."
                  className="bg-black border-2 border-white/20 text-white"
                />
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-black border-2 border-white/20">
                    {selectedUsers.map(email => {
                      const user = allUsers.find(u => u.email === email);
                      return (
                        <div key={email} className="flex items-center gap-2 px-3 py-1.5 bg-[#00D9FF]/20 border-2 border-[#00D9FF]">
                          <span className="text-xs font-bold uppercase">{user?.full_name || email}</span>
                          <button onClick={() => toggleUser(email)}>
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredUsers.map(user => (
                    <button
                      key={user.email}
                      onClick={() => toggleUser(user.email)}
                      className={`w-full flex items-center gap-3 p-3 border-2 transition-all ${
                        selectedUsers.includes(user.email)
                          ? 'bg-[#00D9FF]/20 border-[#00D9FF]'
                          : 'bg-black border-white/20 hover:border-white/40'
                      }`}
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-[#00D9FF] to-[#B026FF] flex items-center justify-center border-2 border-white">
                        <span className="font-bold text-sm">{user.full_name?.[0] || 'U'}</span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-black text-sm uppercase">{user.full_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </TabsContent>

              {/* Event Tab */}
              <TabsContent value="event" className="space-y-4">
                <p className="text-xs text-white/60 uppercase">Select an event to create a group chat with all attendees</p>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {events.map(event => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`w-full text-left p-4 border-2 transition-all ${
                        selectedEvent?.id === event.id
                          ? 'bg-[#FF6B35]/20 border-[#FF6B35]'
                          : 'bg-black border-white/20 hover:border-white/40'
                      }`}
                    >
                      <p className="font-black uppercase">{event.title}</p>
                      <p className="text-xs text-white/60">{event.city}</p>
                    </button>
                  ))}
                </div>
              </TabsContent>

              {/* Squad Tab */}
              <TabsContent value="squad" className="space-y-4">
                <p className="text-xs text-white/60 uppercase">Select a squad to chat with all members</p>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {squads.map(squad => (
                    <button
                      key={squad.id}
                      onClick={() => setSelectedSquad(squad)}
                      className={`w-full text-left p-4 border-2 transition-all ${
                        selectedSquad?.id === squad.id
                          ? 'bg-[#B026FF]/20 border-[#B026FF]'
                          : 'bg-black border-white/20 hover:border-white/40'
                      }`}
                    >
                      <p className="font-black uppercase">{squad.name}</p>
                      <p className="text-xs text-white/60">{squad.interest}</p>
                    </button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>

            {/* Create Button */}
            <Button
              onClick={() => createThreadMutation.mutate()}
              disabled={
                createThreadMutation.isPending ||
                (messageType === 'dm' && selectedUsers.length !== 1) ||
                (messageType === 'group' && selectedUsers.length === 0) ||
                (messageType === 'event' && !selectedEvent) ||
                (messageType === 'squad' && !selectedSquad)
              }
              className="w-full mt-6 bg-[#E62020] hover:bg-white text-black font-black py-6 text-lg border-2 border-white"
            >
              {createThreadMutation.isPending ? 'CREATING...' : 'START CONVERSATION'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}