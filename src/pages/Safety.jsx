import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Shield, UserPlus, Clock, MapPin, Phone, AlertTriangle, CheckCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import EmergencyMessageEditor from '../components/safety/EmergencyMessageEditor';
import CheckInTimerCustomizer from '../components/safety/CheckInTimerCustomizer';

export default function Safety() {
  const [currentUser, setCurrentUser] = useState(null);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [relationship, setRelationship] = useState('friend');
  const [checkOutHours, setCheckOutHours] = useState(4);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: trustedContacts = [] } = useQuery({
    queryKey: ['trusted-contacts', currentUser?.email],
    queryFn: () => base44.entities.TrustedContact.filter({ user_email: currentUser.email }),
    enabled: !!currentUser,
  });

  const { data: activeCheckIn } = useQuery({
    queryKey: ['active-safety-checkin', currentUser?.email],
    queryFn: async () => {
      const checkIns = await base44.entities.SafetyCheckIn.filter({ 
        user_email: currentUser.email,
        status: 'active'
      });
      return checkIns[0] || null;
    },
    enabled: !!currentUser,
    refetchInterval: 30000,
  });

  const addContactMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.TrustedContact.create({
        user_email: currentUser.email,
        contact_name: contactName,
        contact_phone: contactPhone,
        contact_email: contactEmail,
        relationship,
        notify_on_sos: true,
      });
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
          console.log('Location access denied');
        }
      }

      await base44.entities.SafetyCheckIn.create({
        user_email: currentUser.email,
        check_in_time: new Date().toISOString(),
        expected_check_out: checkOutTime,
        location,
        status: 'active',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['active-safety-checkin']);
      toast.success('Safety check-in active');
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.SafetyCheckIn.update(activeCheckIn.id, {
        status: 'checked_out',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['active-safety-checkin']);
      toast.success('Checked out safely');
    },
  });

  const deleteContactMutation = useMutation({
    mutationFn: (id) => base44.entities.TrustedContact.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['trusted-contacts']);
      toast.success('Contact removed');
    },
  });

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-2">
            <span className="text-[#00D9FF]">SAFETY</span> HUB
          </h1>
          <p className="text-white/60 uppercase text-sm tracking-wider">
            Care-first. Your safety matters.
          </p>
        </motion.div>

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
                  className="w-full bg-green-500 hover:bg-green-600 text-black font-black"
                >
                  CHECK OUT SAFELY
                </Button>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 p-6 mb-6">
                <h3 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#00D9FF]" />
                  Start Safety Check-In
                </h3>
                <p className="text-sm text-white/60 mb-4">
                  Let trusted contacts know you're out. We'll alert them if you don't check out on time.
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
                  className="w-full bg-[#00D9FF] hover:bg-white text-black font-black"
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

            <div className="bg-white/5 border border-white/10 p-6">
              <h3 className="text-xl font-black uppercase mb-2">HOW IT WORKS</h3>
              <ul className="space-y-2 text-sm text-white/60">
                <li>• Check in when you go out</li>
                <li>• Set expected return time</li>
                <li>• We'll send alerts to trusted contacts if you're overdue</li>
                <li>• Check out when you're safe</li>
                <li>• SOS button always available via panic button</li>
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="contacts">
            <div className="bg-white/5 border border-white/10 p-6 mb-6">
              <h3 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#00D9FF]" />
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
                  className="w-full bg-[#00D9FF] hover:bg-white text-black font-black"
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
                        <span className="inline-block mt-2 px-2 py-1 bg-[#00D9FF]/20 text-[#00D9FF] text-xs font-bold uppercase">
                          {contact.relationship}
                        </span>
                      </div>
                      <Button
                        onClick={() => deleteContactMutation.mutate(contact.id)}
                        variant="ghost"
                        size="sm"
                        className="text-white/40 hover:text-red-500"
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
                <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#FF1493]" />
                  Safety Features
                </h3>
                <ul className="space-y-3 text-sm text-white/60">
                  <li className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-bold">Panic Button</p>
                      <p className="text-xs">Always available in bottom-right corner. Sends SOS to all trusted contacts with your location.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <Clock className="w-4 h-4 text-[#00D9FF] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-bold">Check-In Timer</p>
                      <p className="text-xs">Set expected return time. Trusted contacts get notified if you're overdue.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-[#FFEB3B] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-bold">Location Sharing</p>
                      <p className="text-xs">Real-time location shared during active check-ins and emergencies.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <MessageSquare className="w-4 h-4 text-[#FF1493] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-bold">Custom Messages</p>
                      <p className="text-xs">Pre-define emergency messages for instant alerts.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}