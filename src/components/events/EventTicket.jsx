import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Download, Share2, Calendar, MapPin, Clock, Ticket } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function EventTicket({ rsvp, event }) {
  const [showQR, setShowQR] = useState(false);

  const ticketData = {
    rsvp_id: rsvp.id,
    event_id: event.id,
    user_email: rsvp.user_email,
    event_title: event.title,
    timestamp: rsvp.created_date
  };

  const handleDownload = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 800;
    canvas.height = 1200;

    // Background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 800, 1200);

    // Title
    ctx.fillStyle = '#FF1493';
    ctx.font = 'bold 48px Arial';
    ctx.fillText('HOTMESS', 50, 100);

    // Event Title
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(event.title, 50, 180);

    // Event Details
    ctx.font = '20px Arial';
    ctx.fillText(format(new Date(event.event_date), 'PPP p'), 50, 240);
    ctx.fillText(event.venue_name || event.city, 50, 280);

    // QR Code
    const qrElement = document.querySelector('#ticket-qr svg');
    if (qrElement) {
      const svgData = new XMLSerializer().serializeToString(qrElement);
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 200, 400, 400, 400);
        
        // Ticket Info
        ctx.fillStyle = '#00D9FF';
        ctx.font = '16px monospace';
        ctx.fillText(`TICKET #${rsvp.id.slice(-8).toUpperCase()}`, 50, 900);
        ctx.fillText(rsvp.user_email, 50, 930);

        const link = document.createElement('a');
        link.download = `ticket-${event.title.replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL();
        link.click();
        toast.success('Ticket downloaded');
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `${event.title} Ticket`,
      text: `I'm going to ${event.title}!`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  const addToCalendar = () => {
    const startDate = new Date(event.event_date);
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000); // +3 hours

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description || ''}`,
      `LOCATION:${event.venue_name || event.city}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${event.title}.ics`;
    link.click();
    toast.success('Added to calendar');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-[#FF1493]/10 to-[#00D9FF]/10 border-2 border-[#FF1493] p-6 space-y-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Ticket className="w-6 h-6 text-[#FF1493]" />
        <h3 className="text-xl font-black uppercase">Your Ticket</h3>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#00D9FF]" />
          <span>{format(new Date(event.event_date), 'PPP p')}</span>
        </div>
        {event.venue_name && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#00D9FF]" />
            <span>{event.venue_name}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#00D9FF]" />
          <span>Status: {rsvp.status.toUpperCase()}</span>
        </div>
      </div>

      <div className="border-t-2 border-white/20 pt-4">
        <Button
          onClick={() => setShowQR(!showQR)}
          className="w-full bg-[#FF1493] hover:bg-white text-black font-black mb-2"
        >
          {showQR ? 'HIDE QR CODE' : 'SHOW QR CODE'}
        </Button>

        {showQR && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-white p-4 flex flex-col items-center"
            id="ticket-qr"
          >
            <QRCodeSVG
              value={JSON.stringify(ticketData)}
              size={200}
              level="H"
              includeMargin
            />
            <p className="text-black text-xs font-mono mt-2">
              #{rsvp.id.slice(-8).toUpperCase()}
            </p>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button
          onClick={handleDownload}
          variant="outline"
          size="sm"
          className="border-white/20 text-white hover:bg-white/10"
        >
          <Download className="w-4 h-4 mr-1" />
          Save
        </Button>
        <Button
          onClick={handleShare}
          variant="outline"
          size="sm"
          className="border-white/20 text-white hover:bg-white/10"
        >
          <Share2 className="w-4 h-4 mr-1" />
          Share
        </Button>
        <Button
          onClick={addToCalendar}
          variant="outline"
          size="sm"
          className="border-white/20 text-white hover:bg-white/10"
        >
          <Calendar className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>
    </motion.div>
  );
}