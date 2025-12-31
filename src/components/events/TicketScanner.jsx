import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Camera, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function TicketScanner({ event, onClose }) {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setScanning(true);
      scanQRCode();
    } catch (error) {
      toast.error('Camera access denied');
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setScanning(false);
  };

  const scanQRCode = () => {
    if (!scanning || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // In production, use a QR code detection library like jsQR
    // For now, this is a placeholder for the scanning logic
    
    requestAnimationFrame(scanQRCode);
  };

  const verifyTicket = async (ticketData) => {
    try {
      const data = JSON.parse(ticketData);
      
      // Verify this ticket is for this event
      if (data.event_id !== event.id) {
        setResult({ status: 'error', message: 'Wrong event' });
        return;
      }

      // Check if RSVP exists
      const rsvps = await base44.entities.EventRSVP.filter({
        id: data.rsvp_id,
        event_id: event.id,
        user_email: data.user_email
      });

      if (rsvps.length === 0) {
        setResult({ status: 'error', message: 'Invalid ticket' });
        return;
      }

      const rsvp = rsvps[0];

      // Check if already scanned
      if (rsvp.checked_in) {
        setResult({ 
          status: 'warning', 
          message: 'Already checked in',
          time: rsvp.check_in_time
        });
        return;
      }

      // Mark as checked in
      await base44.entities.EventRSVP.update(rsvp.id, {
        checked_in: true,
        check_in_time: new Date().toISOString()
      });

      // Award XP
      const user = await base44.entities.User.filter({ email: data.user_email });
      if (user[0]) {
        await base44.entities.User.update(user[0].id, {
          xp: (user[0].xp || 0) + 50
        });
      }

      setResult({ 
        status: 'success', 
        message: 'Check-in successful',
        user: data.user_email
      });

      toast.success('Ticket verified');
    } catch (error) {
      setResult({ status: 'error', message: 'Invalid QR code' });
    }
  };

  const manualEntry = async () => {
    const ticketId = prompt('Enter ticket ID:');
    if (!ticketId) return;

    try {
      const rsvps = await base44.entities.EventRSVP.filter({ event_id: event.id });
      const rsvp = rsvps.find(r => r.id.includes(ticketId.toLowerCase()));

      if (!rsvp) {
        toast.error('Ticket not found');
        return;
      }

      await verifyTicket(JSON.stringify({
        rsvp_id: rsvp.id,
        event_id: event.id,
        user_email: rsvp.user_email
      }));
    } catch (error) {
      toast.error('Verification failed');
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
                className="w-full bg-[#FF1493] hover:bg-white text-black font-black py-6"
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
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 border-4 border-[#00D9FF] m-12 pointer-events-none" />
              </div>
              <p className="text-center text-sm text-white/60 uppercase">
                Position QR code within frame
              </p>
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