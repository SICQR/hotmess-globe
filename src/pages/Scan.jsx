import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/components/utils/supabaseClient';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Zap, MapPin, Camera, CheckCircle, XCircle, Ticket, QrCode, User, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageShell from '@/components/shell/PageShell';
import { toast } from 'sonner';
import { broadcast } from '@/lib/globeActivity';

// Detect if a scanned code looks like a ticket (hm1.xxx.xxx format)
const looksLikeTicket = (code) => {
  if (!code) return false;
  const trimmed = String(code).trim();
  return trimmed.startsWith('hm1.') && trimmed.split('.').length === 3;
};

export default function Scan() {
  const [activeTab, setActiveTab] = useState('beacon');
  const [beaconId, setBeaconId] = useState('');
  const [ticketCode, setTicketCode] = useState('');
  const [eventIdFilter, setEventIdFilter] = useState('');
  const [scannedBeacon, setScannedBeacon] = useState(null);
  const [scannedTicket, setScannedTicket] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrError, setQrError] = useState(null);
  const videoRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: beacons = [] } = useQuery({
    queryKey: ['beacons'],
    queryFn: () => base44.entities.Beacon.filter({ active: true }),
  });

  // Get events for ticket scanning filter
  const { data: events = [] } = useQuery({
    queryKey: ['events-for-scan'],
    queryFn: () => base44.entities.Beacon.filter({ kind: 'event', active: true }),
  });

  const getAccessToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  // Beacon check-in mutation
  const scanMutation = useMutation({
    mutationFn: async ({ code, source }) => {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/scan/check-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code, source }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = payload?.error || payload?.details || 'Scan failed';
        const err = new Error(message);
        err.status = res.status;
        err.payload = payload;
        throw err;
      }

      return payload;
    },
    onSuccess: (payload) => {
      setScannedBeacon(payload);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['beacon_checkins'] });
      toast.success(`Scanned ${payload?.beacon?.title || 'beacon'}`);
      
      // Broadcast to globe activity stream
      broadcast.beaconScan(null, null, {
        beaconId: payload?.beacon?.id,
        title: payload?.beacon?.title,
        xpEarned: payload?.earned_xp,
      });
      
      setTimeout(() => {
        setScannedBeacon(null);
        setBeaconId('');
      }, 3000);
    },
    onError: (error) => {
      if (error?.status === 409) {
        toast.message('Already scanned recently');
        return;
      }
      toast.error(error?.message || 'Scan failed');
    },
  });

  // Ticket redemption mutation
  const ticketMutation = useMutation({
    mutationFn: async ({ ticket, eventId }) => {
      const token = await getAccessToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/scan/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          ticket, 
          event_id: eventId || undefined 
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = payload?.error || payload?.details || 'Redemption failed';
        const err = new Error(message);
        err.status = res.status;
        err.payload = payload;
        throw err;
      }

      return payload;
    },
    onSuccess: (payload) => {
      setScannedTicket(payload);
      queryClient.invalidateQueries({ queryKey: ['event_rsvps'] });
      
      if (payload.already_checked_in) {
        toast.message('Ticket already checked in');
      } else {
        toast.success(`Ticket validated! +${payload.awarded_xp || 50} XP`);
        
        // Broadcast to globe activity stream
        broadcast.eventCheckin(null, null, {
          eventId: payload?.rsvp?.event_id,
          userEmail: payload?.rsvp?.user_email,
          xpAwarded: payload?.awarded_xp,
        });
      }
      
      setTimeout(() => {
        setScannedTicket(null);
        setTicketCode('');
      }, 4000);
    },
    onError: (error) => {
      if (error?.status === 403) {
        toast.error('Admin privileges required for ticket scanning');
        return;
      }
      toast.error(error?.message || 'Ticket redemption failed');
    },
  });

  const handleBeaconScan = () => {
    if (!beaconId?.trim()) return;
    scanMutation.mutate({ code: beaconId.trim(), source: 'manual' });
  };

  const handleTicketScan = () => {
    if (!ticketCode?.trim()) return;
    ticketMutation.mutate({ ticket: ticketCode.trim(), eventId: eventIdFilter || null });
  };

  const qrReader = useMemo(() => new BrowserMultiFormatReader(), []);

  // Handle QR scan result - auto-detect ticket vs beacon
  const handleQrResult = (text) => {
    if (looksLikeTicket(text)) {
      // It's a ticket
      setActiveTab('ticket');
      setTicketCode(text);
      ticketMutation.mutate({ ticket: text, eventId: eventIdFilter || null });
    } else {
      // It's a beacon
      setActiveTab('beacon');
      setBeaconId(text);
      scanMutation.mutate({ code: text, source: 'qr' });
    }
  };

  useEffect(() => {
    if (!qrOpen) return;
    setQrError(null);

    let controls = null;
    let cancelled = false;

    const start = async () => {
      const video = videoRef.current;
      if (!video) {
        setQrError('Camera not ready');
        return;
      }

      try {
        controls = await qrReader.decodeFromVideoDevice(
          undefined,
          video,
          (result, error) => {
            if (cancelled) return;
            if (result) {
              const text = result.getText?.() || String(result);
              setQrOpen(false);
              handleQrResult(text);
            }
            // NotFoundException is expected when nothing is in view.
            if (error && error.name !== 'NotFoundException') {
              // Keep this quiet; only show if it's a persistent failure.
            }
          }
        );
      } catch (e) {
        const message = e?.message || 'Failed to start camera';
        setQrError(message);
        setQrOpen(false);
      }
    };

    start();

    return () => {
      cancelled = true;
      try {
        controls?.stop?.();
      } catch {
        // ignore
      }
      try {
        qrReader.reset?.();
      } catch {
        // ignore
      }
    };
  }, [qrOpen, qrReader]);

  return (
    <PageShell
      title="Scan"
      subtitle="Scan beacons to earn XP or validate event tickets."
      maxWidth="2xl"
      back
    >
      {/* Unified QR Scanner */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Button
          type="button"
          variant={qrOpen ? 'default' : 'outline'}
          onClick={() => setQrOpen((v) => !v)}
          className={`w-full py-6 ${qrOpen ? 'bg-[#FF1493] text-white' : 'border-white/20 text-white hover:bg-white/5'}`}
        >
          <Camera className="w-5 h-5 mr-2" />
          {qrOpen ? 'Close Camera' : 'Open QR Scanner'}
        </Button>

        <AnimatePresence>
          {qrOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 rounded-2xl overflow-hidden border border-white/10 bg-black"
            >
              <video ref={videoRef} className="w-full h-[320px] object-cover" muted playsInline />
              <div className="p-3 text-xs text-white/60 flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                Point camera at beacon QR or event ticket. Auto-detects type.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {qrError && (
          <div className="mt-4 flex items-start gap-2 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold">Camera error</div>
              <div className="text-red-200/80">{qrError}</div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Success States */}
      <AnimatePresence>
        {scannedBeacon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-gradient-to-br from-[#39FF14]/20 to-[#00D9FF]/20 border border-[#39FF14]/40 rounded-2xl p-8 mb-8 text-center"
          >
            <CheckCircle className="w-16 h-16 text-[#39FF14] mx-auto mb-4" />
            <h2 className="text-2xl font-black mb-2">Beacon Scanned!</h2>
            <p className="text-lg text-white/80 mb-4">
              Checked in at <span className="font-bold">{scannedBeacon?.beacon?.title || 'beacon'}</span>
            </p>
            <div className="text-4xl font-black text-[#FFEB3B]">
              +{scannedBeacon?.earned_xp ?? 0} XP
            </div>
          </motion.div>
        )}

        {scannedTicket && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className={`rounded-2xl p-8 mb-8 text-center border ${
              scannedTicket.already_checked_in 
                ? 'bg-gradient-to-br from-[#FFEB3B]/20 to-[#FF6B35]/20 border-[#FFEB3B]/40'
                : 'bg-gradient-to-br from-[#39FF14]/20 to-[#00D9FF]/20 border-[#39FF14]/40'
            }`}
          >
            {scannedTicket.already_checked_in ? (
              <>
                <AlertTriangle className="w-16 h-16 text-[#FFEB3B] mx-auto mb-4" />
                <h2 className="text-2xl font-black mb-2">Already Checked In</h2>
                <p className="text-white/80">
                  This ticket was already used at{' '}
                  <span className="font-bold">
                    {new Date(scannedTicket.rsvp?.checked_in_at).toLocaleString()}
                  </span>
                </p>
              </>
            ) : (
              <>
                <CheckCircle className="w-16 h-16 text-[#39FF14] mx-auto mb-4" />
                <h2 className="text-2xl font-black mb-2">Ticket Validated!</h2>
                <div className="flex items-center justify-center gap-2 text-white/80 mb-4">
                  <User className="w-4 h-4" />
                  <span>{scannedTicket.rsvp?.user_email}</span>
                </div>
                <div className="text-4xl font-black text-[#FFEB3B]">
                  +{scannedTicket?.awarded_xp ?? 50} XP
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs for Manual Entry */}
      {!scannedBeacon && !scannedTicket && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="bg-white/5 border border-white/10 w-full">
            <TabsTrigger 
              value="beacon" 
              className="flex-1 data-[state=active]:bg-[#FFEB3B] data-[state=active]:text-black"
            >
              <Zap className="w-4 h-4 mr-2" />
              Beacon
            </TabsTrigger>
            <TabsTrigger 
              value="ticket" 
              className="flex-1 data-[state=active]:bg-[#FF1493] data-[state=active]:text-white"
            >
              <Ticket className="w-4 h-4 mr-2" />
              Ticket
            </TabsTrigger>
          </TabsList>

          <TabsContent value="beacon" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6"
            >
              <div className="mb-6">
                <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                  Beacon ID or QR text
                </label>
                <Input
                  value={beaconId}
                  onChange={(e) => setBeaconId(e.target.value)}
                  placeholder="Paste beacon UUID, BEACON-… code, or link…"
                  className="bg-black border-white/20 text-white"
                />
              </div>

              <Button
                onClick={handleBeaconScan}
                disabled={!beaconId || scanMutation.isPending}
                className="w-full bg-[#FFEB3B] hover:bg-[#FFEB3B]/90 text-black font-bold py-6"
              >
                <Zap className="w-5 h-5 mr-2" />
                {scanMutation.isPending ? 'Scanning…' : 'Check In'}
              </Button>
            </motion.div>

            {/* Nearby Beacons */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-8"
            >
              <h2 className="text-xl font-black uppercase tracking-tight mb-4">Nearby Beacons</h2>
              <div className="space-y-3">
                {beacons.slice(0, 5).map((beacon) => (
                  <motion.button
                    key={beacon.id}
                    onClick={() => setBeaconId(beacon.id)}
                    whileHover={{ scale: 1.02 }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all text-left"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold mb-1 truncate">{beacon.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-white/60">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{beacon.city}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[#FFEB3B] font-bold">+{beacon.xp_scan || 100} XP</div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="ticket" className="mt-6">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6"
            >
              <div className="mb-4 p-3 bg-[#FF1493]/10 border border-[#FF1493]/30 rounded-lg">
                <div className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-[#FF1493]" />
                  <div>
                    <div className="font-bold text-[#FF1493]">Admin Only</div>
                    <div className="text-white/60">
                      Ticket scanning requires admin privileges. For event door staff.
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                  Event Filter (Optional)
                </label>
                <select
                  value={eventIdFilter}
                  onChange={(e) => setEventIdFilter(e.target.value)}
                  className="w-full bg-black border border-white/20 rounded-lg px-4 py-3 text-white"
                >
                  <option value="">All Events</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="text-sm text-white/60 uppercase tracking-wider mb-2 block">
                  Ticket Code
                </label>
                <Input
                  value={ticketCode}
                  onChange={(e) => setTicketCode(e.target.value)}
                  placeholder="hm1.xxxxx.xxxxx (ticket QR content)"
                  className="bg-black border-white/20 text-white font-mono"
                />
              </div>

              <Button
                onClick={handleTicketScan}
                disabled={!ticketCode || ticketMutation.isPending}
                className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-white font-bold py-6"
              >
                <Ticket className="w-5 h-5 mr-2" />
                {ticketMutation.isPending ? 'Validating…' : 'Validate Ticket'}
              </Button>
            </motion.div>

            {/* Upcoming Events */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-8"
            >
              <h2 className="text-xl font-black uppercase tracking-tight mb-4">Active Events</h2>
              <div className="space-y-3">
                {events.slice(0, 5).map((event) => (
                  <motion.button
                    key={event.id}
                    onClick={() => setEventIdFilter(event.id)}
                    whileHover={{ scale: 1.02 }}
                    className={`w-full bg-white/5 border rounded-xl p-4 hover:bg-white/10 transition-all text-left ${
                      eventIdFilter === event.id ? 'border-[#FF1493]' : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold mb-1 truncate">{event.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-white/60">
                          <Calendar className="w-4 h-4" />
                          <span className="truncate">{event.city}</span>
                        </div>
                      </div>
                      {eventIdFilter === event.id && (
                        <div className="text-[#FF1493] text-xs font-bold uppercase">
                          Selected
                        </div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      )}
    </PageShell>
  );
}