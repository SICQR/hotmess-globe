/**
 * L2PrivacySheet — Privacy Settings
 * Controls profile visibility, who can message, read receipts etc.
 */

import { useState, useEffect } from 'react';
import { Eye, MessageCircle, Bell, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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

const DEFAULT_PREFS = {
  is_visible: true,
  show_distance: true,
  allow_messages_from: 'everyone', // 'everyone' | 'matches' | 'nobody'
  read_receipts: true,
  location_precision: 'approximate', // 'exact' | 'approximate' | 'hidden'
  show_online_status: true,
};

export default function L2PrivacySheet() {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('profiles')
        .select('is_visible, show_distance, allow_messages_from, read_receipts, location_precision, show_online_status')
        .eq('id', user.id)
        .single();
      if (data) {
        setPrefs(prev => ({ ...prev, ...Object.fromEntries(Object.entries(data).filter(([, v]) => v != null)) }));
      }
      setLoading(false);
    };
    load();
  }, []);

  const set = (key, value) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    save(updated);
  };

  const save = async (updated) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('profiles').update(updated).eq('id', user.id);
    } catch {
      toast.error('Failed to save setting');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  const rows = [
    {
      icon: Eye,
      title: 'Visible on Ghosted',
      desc: 'Others can find and view your profile',
      key: 'is_visible',
    },
    {
      icon: MapPin,
      title: 'Show Distance',
      desc: 'Show approximate distance on your card',
      key: 'show_distance',
    },
    {
      icon: MessageCircle,
      title: 'Read Receipts',
      desc: 'Let others know when you\'ve read their message',
      key: 'read_receipts',
    },
    {
      icon: Bell,
      title: 'Show Online Status',
      desc: 'Display when you\'re actively using the app',
      key: 'show_online_status',
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {saving && (
        <div className="fixed top-4 right-4 z-50 bg-[#C8962C] text-black text-xs font-black px-3 py-1.5 rounded-full flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> Saving...
        </div>
      )}

      <div className="px-4 pt-4 pb-6 space-y-3">
        {rows.map(({ icon: Icon, title, desc, key }) => (
          <div key={key} className="bg-[#1C1C1E] rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className={cn('w-4 h-4', prefs[key] ? 'text-[#C8962C]' : 'text-white/30')} />
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-sm">{title}</p>
                <p className="text-white/40 text-xs mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
            <Toggle enabled={!!prefs[key]} onToggle={() => set(key, !prefs[key])} />
          </div>
        ))}

        {/* Messages from */}
        <div className="bg-[#1C1C1E] rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-[#C8962C]" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Accept messages from</p>
              <p className="text-white/40 text-xs">Who can send you a message</p>
            </div>
          </div>
          <div className="flex gap-2">
            {['everyone', 'matches', 'nobody'].map(opt => (
              <button
                key={opt}
                onClick={() => set('allow_messages_from', opt)}
                className={cn(
                  'flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all',
                  prefs.allow_messages_from === opt
                    ? 'bg-[#C8962C] text-black'
                    : 'bg-white/8 text-white/50'
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
