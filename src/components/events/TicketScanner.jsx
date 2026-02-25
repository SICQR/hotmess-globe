import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Camera, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { supabase } from '@/components/utils/supabaseClient';

export default function TicketScanner({ event, onClose }) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const videoRef = useRef(null);
  const [qrError, setQrError] = useState(null);
  const qrReader = useMemo(() => new BrowserMultiFormatReader(), []);
  const controlsRef = useRef(null);

  const getAccessToken = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const stopScanning = () => {
    try {
      controlsRef.current?.stop?.();
    } catch {
      // ignore
    }
    controlsRef.current = null;
    try {
      qrReader.reset?.();
    } catch {
      // ignore
    }
    setScanning(false);
  };

  const redeemTicket = async (ticket) => {
    const token = await getAccessToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch('/api/scan/redeem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ticket, event_id: event?.id }),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = payload?.error || payload?.details || 'Redeem failed';
      const err = new Error(message);
      err.status = res.status;
      err.payload = payload;
      throw err;
    }

    return payload;
  };

  const startScanning = async () => {
    setQrError(null);
    setResult(null);

    const video = videoRef.current;
    if (!video) {
      setQrError('Camera not ready');
      return;
    }

    try {
      setScanning(true);
      controlsRef.current = await qrReader.decodeFromVideoDevice(undefined, video, async (scanResult, error) => {
        if (scanResult) {
          const text = scanResult.getText?.() || String(scanResult);
          stopScanning();

          try {
            const redeemed = await redeemTicket(text);

            if (redeemed?.already_checked_in) {
              setResult({
                status: 'warning',
                message: 'Already checked in',
                user: redeemed?.rsvp?.user_email,
                time: redeemed?.rsvp?.checked_in_at,
              });
              toast.message('Already checked in');
              return;
            }

            setResult({
              status: 'success',
              message: 'Check-in successful',
              user: redeemed?.rsvp?.user_email,
            });
            toast.success('Ticket verified');
          } catch (err) {
            setResult({ status: 'error', message: err?.message || 'Invalid ticket' });
            toast.error(err?.message || 'Verification failed');
          }
        }

        // NotFoundException is expected when nothing is in view.
        if (error && error.name !== 'NotFoundException') {
          // Keep quiet.
        }
      });
    } catch (e) {
      setQrError(e?.message || 'Failed to start camera');
      setScanning(false);
    }
  };

  const manualEntry = async () => {
    const ticket = prompt('Paste ticket QR payload:');
    if (!ticket) return;

    try {
      const redeemed = await redeemTicket(ticket);
      if (redeemed?.already_checked_in) {
        setResult({
          status: 'warning',
          message: 'Already checked in',
          user: redeemed?.rsvp?.user_email,
          time: redeemed?.rsvp?.checked_in_at,
        });
        toast.message('Already checked in');
        return;
      }

      setResult({
        status: 'success',
        message: 'Check-in successful',
        user: redeemed?.rsvp?.user_email,
      });
      toast.success('Ticket verified');
    } catch (err) {
      setResult({ status: 'error', message: err?.message || 'Invalid ticket' });
      toast.error(err?.message || 'Verification failed');
    }
  };

  useEffect(() => {
    return () => stopScanning();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-black border-2 border-white w-full max-w-md"
      >
        <div className="p-6 border-b-2 border-white/20">
          <h2 className="text-2xl font-black uppercase">TICKET SCANNER</h2>
          <p className="text-xs text-white/60 uppercase mt-1">{event.title}</p>
        </div>

        <div className="p-6 space-y-4">
          {!scanning && !result && (
            <div className="space-y-4">
              <Button
                onClick={startScanning}
                className="w-full bg-[#C8962C] hover:bg-white text-black font-black py-6"
              >
                <Camera className="w-5 h-5 mr-2" />
                START SCANNING
              </Button>
              <Button
                onClick={manualEntry}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                MANUAL ENTRY
              </Button>
            </div>
          )}

          {scanning && (
            <div className="space-y-4">
              <div className="relative aspect-square bg-black border-2 border-white/20 overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                />
                <div className="absolute inset-0 border-4 border-[#00D9FF] m-12 pointer-events-none" />
              </div>
              <p className="text-center text-sm text-white/60 uppercase">
                Position QR code within frame
              </p>
              {qrError ? (
                <p className="text-center text-xs text-red-200">{qrError}</p>
              ) : null}
              <Button
                onClick={stopScanning}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                STOP
              </Button>
            </div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-6 border-2 ${
                result.status === 'success' 
                  ? 'bg-[#00D9FF]/10 border-[#00D9FF]' 
                  : result.status === 'warning'
                  ? 'bg-[#FFEB3B]/10 border-[#FFEB3B]'
                  : 'bg-[#FF073A]/10 border-[#FF073A]'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                {result.status === 'success' && <CheckCircle className="w-6 h-6 text-[#00D9FF]" />}
                {result.status === 'warning' && <AlertCircle className="w-6 h-6 text-[#FFEB3B]" />}
                {result.status === 'error' && <XCircle className="w-6 h-6 text-[#FF073A]" />}
                <span className="font-black uppercase">{result.message}</span>
              </div>
              {result.user && (
                <p className="text-sm text-white/60">{result.user}</p>
              )}
              {result.time && (
                <p className="text-sm text-white/60 mt-1">
                  First check-in: {new Date(result.time).toLocaleTimeString()}
                </p>
              )}
              <Button
                onClick={() => setResult(null)}
                className="w-full mt-4 bg-white text-black hover:bg-white/90 font-black"
              >
                SCAN NEXT
              </Button>
            </motion.div>
          )}
        </div>

        <div className="p-4 border-t-2 border-white/20">
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full text-white/60 hover:text-white hover:bg-white/10"
          >
            CLOSE
          </Button>
        </div>
      </motion.div>
    </div>
  );
}