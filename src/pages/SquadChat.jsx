import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Users, Send, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function SquadChat() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedSquad, setSelectedSquad] = useState(null);
  const [message, setMessage] = useState('');

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: mySquads = [] } = useQuery({
    queryKey: ['my-squads', currentUser?.email],
    queryFn: async () => {
      const memberships = await base44.entities.SquadMember.filter({ user_email: currentUser.email });
      const squadIds = memberships.map(m => m.squad_id);
      const squads = await base44.entities.Squad.list();
      return squads.filter(s => squadIds.includes(s.id));
    },
    enabled: !!currentUser
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['squad-messages', selectedSquad?.id],
    queryFn: () => base44.entities.Message.filter({ 
      receiver_email: `squad_${selectedSquad.id}`
    }, '-created_date', 100),
    enabled: !!selectedSquad,
    refetchInterval: 3000
  });

  const sendMessageMutation = useMutation({
    mutationFn: (messageData) => base44.entities.Message.create(messageData),
    onSuccess: () => {
      queryClient.invalidateQueries(['squad-messages']);
      setMessage('');
    }
  });

  const handleSend = () => {
    if (!message.trim() || !selectedSquad || !currentUser) return;

    sendMessageMutation.mutate({
      sender_email: currentUser.email,
      receiver_email: `squad_${selectedSquad.id}`,
      content: message,
      message_type: 'text'
    });
  };

  if (!currentUser) {
    return <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <ChevronLeft className="w-6 h-6" />
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-black italic">SQUAD CHAT</h1>
            <p className="text-white/60 text-sm uppercase tracking-wider">Group messaging for your tribes</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Squad List */}
          <div className="bg-white/5 border-2 border-white/10 rounded-xl p-4 overflow-y-auto">
            <h2 className="font-black uppercase text-sm text-white/60 mb-4">MY SQUADS</h2>
            {mySquads.length === 0 ? (
              <p className="text-white/40 text-sm">Join a squad to start chatting</p>
            ) : (
              <div className="space-y-2">
                {mySquads.map(squad => (
                  <button
                    key={squad.id}
                    onClick={() => setSelectedSquad(squad)}
                    className={`w-full text-left p-4 rounded-lg transition-all border-2 ${
                      selectedSquad?.id === squad.id
                        ? 'bg-[#FF1493] border-[#FF1493] text-black'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Users className="w-5 h-5" />
                      <span className="font-black uppercase">{squad.name}</span>
                    </div>
                    <p className="text-xs opacity-60 line-clamp-2">{squad.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span>{squad.member_count} members</span>
                      <span>•</span>
                      <span className="uppercase">{squad.interest}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chat Area */}
          <div className="md:col-span-2 bg-white/5 border-2 border-white/10 rounded-xl flex flex-col">
            {selectedSquad ? (
              <>
                {/* Header */}
                <div className="p-4 border-b-2 border-white/10">
                  <h2 className="font-black uppercase text-xl">{selectedSquad.name}</h2>
                  <p className="text-white/60 text-sm">{selectedSquad.member_count} members</p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_email === currentUser.email ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] ${
                        msg.sender_email === currentUser.email
                          ? 'bg-[#FF1493] text-black'
                          : 'bg-white/10 text-white'
                      } rounded-lg p-3`}>
                        {msg.sender_email !== currentUser.email && (
                          <p className="text-xs opacity-60 mb-1 uppercase font-bold">{msg.sender_email.split('@')[0]}</p>
                        )}
                        <p>{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input */}
                <div className="p-4 border-t-2 border-white/10">
                  <div className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Type a message..."
                      className="flex-1 bg-white/5 border-white/20 text-white"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!message.trim()}
                      className="bg-[#FF1493] hover:bg-white text-black"
                    >
                      <Send className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-white/40">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-40" />
                  <p className="text-lg font-bold uppercase">Select a squad to chat</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}