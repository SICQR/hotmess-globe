import { Car, MessageCircle, Shield } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

// Build Uber deep link
function buildUberDeepLink({ dropoffLat, dropoffLng, dropoffNickname }) {
  const params = new URLSearchParams({
    action: 'setPickup',
    pickup: 'my_location',
    'dropoff[latitude]': dropoffLat,
    'dropoff[longitude]': dropoffLng,
    'dropoff[nickname]': dropoffNickname || 'Destination',
  });
  return `uber://?${params}`;
}

export default function L2UberSheet({ lat, lng, label, travelTimes, profileUser }) {
  const etaMins = travelTimes?.uber ? Math.round(travelTimes.uber.durationSeconds / 60) : null;
  const uberUrl = lat && lng ? buildUberDeepLink({ dropoffLat: lat, dropoffLng: lng, dropoffNickname: label }) : null;

  const handleBookUber = () => {
    if (!uberUrl) return;

    // 1. Try deep link
    window.location.href = uberUrl;

    // 2. Fallback to web after a short delay if deep link didn't work
    // (Note: This is the standard "App vs Web" detection trick)
    setTimeout(() => {
      const webParams = new URLSearchParams({
        action: 'setPickup',
        pickup: 'my_location',
        'dropoff[latitude]': lat,
        'dropoff[longitude]': lng,
        'dropoff[nickname]': label || 'Destination',
      });
      window.open(`https://m.uber.com/?${webParams}`, '_blank');
    }, 500);
  };

  const handleSendETA = async () => {
    try {
      let { data: { user } } = await supabase.auth.getUser();
      if (!profileUser?.id) { toast.error('No recipient'); return; }
      const { data: thread } = await supabase.from('chat_threads')
        .select('id, participant_emails')
        .contains('participant_emails', [user.email, profileUser.email])
        .limit(1).maybeSingle();
      
      if (thread) {
        await supabase.from('chat_messages').insert({
          thread_id: thread.id,
          sender_email: user.email,
          message_type: 'uber_eta_share',
          content: `🚗 On my way! Estimated arrival: ${etaMins ?? '?'} min (Uber)`,
          created_date: new Date().toISOString(),
          metadata: { mode: 'uber', eta_seconds: travelTimes?.uber?.durationSeconds, dest_lat: lat, dest_lng: lng },
        });
        toast.success('ETA sent!');
      } else {
        toast.error('No chat thread found');
      }
    } catch { toast.error('Could not send ETA'); }
  };

  return (
    <div className="flex flex-col px-4 pt-6 pb-8 gap-4">
      <div>
        <h2 className="text-xl font-black text-white">Get there safely</h2>
        {label && <p className="text-white/40 text-sm mt-0.5">→ {label}</p>}
        {etaMins && <p className="text-white/60 text-sm mt-1">~{etaMins} min by Uber</p>}
      </div>

      <button onClick={handleBookUber}
        className="w-full py-4 bg-[#C8962C] text-black font-black rounded-2xl flex items-center justify-center gap-2 text-lg">
        <Car className="w-5 h-5" />
        Book Uber
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-white/30 text-xs">then share your ride</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <button onClick={handleSendETA}
        className="w-full py-3.5 bg-white/8 border border-white/15 rounded-2xl flex items-center justify-center gap-2 text-white font-bold">
        <MessageCircle className="w-4 h-4 text-white/50" />
        Send ETA to chat
      </button>
      <p className="text-white/25 text-xs text-center -mt-2">Sends "{etaMins ?? '?'} min away by Uber" as a message</p>

      <div className="mt-2 p-3 bg-[#C8962C]/8 border border-[#C8962C]/20 rounded-xl flex gap-2">
        <Shield className="w-4 h-4 text-[#C8962C] shrink-0 mt-0.5" />
        <p className="text-white/50 text-xs leading-relaxed">Share your trip so someone knows where you're headed. SOS is always one press away.</p>
      </div>
    </div>
  );
}

