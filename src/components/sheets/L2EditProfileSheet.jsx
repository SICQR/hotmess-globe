/**
 * L2EditProfileSheet — Grindr-style all-in-one profile editor
 *
 * All fields in one scrollable sheet:
 *   • Profile photo (large, tappable → upload)
 *   • Display name
 *   • Bio / About me
 *   • Age
 *   • Pronouns (pill selector)
 *   • Area / Location
 *   • Instagram handle + SoundCloud URL
 *   • Membership tier (display + upgrade button)
 *
 * Save button at top-right → saves all in one call → shows confirmation → closes
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { uploadToStorage } from '@/lib/uploadToStorage';
import { useSheet } from '@/contexts/SheetContext';
import { useQueryClient } from '@tanstack/react-query';
import {
  Camera, Loader2, CheckCircle, User, MapPin,
  Instagram, Music, Crown, ChevronRight, Plus, Check
} from 'lucide-react';
import { usePersona } from '@/contexts/PersonaContext';
import { toast } from 'sonner';

const AMBER = '#C8962C';
const PRONOUNS = ['He/Him', 'She/Her', 'They/Them', 'He/They', 'She/They', 'Any'];

// ── helpers ────────────────────────────────────────────────────────────────────

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

function FieldLabel({ children }) {
  return (
    <label className="text-[10px] uppercase tracking-[0.14em] font-black text-white/40 block mb-2">
      {children}
    </label>
  );
}

function Field({ children, className = '' }) {
  return <div className={cn('mb-5', className)}>{children}</div>;
}

function TextInput({ value, onChange, placeholder, maxLength, type = 'text', ...rest }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={maxLength}
      className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#C8962C]/60 text-sm transition-colors"
      {...rest}
    />
  );
}

function TextArea({ value, onChange, placeholder, maxLength, rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={maxLength}
      rows={rows}
      className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#C8962C]/60 text-sm transition-colors resize-none"
    />
  );
}

function PronounPills({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRONOUNS.map(p => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(value === p ? '' : p)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
            value === p
              ? 'bg-[#C8962C] text-black border-[#C8962C]'
              : 'bg-white/5 text-white/50 border-white/10 active:bg-white/10'
          )}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function L2EditProfileSheet() {
  const { closeSheet, openSheet } = useSheet();
  const { personas, activePersona, loadPersonas, switchPersona, isLoading: personaLoading } = usePersona();
  const queryClient = useQueryClient();
  const avatarInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [userId, setUserId] = useState(null);

  // Form state
  const [avatarUrl, setAvatarUrl] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [age, setAge] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [location, setLocation] = useState('');
  const [instagram, setInstagram] = useState('');
  const [soundcloud, setSoundcloud] = useState('');
  const [membershipTier, setMembershipTier] = useState('MESS — Free');
  const [locationConsent, setLocationConsent] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  // ── Load ─────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        setUserId(user.id);

        // 1. Try fetching everything
        let { data: p, error: pErr } = await supabase
          .from('profiles')
          .select('display_name, bio, location, avatar_url, age, public_attributes, membership_tier, location_consent, location_consent_at')
          .eq('id', user.id)
          .maybeSingle();

        // 2. Fallback if the above failed (likely due to missing columns in DB)
        if (pErr) {
          console.warn('[EditProfile] Advanced fetch failed, trying basic...', pErr.message);
          const { data: basic } = await supabase
            .from('profiles')
            .select('display_name, bio, location, avatar_url, membership_tier, profile_type, business_type')
            .eq('id', user.id)
            .maybeSingle();
          p = basic;
        }

        if (p) {
          setDisplayName(p.display_name || '');
          setBio(p.bio || '');
          setLocation(p.location || '');
          setAvatarUrl(p.avatar_url || '');
          setAge(p.age ? String(p.age) : '');
          
          let tier = p.membership_tier || p.subscription_tier || p.profile_type || 'MESS';
          if (tier.toLowerCase().startsWith('mess — ')) tier = tier.split(' — ')[1];
          setMembershipTier(tier.toUpperCase());

          // Social links/Attributes
          const pa = p.public_attributes || {};
          const social = pa.social_links || {};
          setInstagram(social.instagram || pa.instagram || '');
          setSoundcloud(social.soundcloud || pa.soundcloud || '');
          setPronouns(pa.pronouns || '');
          setLocationConsent(p.location_consent || false);
          setLastSync(p.location_consent_at || null);
        }

        // 3. Try private profile for pronouns if not found
        supabase.from('user_private_profile')
          .select('pronouns')
          .eq('auth_user_id', user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (data?.pronouns) setPronouns(data.pronouns);
          });

      } catch (err) {
        console.error('[EditProfileSheet] load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
    if (userId) loadPersonas(userId);
  }, [userId]);

  // ── Avatar upload ─────────────────────────────────────────────────────────────

  const handleAvatarChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    e.target.value = '';

    setAvatarUploading(true);
    const toastId = toast.loading('Uploading photo...');
    try {
      const publicUrl = await uploadToStorage(file, 'avatars', userId);

      // Persist to profiles + profile_photos
      await Promise.allSettled([
        supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId),
        supabase.from('profile_photos').upsert(
          { user_id: userId, profile_id: userId, url: publicUrl, position: 0, is_avatar: true },
          { onConflict: 'user_id,position' }
        ),
      ]);

      setAvatarUrl(publicUrl);
      toast.success('Photo updated ✅', { id: toastId });
      // Invalidate so Ghosted grid reflects the change immediately
      await queryClient.invalidateQueries({ queryKey: ['profiles'] });
    } catch (err) {
      toast.error(err?.message || 'Photo upload failed', { id: toastId });
    } finally {
      setAvatarUploading(false);
    }
  }, [userId, queryClient]);

  // ── Save ──────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!userId) return;
    const trimmedName = displayName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      toast.error('Display name must be at least 2 characters');
      return;
    }

    setSaving(true);
    try {
      const ageNum = age ? parseInt(age, 10) : null;
      const locationVal = location.trim() || null;

      // Merge existing public_attributes so we don't wipe fields we don't manage here
      const { data: existing } = await supabase
        .from('profiles')
        .select('public_attributes, social_links')
        .eq('id', userId)
        .maybeSingle();

      const pa = existing?.public_attributes || {};
      const updatedPa = {
        ...pa,
        ...(pronouns ? { pronouns } : {}),
        social_links: {
          ...(pa.social_links || {}),
          ...(instagram.trim() ? { instagram: instagram.trim() } : {}),
          ...(soundcloud.trim() ? { soundcloud: soundcloud.trim() } : {}),
        },
      };

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: trimmedName,
          bio: bio.trim() || null,
          location: locationVal,
          city: locationVal,
          ...(ageNum && ageNum > 0 ? { age: ageNum } : {}),
          public_attributes: updatedPa,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      // Save pronouns to private profile (optional — non-fatal if table doesn't exist)
      if (pronouns) {
        await supabase
          .from('user_private_profile')
          .upsert(
            { auth_user_id: userId, pronouns, updated_at: new Date().toISOString() },
            { onConflict: 'auth_user_id' }
          )
          .then(null, () => { }); // silent fail
      }

      // Invalidate all profile caches so Ghosted grid updates immediately
      await queryClient.invalidateQueries({ queryKey: ['profiles'] });
      await queryClient.invalidateQueries({ queryKey: ['profile-mode-current'] });
      await queryClient.invalidateQueries({ queryKey: ['control-deck-you'] });

      setSaved(true);
      toast.success('Profile updated ✅');
      setTimeout(() => closeSheet(), 1200);
    } catch (err) {
      toast.error(err?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }, [userId, displayName, bio, age, pronouns, location, instagram, soundcloud, queryClient, closeSheet]);

  const handleLocationToggle = async () => {
    if (!userId) return;
    const newState = !locationConsent;
    setLocationConsent(newState);

    try {
      const update = { 
        location_consent: newState,
        updated_at: new Date().toISOString()
      };

      if (!newState) {
        // Clear coordinates when turning OFF
        update.last_lat = null;
        update.last_lng = null;
        update.location = null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(update)
        .eq('id', userId);

      if (error) throw error;
      
      if (newState) {
        toast.success('Location sharing enabled');
        // Trigger an immediate browser GPS lock to populate last_lat/lng
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            console.log('[EditProfile] 📍 Initial lock success after toggle');
            // useGPS will pick this up via the 'sync-location' event or interval
            window.dispatchEvent(new CustomEvent('sync-location', { detail: pos }));
          },
          (err) => console.warn('[EditProfile] ⚠️ Initial lock failed:', err.message),
          { enableHighAccuracy: false, timeout: 5000 }
        );
      } else {
        toast('Location sharing disabled');
      }
      
      await queryClient.invalidateQueries({ queryKey: ['profiles'] });
    } catch (err) {
      setLocationConsent(!newState); // revert on error
      toast.error('Could not update location settings');
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Top save bar */}
      {/* Header handled by Sheet parent, but let's keep a nice padding or subhead if needed */}
      <div className="flex items-center justify-center px-4 py-1.5 opacity-20">
        <div className="w-12 h-1 rounded-full bg-white" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Photo ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-3 pt-6 pb-5 border-b border-white/6">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUploading}
            className="relative group"
            aria-label="Change profile photo"
          >
            {/* Avatar */}
            <div className="w-28 h-28 rounded-full overflow-hidden bg-white/8 border-2 border-white/15 group-hover:border-[#C8962C]/60 transition-colors">
              {avatarUrl
                ? <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><User className="w-12 h-12 text-white/20" /></div>
              }
            </div>
            {/* Overlay */}
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
              {avatarUploading
                ? <Loader2 className="w-7 h-7 text-white animate-spin" />
                : <Camera className="w-7 h-7 text-white" />}
            </div>
            {/* Amber ring */}
            <div className="absolute -inset-1 rounded-full border-2 border-[#C8962C] opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          <p className="text-white/30 text-xs">
            {avatarUploading ? 'Uploading...' : 'Tap to change photo'}
          </p>
        </div>

        {/* ── Fields ────────────────────────────────────────────────────────── */}
        <div className="px-4 pt-5 pb-8 space-y-1">

          {/* Display Name */}
          <Field>
            <FieldLabel>Display Name *</FieldLabel>
            <TextInput
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="How you appear to others"
              maxLength={40}
            />
            <p className="text-white/20 text-[10px] text-right mt-1">{displayName.length}/40</p>
          </Field>

          {/* Bio */}
          <Field>
            <FieldLabel>About Me</FieldLabel>
            <TextArea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell people about yourself..."
              maxLength={300}
              rows={3}
            />
            <p className="text-white/20 text-[10px] text-right mt-1">{bio.length}/300</p>
          </Field>

          {/* Age + Pronouns side by side */}
          <div className="flex gap-3 mb-5">
            <div className="w-28 flex-shrink-0">
              <FieldLabel>Age</FieldLabel>
              <TextInput
                type="number"
                value={age}
                onChange={e => setAge(e.target.value)}
                placeholder="e.g. 28"
                min={18}
                max={99}
              />
            </div>
            <div className="flex-1">
              <FieldLabel>Area / Location</FieldLabel>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="East London, Soho..."
                  maxLength={60}
                  className="w-full bg-white/[0.06] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#C8962C]/60 text-sm transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Pronouns */}
          <Field>
            <FieldLabel>Pronouns</FieldLabel>
            <PronounPills value={pronouns} onChange={setPronouns} />
          </Field>

          {/* Divider */}
          <div className="h-px bg-white/6 my-2" />

          {/* Social Links */}
          <Field>
            <FieldLabel>Instagram</FieldLabel>
            <div className="relative">
              <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                value={instagram}
                onChange={e => setInstagram(e.target.value)}
                placeholder="@yourhandle"
                maxLength={60}
                className="w-full bg-white/[0.06] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#C8962C]/60 text-sm transition-colors"
              />
            </div>
          </Field>

          <Field>
            <FieldLabel>SoundCloud</FieldLabel>
            <div className="relative">
              <Music className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="url"
                value={soundcloud}
                onChange={e => setSoundcloud(e.target.value)}
                placeholder="soundcloud.com/yourname"
                maxLength={120}
                className="w-full bg-white/[0.06] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#C8962C]/60 text-sm transition-colors"
              />
            </div>
          </Field>

          {/* Location Privacy Toggle */}
          <div className="py-4 px-4 bg-white/[0.04] border border-white/8 rounded-2xl mb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Share my location</p>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider">
                    {locationConsent ? 'ON' : 'OFF'} 
                    {lastSync && locationConsent && ` — Last synced: ${new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLocationToggle}
                className={cn(
                  "w-11 h-6 rounded-full transition-colors relative",
                  locationConsent ? "bg-[#C8962C]" : "bg-white/10"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                  locationConsent ? "left-6" : "left-1"
                )} />
              </button>
            </div>
            <p className="mt-3 text-[10px] text-white/30 leading-relaxed">
              When ON, your distance and general area are shown to nearby members. Your exact house number is never shared.
            </p>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/6 my-2" />

          {/* Personas Section */}
          <div className="pt-2">
            <FieldLabel>Manage Personas</FieldLabel>
            <div className="space-y-2">
              {personas.map(persona => {
                const isActive = persona.id === activePersona?.id;
                return (
                  <button
                    key={persona.id}
                    onClick={() => switchPersona(persona.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98]",
                      isActive ? "bg-[#C8962C]/10 border-[#C8962C]/30" : "bg-white/5 border-white/10"
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/10">
                      {persona.avatar_url ? (
                        <img src={persona.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-white/40" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-white">{persona.display_name}</p>
                      <p className="text-[10px] uppercase text-[#C8962C]">{persona.persona_type}</p>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-[#C8962C]" />}
                  </button>
                )
              })}
              <button 
                onClick={() => openSheet('create-persona')}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/20 text-white/40 hover:text-white/60 transition-all active:scale-[0.98]"
              >
                <Plus className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Add New Persona</span>
              </button>
            </div>
          </div>

          <div className="h-px bg-white/6 my-2" />

          {/* Membership */}
          <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${AMBER}20` }}>
                <Crown className="w-5 h-5" style={{ color: AMBER }} />
              </div>
              <div>
                <FieldLabel>Membership</FieldLabel>
                <p className="text-white text-sm font-bold">{membershipTier} MEMBER</p>
              </div>
            </div>
            {membershipTier?.toUpperCase() !== 'VENUE' ? (
              <button
                type="button"
                onClick={() => openSheet('membership')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-black shadow-lg hover:brightness-110 active:scale-95 transition-all"
                style={{ background: AMBER }}
              >
                Upgrade <ChevronRight className="w-3 h-3" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openSheet('membership')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white/50 border border-white/10"
              >
                Manage
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Bottom save bar (redundant but convenient on mobile) */}
      <div className="px-4 py-4 border-t border-white/8 bg-black/70 backdrop-blur-md">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || avatarUploading || !displayName.trim() || displayName.trim().length < 2}
          className={cn(
            'w-full py-4 font-black uppercase tracking-wide rounded-2xl text-sm transition-all',
            saved
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : displayName.trim().length >= 2
                ? 'bg-[#C8962C] text-black active:scale-[0.98]'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
          )}
        >
          {saving
            ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving...</span>
            : saved
              ? <span className="flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> Profile Updated ✅</span>
              : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}
