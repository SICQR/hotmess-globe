/**
 * L2CreateEventSheet — Create a new event
 * Writes to the beacons table with kind='event'.
 */

import { useState } from 'react';
import { Calendar, MapPin, Users, Image as ImageIcon, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Render a sheet UI for creating a new event and saving it to the `beacons` table with `kind: 'event'`.
 *
 * Validates required fields, gathers form data (title, description, venue, start/end times, capacity, price, image),
 * associates the record with the current user (promoter and owner email), writes the new beacon/event, shows success or error toasts,
 * invalidates the events query cache, and closes the sheet on success.
 *
 * @returns {JSX.Element} The component's rendered JSX element.
 */
export default function L2CreateEventSheet() {
  const { closeSheet } = useSheet();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    venue: '',
    starts_at: '',
    ends_at: '',
    max_attendees: '',
    image_url: '',
    is_free: true,
    price: '',
  });

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleSave = async () => {
    if (!form.title.trim()) return toast.error('Event name required');
    if (!form.starts_at) return toast.error('Start time required');

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Please log in to create events');

      const { error } = await supabase.from('beacons').insert({
        title: form.title.trim(),
        description: form.description.trim() || null,
        venue_name: form.venue.trim() || null,
        starts_at: form.starts_at,
        end_at: form.ends_at || null,
        capacity: form.max_attendees ? parseInt(form.max_attendees) : null,
        image_url: form.image_url || null,
        ticket_price_cents: form.is_free ? 0 : Math.round((parseFloat(form.price) || 0) * 100),
        promoter_id: user.id,
        owner_email: user.email,
        kind: 'event',
        type: 'event',
        status: 'active',
        active: true,
      });

      if (error) throw error;
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['events-mode'] });
      setTimeout(() => closeSheet(), 1200);
    } catch (err) {
      toast.error(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Title */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">
            Event Name *
          </label>
          <input
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="What's happening?"
            maxLength={80}
            className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C8962C]/60"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Tell people what to expect..."
            rows={3}
            maxLength={500}
            className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 text-sm resize-none focus:outline-none focus:border-[#C8962C]/60"
          />
        </div>

        {/* Venue */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">
            Venue / Location
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={form.venue}
              onChange={e => set('venue', e.target.value)}
              placeholder="Club name, address, city..."
              className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C8962C]/60"
            />
          </div>
        </div>

        {/* Start / End time */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">
              Starts *
            </label>
            <input
              type="datetime-local"
              value={form.starts_at}
              onChange={e => set('starts_at', e.target.value)}
              className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-[#C8962C]/60 [color-scheme:dark]"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">
              Ends
            </label>
            <input
              type="datetime-local"
              value={form.ends_at}
              onChange={e => set('ends_at', e.target.value)}
              className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-[#C8962C]/60 [color-scheme:dark]"
            />
          </div>
        </div>

        {/* Capacity */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">
            Max Attendees
          </label>
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="number"
              value={form.max_attendees}
              onChange={e => set('max_attendees', e.target.value)}
              placeholder="Leave blank for unlimited"
              min="1"
              className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C8962C]/60"
            />
          </div>
        </div>

        {/* Free / Paid */}
        <div className="bg-[#1C1C1E] rounded-2xl p-4">
          <div className="flex gap-2 mb-3">
            {[true, false].map(isFree => (
              <button
                key={String(isFree)}
                onClick={() => set('is_free', isFree)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  form.is_free === isFree
                    ? 'bg-[#C8962C] text-black'
                    : 'bg-white/8 text-white/50'
                }`}
              >
                {isFree ? 'Free Entry' : 'Ticketed'}
              </button>
            ))}
          </div>
          {!form.is_free && (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">£</span>
              <input
                type="number"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                placeholder="Ticket price"
                min="0"
                step="0.01"
                className="w-full bg-black/30 border border-white/10 rounded-xl pl-7 pr-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C8962C]/60"
              />
            </div>
          )}
        </div>

        {/* Image URL */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">
            Cover Image URL
          </label>
          <div className="relative">
            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={form.image_url}
              onChange={e => set('image_url', e.target.value)}
              placeholder="https://..."
              className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#C8962C]/60"
            />
          </div>
        </div>

      </div>

      <div className="px-4 py-4 border-t border-white/8">
        <button
          onClick={handleSave}
          disabled={!form.title.trim() || !form.starts_at || loading}
          className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
            saved
              ? 'bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/30'
              : form.title.trim() && form.starts_at
                ? 'bg-[#C8962C] text-black active:scale-95'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
          }`}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
            : saved
              ? <><CheckCircle className="w-4 h-4" /> Created!</>
              : <><Calendar className="w-4 h-4" /> Create Event</>}
        </button>
      </div>
    </div>
  );
}
