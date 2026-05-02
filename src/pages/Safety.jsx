import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/components/utils/supabaseClient';
import { Shield, UserPlus, Clock, Phone, CheckCircle, ArrowLeft } from 'lucide-react';
import { useLocalPullToRefresh } from '@/hooks/useLocalPullToRefresh';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSOSContext } from '@/contexts/SOSContext';

import EmergencyMessageEditor from '../components/safety/EmergencyMessageEditor';
import CheckInTimerCustomizer from '../components/safety/CheckInTimerCustomizer';
import AftercareNudge from '../components/safety/AftercareNudge';

export default function Safety() {
  const navigate = useNavigate();
  const { triggerSOS } = useSOSContext();
  const [currentUser, setCurrentUser] = useState(null);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [showAftercareNudge, setShowAftercareNudge] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [relationship, setRelationship] = useState('friend');
  const [checkOutHours, setCheckOutHours] = useState(4);
  const queryClient = useQueryClient();
  const scrollRef = useRef(null);
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const { pullDistance, isRefreshing } = useLocalPullToRefresh({
    onRefresh: handleRefresh,
    scrollRef,
  });



  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Build a compat object so existing code can use currentUser.email
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setCurrentUser({
          id: session.user.id,
          email: session.user.email,
          city: profile?.city || null,
          ...profile,
        });
      }
    };
    fetchUser();
  }, []);

  const { data: trustedContacts = [] } = useQuery({
    queryKey: ['trusted-contacts', currentUser?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trusted_contacts')
        .select('*')
        .eq('user_id', currentUser.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser,
  });

  const { data: activeCheckIn } = useQuery({
    queryKey: ['active-safety-checkin', currentUser?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('safety_checkins')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    },
    enabled: !!currentUser,
    refetchInterval: 30000,
  });

  const addContactMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('trusted_contacts').insert({
        user_id: currentUser.id,
        contact_name: contactName,
        contact_phone: contactPhone,
        contact_email: contactEmail,
        relationship,
        notify_on_sos: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['trusted-contacts']);
      toast.success('Trusted contact added');
      setContactName('');
      setContactPhone('');
      setContactEmail('');
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const checkOutTime = new Date(Date.now() + checkOutHours * 60 * 60 * 1000).toISOString();

      let location = { venue_name: 'Unknown' };
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            venue_name: currentUser.city || 'Unknown'
          };
        } catch (error) {
          void('Location access denied');
        }
      }

      const { error } = await supabase.from('safety_checkins').insert({
        user_id: currentUser.id,
        check_in_time: new Date().toISOString(),
        expected_check_out: checkOutTime,
        location,
        status: 'active',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['active-safety-checkin']);
      toast.success('Safety check-in active');
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('safety_checkins')
        .update({ status: 'checked_out' })
        .eq('id', activeCheckIn.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['active-safety-checkin']);
      toast.success('Checked out safely');
      setTimeout(() => setShowAftercareNudge(true), 3000);
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('trusted_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['trusted-contacts']);
      toast.success('Contact removed');
    },
  });

  return (
    <div className="h-full w-full flex flex-col text-white" style={{ background: '#050507' }}>
      {/* Mobile-first sticky header */}
      <div
        className="sticky top-0 z-30 border-b border-white/5 px-4"
        style={{ background: 'rgba(5,5,7,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
      >
        <div className="pt-[env(safe-area-inset-top)]" />
        <div className="flex items-center justify-between h-14">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-semibold text-white/60 active:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="text-center">
            <h1 className="font-black text-base tracking-[0.12em] uppercase" style={{ color: '#C8962C' }}>
              Safety Hub
            </h1>
            <p className="text-[10px] text-white/30 font-medium">Care-first</p>
          </div>
          <div className="w-12" /> {/* spacer */}
        </div>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-momentum px-4 py-4 pb-24">
        <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

        {/* Quick actions — clear hierarchy: SOS primary, Fake Call secondary */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => triggerSOS()}
            className="py-3.5 font-bold text-sm rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2"
            style={{ background: 'rgba(255,59,48,0.12)', color: '#FF3B30', border: '1px solid rgba(255,59,48,0.25)' }}
          >
            <Shield className="w-4 h-4" />
            SILENT SOS
          </button>
          <button
            onClick={() => navigate('/fake-call')}
            className="py-3.5 font-bold text-sm rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 bg-[#1C1C1E] border border-white/10 text-white/70"
          >
            <Phone className="w-4 h-4 text-[#00C2E0]" />
            Fake Call
          </button>
        </div>

        <Tabs defaultValue="checkin">
          <TabsList className="bg-white/5 border border-white/10 mb-6">
            <TabsTrigger value="checkin">Safety Check-In</TabsTrigger>
            <TabsTrigger value="contacts">Trusted Contacts</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="checkin">
            {activeCheckIn ? (
              <div className="bg-green-500/20 border-2 border-green-500 p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <div>
                    <h3 className="font-black uppercase text-lg">ACTIVE CHECK-IN</h3>
                    <p className="text-sm text-white/60">
                      Expected check-out: {new Date(activeCheckIn.expected_check_out).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => checkOutMutation.mutate()}
                  variant="cyan"
                  className="w-full"
                >
                  CHECK OUT SAFELY
                </Button>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 p-6 mb-6">
                <h3 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#00C2E0]" />
                  Start Safety Check-In
                </h3>
                <p className="text-sm text-white/60 mb-4">
                  Your contacts get alerted if you don't check out on time.
                </p>
                
                <div className="mb-4">
                  <label className="text-xs uppercase tracking-widest text-white/60 mb-2 block">
                    Expected return time
                  </label>
                  <Select value={checkOutHours.toString()} onValueChange={(v) => setCheckOutHours(Number(v))}>
                    <SelectTrigger className="bg-white/5 border-white/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 hours</SelectItem>
                      <SelectItem value="4">4 hours</SelectItem>
                      <SelectItem value="6">6 hours</SelectItem>
                      <SelectItem value="8">8 hours (Full night)</SelectItem>
                      <SelectItem value="12">12 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => checkInMutation.mutate()}
                  disabled={trustedContacts.length === 0 || checkInMutation.isPending}
                  variant="cyan"
                  className="w-full"
                >
                  START CHECK-IN
                </Button>
                {trustedContacts.length === 0 && (
                  <p className="text-xs text-white/40 mt-2 text-center">
                    Add trusted contacts first
                  </p>
                )}
              </div>
            )}

            <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
              <p className="text-xs text-white/40 leading-relaxed">
                Check in before you go out. Set a return time. If you don't check out, your trusted contacts are notified. SOS is always one hold away.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="contacts">
            <div className="bg-white/5 border border-white/10 p-6 mb-6">
              <h3 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#00C2E0]" />
                Add Trusted Contact
              </h3>
              
              <div className="space-y-4">
                <Input
                  placeholder="Contact name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="bg-white/5 border-white/20"
                />
                <Input
                  placeholder="Phone number"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="bg-white/5 border-white/20"
                />
                <Input
                  placeholder="Email (optional)"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="bg-white/5 border-white/20"
                />
                <Select value={relationship} onValueChange={setRelationship}>
                  <SelectTrigger className="bg-white/5 border-white/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friend">Friend</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                    <SelectItem value="roommate">Roommate</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={() => addContactMutation.mutate()}
                  disabled={!contactName.trim() || !contactPhone.trim() || addContactMutation.isPending}
                  variant="cyan"
                  className="w-full"
                >
                  ADD CONTACT
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {trustedContacts.length === 0 ? (
                <div className="text-center py-12 border-2 border-white/10">
                  <Shield className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/40">No trusted contacts yet</p>
                </div>
              ) : (
                trustedContacts.map((contact) => (
                  <motion.div
                    key={contact.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold uppercase">{contact.contact_name}</h4>
                        <p className="text-sm text-white/60 flex items-center gap-2 mt-1">
                          <Phone className="w-3 h-3" />
                          {contact.contact_phone}
                        </p>
                        {contact.contact_email && (
                          <p className="text-xs text-white/40">{contact.contact_email}</p>
                        )}
                        <span className="inline-block mt-2 px-2 py-1 bg-[#00C2E0]/20 text-[#00C2E0] text-xs font-bold uppercase">
                          {contact.relationship}
                        </span>
                      </div>
                      <Button
                        onClick={() => deleteContactMutation.mutate(contact.id)}
                        variant="glass"
                        size="sm"
                        className="text-white/70 hover:text-red-300 border-white/15"
                      >
                        Remove
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <EmergencyMessageEditor />
              <CheckInTimerCustomizer />
              
              <div className="bg-white/5 border border-white/10 p-6">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-white/30" />
                  How safety works
                </h3>
                <ul className="space-y-2 text-xs text-white/40 leading-relaxed">
                  <li><strong>SILENT SOS:</strong> Triple-tap the shield button (bottom-left) to trigger a silent SOS. Your location is shared immediately.</li>
                  <li><strong>THE EXIT:</strong> Long-press (2s) the shield button for an immediate fake incoming call to leave any situation.</li>
                  <li><strong>THE DISAPPEAR:</strong> Long-press (4s+) the shield button to stealth-wipe local app data and hide your activity.</li>
                  <li><strong>THE WINDOW:</strong> Check-in timers alert contacts if you're overdue. Your contacts are notified via WhatsApp.</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <AftercareNudge isOpen={showAftercareNudge} onClose={() => setShowAftercareNudge(false)} />
    </div>
  );
}