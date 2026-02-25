/**
 * L2EditProfileSheet — Edit your profile
 *
 * Updates: display_name, bio, location, avatar, visibility.
 * Writes via updateProfile() from the profiles data layer.
 */

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { updateProfile } from '@/lib/data';
import { Camera, Loader2, CheckCircle, Eye, EyeOff, MapPin, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSheet } from '@/contexts/SheetContext';
import { cn } from '@/lib/utils';

export default function L2EditProfileSheet({ profile: initialProfile }) {
  const { closeSheet } = useSheet();
  const avatarInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    display_name: '',
    bio: '',
    location: '',
    avatar_url: '',
    is_visible: true,
  });

  // Load current profile on mount
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('display_name, bio, location, avatar_url, is_visible')
        .eq('id', user.id)
        .single();

      if (data) {
        setForm({
          display_name: data.display_name || '',
          bio: data.bio || '',
          location: data.location || '',
          avatar_url: data.avatar_url || '',
          is_visible: data.is_visible !== false,
        });
      }
    };
    load();
  }, []);

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const uploadAvatar = async (file) => {
    setAvatarUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const ext = file.name.split('.').pop();
      const path = `avatars/${user.id}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('uploads').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('uploads').getPublicUrl(path);
      set('avatar_url', publicUrl);
      toast.success('Photo updated');
    } catch (err) {
      toast.error('Photo upload failed');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.display_name.trim()) return toast.error('Display name required');

    setLoading(true);
    try {
      const result = await updateProfile({
        display_name: form.display_name.trim(),
        bio: form.bio.trim() || undefined,
        location: form.location.trim() || undefined,
        avatar_url: form.avatar_url || undefined,
        is_visible: form.is_visible,
      });

      if (result) {
        setSaved(true);
        setTimeout(() => {
          closeSheet();
        }, 1200);
      } else {
        toast.error('Failed to save profile');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3 py-2">
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="relative group"
          >
            <div className="w-24 h-24 rounded-full overflow-hidden bg-white/10 border-2 border-white/20">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-10 h-10 text-white/30" />
                </div>
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              {avatarUploading
                ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                : <Camera className="w-6 h-6 text-white" />}
            </div>
            {/* Amber ring on hover */}
            <div className="absolute -inset-1 rounded-full border-2 border-[#C8962C] opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <p className="text-white/30 text-xs">Tap to change photo</p>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) uploadAvatar(file);
              e.target.value = '';
            }}
          />
        </div>

        {/* Display Name */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">
            Display Name *
          </label>
          <input
            value={form.display_name}
            onChange={e => set('display_name', e.target.value)}
            placeholder="How you appear to others"
            maxLength={40}
            className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-[#C8962C]/60 text-sm"
          />
          <p className="text-white/20 text-[10px] text-right mt-1">{form.display_name.length}/40</p>
        </div>

        {/* Bio */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">
            Bio
          </label>
          <textarea
            value={form.bio}
            onChange={e => set('bio', e.target.value)}
            placeholder="Tell people a little about yourself..."
            rows={3}
            maxLength={300}
            className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-[#C8962C]/60 text-sm resize-none"
          />
          <p className="text-white/20 text-[10px] text-right mt-1">{form.bio.length}/300</p>
        </div>

        {/* Location */}
        <div>
          <label className="text-xs uppercase tracking-widest text-white/40 font-black block mb-2">
            City
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="London, Berlin, Amsterdam..."
              maxLength={60}
              className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-[#C8962C]/60 text-sm"
            />
          </div>
        </div>

        {/* Visibility */}
        <div className="bg-[#1C1C1E] rounded-2xl border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {form.is_visible
                ? <Eye className="w-5 h-5 text-[#C8962C]" />
                : <EyeOff className="w-5 h-5 text-white/40" />}
              <div>
                <p className="text-white font-bold text-sm">
                  {form.is_visible ? 'Visible on Ghosted' : 'Hidden from Ghosted'}
                </p>
                <p className="text-white/40 text-xs mt-0.5">
                  {form.is_visible
                    ? 'Others can find and message you'
                    : 'You\'re in ghost mode — invisible to others'}
                </p>
              </div>
            </div>
            <button
              onClick={() => set('is_visible', !form.is_visible)}
              className={cn(
                'w-12 h-6 rounded-full transition-all relative flex-shrink-0',
                form.is_visible ? 'bg-[#C8962C]' : 'bg-white/20'
              )}
            >
              <span className={cn(
                'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',
                form.is_visible ? 'left-6' : 'left-0.5'
              )} />
            </button>
          </div>
        </div>

      </div>

      {/* Sticky Save */}
      <div className="px-4 py-4 border-t border-white/10 bg-black/80">
        <Button
          onClick={handleSave}
          disabled={!form.display_name.trim() || loading || avatarUploading}
          className={cn(
            'w-full py-4 font-black uppercase tracking-wide rounded-2xl text-sm transition-all',
            saved
              ? 'bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/30'
              : form.display_name.trim()
                ? 'bg-[#C8962C] text-black hover:bg-[#D4A84B]'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
          )}
        >
          {loading
            ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving...</span>
            : saved
              ? <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Saved!</span>
              : 'Save Profile'}
        </Button>
      </div>
    </div>
  );
}
