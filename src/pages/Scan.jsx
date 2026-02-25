import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/components/utils/supabaseClient';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Zap, MapPin, Camera, CheckCircle, XCircle, History, Clock, Nfc, Layers, QrCode, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageShell from '@/components/shell/PageShell';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';

export default function Scan() {
  const { currentUser } = useAuth();
  const [beaconId, setBeaconId] = useState('');
  const [scannedBeacon, setScannedBeacon] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrError, setQrError] = useState(null);
  const [scanMode, setScanMode] = useState('single'); // 'single' | 'batch'
  const [batchScans, setBatchScans] = useState([]);
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcReading, setNfcReading] = useState(false);
  const videoRef = useRef(null);
  const queryClient = useQueryClient();

  // Check NFC support
  useEffect(() => {
    if ('NDEFReader' in window) {
      setNfcSupported(true);
    }
  }, []);

  const { data: beacons = [] } = useQuery({
    queryKey: ['beacons'],
    queryFn: () => base44.entities.Beacon.filter({ active: true }),
  });

  // Fetch user's recent check-ins
  const { data: recentCheckins = [] } = useQuery({
    queryKey: ['my-checkins', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const { data, error } = await supabase
        .from('beacon_checkins')
        .select('id, beacon_id, earned_xp, created_at, beacon:beacon_id(title, city)')
        .eq('user_email', currentUser.email)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) return [];
      return data || [];
    },
    enabled: !!currentUser?.email,
  });

  const getAccessToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

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
      if (scanMode === 'batch') {
        setBatchScans(prev => [...prev, { ...payload, timestamp: new Date() }]);
        toast.success(`Scanned ${payload?.beacon?.title || 'beacon'}`);
      } else {
        setScannedBeacon(payload);
        toast.success(`Scanned ${payload?.beacon?.title || 'beacon'}`);
        setTimeout(() => {
          setScannedBeacon(null);
          setBeaconId('');
        }, 3000);
      }
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['beacon_checkins'] });
    },
    onError: (error) => {
      if (error?.status === 409) {
        toast.message('Already scanned recently');
        return;
      }
      toast.error(error?.message || 'Scan failed');
    },
  });

  const handleScan = () => {
    if (!beaconId?.trim()) return;
    scanMutation.mutate({ code: beaconId.trim(), source: 'manual' });
    if (scanMode === 'batch') setBeaconId(''); // Clear for next scan in batch mode
  };

  // NFC scanning
  const startNfcScan = async () => {
    if (!nfcSupported) {
      toast.error('NFC not supported on this device');
      return;
    }

    try {
      setNfcReading(true);
      const ndef = new window.NDEFReader();
      await ndef.scan();
      
      ndef.addEventListener('reading', ({ message }) => {
        for (const record of message.records) {
          if (record.recordType === 'text') {
            const textDecoder = new TextDecoder();
            const text = textDecoder.decode(record.data);
            scanMutation.mutate({ code: text, source: 'nfc' });
          } else if (record.recordType === 'url') {
            const textDecoder = new TextDecoder();
            const url = textDecoder.decode(record.data);
            // Extract beacon ID from URL
            const match = url.match(/beacon[\/=]([a-zA-Z0-9-]+)/i);
            if (match) {
              scanMutation.mutate({ code: match[1], source: 'nfc' });
            }
          }
        }
      });

      toast.success('Hold your phone near the NFC tag');
    } catch (error) {
      toast.error(error?.message || 'NFC scan failed');
      setNfcReading(false);
    }
  };

  const stopNfcScan = () => {
    setNfcReading(false);
  };

  const totalBatchXP = batchScans.reduce((sum, s) => sum + (s.earned_xp || 0), 0);

  const clearBatch = () => {
    setBatchScans([]);
    toast.success('Batch cleared');
  };

  const qrReader = useMemo(() => new BrowserMultiFormatReader(), []);

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
              setBeaconId(text);
              scanMutation.mutate({ code: text, source: 'qr' });
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
  }, [qrOpen, qrReader, scanMutation]);

  return (
    <PageShell
      title="Scan"
      subtitle="Scan a beacon QR code or paste a beacon ID to check in."
      maxWidth="2xl"
      back
    >
      {/* Scan Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setScanMode('single')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold uppercase text-sm flex items-center justify-center gap-2 transition-all ${
            scanMode === 'single'
              ? 'bg-[#C8962C] text-black'
              : 'bg-white/5 border border-white/20 text-white/60 hover:bg-white/10'
          }`}
        >
          <QrCode className="w-4 h-4" /> Single Scan
        </button>
        <button
          onClick={() => setScanMode('batch')}
          className={`flex-1 py-3 px-4 rounded-xl font-bold uppercase text-sm flex items-center justify-center gap-2 transition-all ${
            scanMode === 'batch'
              ? 'bg-[#00D9FF] text-black'
              : 'bg-white/5 border border-white/20 text-white/60 hover:bg-white/10'
          }`}
        >
          <Layers className="w-4 h-4" /> Batch Mode
        </button>
      </div>

      {/* Batch Mode Summary */}
      <AnimatePresence>
        {scanMode === 'batch' && batchScans.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#00D9FF]/10 border border-[#00D9FF]/30 rounded-xl p-4 mb-6 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[#00D9FF] font-black text-xl">{batchScans.length}</span>
                <span className="text-white/60 ml-2">scans collected</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {batchScans.map((scan, idx) => (
                <span key={idx} className="text-xs bg-white/10 px-2 py-1 rounded">
                  {scan.beacon?.title || 'Beacon'}
                </span>
              ))}
            </div>
            <Button onClick={clearBatch} variant="outline" size="sm" className="border-white/20">
              <RefreshCw className="w-3 h-3 mr-1" /> Clear Batch
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Scan Success */}
      {scannedBeacon && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-br from-[#39FF14]/20 to-[#00D9FF]/20 border border-[#39FF14]/40 rounded-2xl p-8 mb-8 text-center"
        >
          <CheckCircle className="w-16 h-16 text-[#39FF14] mx-auto mb-4" />
          <h2 className="text-2xl font-black mb-2">Success!</h2>
          <p className="text-lg text-white/80 mb-4">
            Scanned <span className="font-bold">{scannedBeacon?.beacon?.title || 'beacon'}</span>
          </p>
        </motion.div>
      )}

      {/* Scan Interface */}
      {!scannedBeacon && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8"
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

          <div className="flex flex-col md:flex-row gap-3">
            <Button
              onClick={handleScan}
              disabled={!beaconId || scanMutation.isPending}
              className="flex-1 bg-[#FFEB3B] hover:bg-[#FFEB3B]/90 text-black font-bold py-6"
            >
              <Zap className="w-5 h-5 mr-2" />
              {scanMutation.isPending ? 'Scanning…' : scanMode === 'batch' ? 'Add to Batch' : 'Scan'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setQrOpen((v) => !v)}
              className="border-white/20 text-white hover:bg-white/5 py-6"
            >
              <Camera className="w-5 h-5 mr-2" />
              {qrOpen ? 'Close camera' : 'Scan QR'}
            </Button>

            {nfcSupported && (
              <Button
                type="button"
                variant="outline"
                onClick={nfcReading ? stopNfcScan : startNfcScan}
                className={`border-white/20 py-6 ${nfcReading ? 'bg-[#B026FF]/20 border-[#B026FF]' : 'hover:bg-white/5'}`}
              >
                <Nfc className={`w-5 h-5 mr-2 ${nfcReading && 'animate-pulse'}`} />
                {nfcReading ? 'Scanning NFC...' : 'Tap NFC'}
              </Button>
            )}
          </div>

          {qrError ? (
            <div className="mt-4 flex items-start gap-2 text-sm text-red-200 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold">Camera error</div>
                <div className="text-red-200/80">{qrError}</div>
              </div>
            </div>
          ) : null}

          {qrOpen ? (
            <div className="mt-6 rounded-2xl overflow-hidden border border-white/10 bg-black">
              <video ref={videoRef} className="w-full h-[320px] object-cover" muted playsInline />
              <div className="p-3 text-xs text-white/60">
                Point your camera at a beacon QR code.
              </div>
            </div>
          ) : null}
        </motion.div>
      )}

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
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Scan History */}
      {recentCheckins.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8"
        >
          <h2 className="text-xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
            <History className="w-5 h-5" />
            Recent Scans
          </h2>
          <div className="space-y-2">
            {recentCheckins.map((checkin) => (
              <div
                key={checkin.id}
                className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{checkin.beacon?.title || 'Unknown Beacon'}</h3>
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(checkin.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{checkin.beacon?.city || ''}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </PageShell>
  );
}