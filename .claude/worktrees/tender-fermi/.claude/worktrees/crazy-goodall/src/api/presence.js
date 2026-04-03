import { supabase } from '@/components/utils/supabaseClient';

export async function updatePresence({ lat, lng, accuracy, heading, speed }) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const res = await fetch('/api/presence/update', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ lat, lng, accuracy, heading, speed }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Presence update failed (${res.status}): ${text}`);
  }

  return res.json();
}
