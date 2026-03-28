/**
 * L2NotificationsSheet — Notification preferences
 */

import { useState, useEffect } from 'react';
import { Bell, MessageCircle, Calendar, ShoppingBag, Heart, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function Toggle({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-11 h-6 rounded-full transition-all relative flex-shrink-0',
        enabled ? 'bg-[#C8962C]' : 'bg-white/15'
      )}
    >
      <span className={cn(
        'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',
        enabled ? 'left-5' : 'left-0.5'
      )} />
    </button>
  );
}

const NOTIFICATION_ROWS = [
  { key: 'notif_messages', icon: MessageCircle, title: 'New Messages', desc: 'When someone sends you a message' },
  { key: 'notif_events', icon: Calendar, title: 'Events', desc: 'Upcoming events and new events nearby' },
  { key: 'notif_orders', icon: ShoppingBag, title: 'Orders', desc: 'Order updates and shipping notifications' },
  { key: 'notif_likes', icon: Heart, title: 'Profile Likes', desc: 'When someone saves your profile' },
  { key: 'notif_marketing', icon: Bell, title: 'HOTMESS News', desc: 'Updates, features, and promotions' },
];

export default function L2NotificationsSheet() {
  const [prefs, setPrefs] = useState({
    notif_messages: true,
    notif_events: true,
    notif_orders: true,
    notif_likes: false,
    notif_marketing: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      // These columns don't exist in profiles — use hardcoded defaults
      const prefs = { notif_messages: true, notif_events: true, notif_orders: true, notif_likes: true, notif_marketing: false };
      setPrefs(prefs);
      setLoading(false);
    };
    load();
  }, []);

  const set = async (key, value) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    // No-op: notification columns don't exist in profiles table
    // In production, these would be persisted to a notification_preferences table
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {saving && (
        <div className="fixed top-4 right-4 z-50 bg-[#C8962C] text-black text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> Saving...
        </div>
      )}
      <div className="px-4 pt-4 pb-6 space-y-2">
        {NOTIFICATION_ROWS.map(({ key, icon: Icon, title, desc }) => (
          <div key={key} className="bg-[#1C1C1E] rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className={cn('w-4 h-4', prefs[key] ? 'text-[#C8962C]' : 'text-white/30')} />
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-sm">{title}</p>
                <p className="text-white/40 text-xs mt-0.5">{desc}</p>
              </div>
            </div>
            <Toggle enabled={!!prefs[key]} onToggle={() => set(key, !prefs[key])} />
          </div>
        ))}
      </div>
    </div>
  );
}
