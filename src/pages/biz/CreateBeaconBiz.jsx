import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

export default function CreateBeaconBiz() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !startsAt) {
      toast.error('Title and start time required');
      return;
    }
    setSaving(true);
    try {
      let { data: { user } } = await supabase.auth.getUser();
      await supabase.from('beacons').insert({
        owner_id: user.id,
        type: 'event',
        title,
        description: description || null,
        starts_at: startsAt,
        ends_at: endsAt || null,
        latitude: lat ? parseFloat(lat) : null,
        longitude: lng ? parseFloat(lng) : null,
        city: 'london',
        city_slug: 'london',
        active: true,
        redirect_url: ticketUrl || null,
        event_start_at: startsAt,
        event_end_at: endsAt || null,
      });
      toast.success('Event beacon created!');
      navigate('/biz/dashboard');
    } catch (err) {
      console.error('Error:', err);
      toast.error('Could not create beacon');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full px-4 pt-6 pb-8 overflow-y-auto bg-[#050507]">
      <h1 className="text-xl font-black text-white mb-6">Create Event Beacon</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { label: 'Event Title *', value: title, set: setTitle, placeholder: 'HOTMESS presents...', type: 'text' },
          { label: 'Start Time *', value: startsAt, set: setStartsAt, placeholder: '', type: 'datetime-local' },
          { label: 'End Time', value: endsAt, set: setEndsAt, placeholder: '', type: 'datetime-local' },
          { label: 'Ticket URL', value: ticketUrl, set: setTicketUrl, placeholder: 'https://ra.co/...', type: 'url' },
          { label: 'Latitude', value: lat, set: setLat, placeholder: '51.5074', type: 'number' },
          { label: 'Longitude', value: lng, set: setLng, placeholder: '-0.1278', type: 'number' },
        ].map(({ label, value, set, placeholder, type }) => (
          <div key={label}>
            <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">{label}</label>
            <input
              type={type}
              value={value}
              onChange={e => set(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white outline-none focus:border-[#C8962C]/50"
            />
          </div>
        ))}
        <div>
          <label className="text-white/50 text-xs uppercase tracking-wider mb-2 block">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Event description..."
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white outline-none focus:border-[#C8962C]/50 resize-none"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full py-4 bg-[#C8962C] text-black font-black rounded-2xl disabled:opacity-50 mt-4"
        >
          {saving ? 'Creating...' : 'Create Beacon'}
        </button>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-full py-3 text-white/40 text-sm"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}

