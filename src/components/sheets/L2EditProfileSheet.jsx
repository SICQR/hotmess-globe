/**
 * L2EditProfileSheet — Full profile editor
 *
 * Sections: About · Physical · Sexuality & Vibe · Safer Sex · Visibility
 *
 * Writes to:
 *   profiles.display_name / bio / location / avatar_url / is_visible / public_attributes
 *   user_private_profile — sensitive fields (sti_status, last_tested, condom_preference)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/components/utils/supabaseClient';
import { uploadToStorage } from '@/lib/uploadToStorage';
import { updateProfile } from '@/lib/data';
import {
  Camera, Loader2, CheckCircle, Eye, EyeOff, MapPin, User,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSheet } from '@/contexts/SheetContext';
import { cn, validateDisplayName } from '@/lib/utils';

const PRONOUNS_OPTS = ['he/him', 'she/her', 'they/them', 'he/they', 'she/they', 'any'];
const BODY_TYPE_OPTS = ['slim', 'athletic', 'average', 'muscular', 'stocky', 'bear', 'chubby'];
const ETHNICITY_OPTS = ['Asian', 'Black', 'Latino / Hispanic', 'Middle Eastern', 'Mixed', 'South Asian', 'White', 'Other'];
const ORIENTATION_OPTS = ['Gay', 'Bisexual', 'Queer', 'Pansexual', 'Fluid', 'Other'];
const POSITION_OPTS = ['Top', 'Vers Top', 'Versatile', 'Vers Bottom', 'Bottom', 'Side', 'No preference'];
const LOOKING_FOR_OPTS = ['Hookup', 'Hang', 'Explore', 'Relationship', 'Friends', 'Networking'];
const HOSTING_OPTS = ['Can host', "Can't host", 'Depends'];
const STI_STATUS_OPTS = ['Negative', 'Negative — on PrEP', 'Positive — undetectable', 'Positive', 'Prefer not to say'];
const LAST_TESTED_OPTS = ['< 1 month ago', '1–3 months ago', '3–6 months ago', '6–12 months ago', '> 1 year ago', 'Never tested'];
const CONDOM_OPTS = ['Always', 'Sometimes', 'PrEP / other prevention', 'Prefer not to say'];

const FieldLabel = ({ children }) => (
  <label className="text-[10px] uppercase tracking-[0.12em] font-black text-white/40 block mb-2">
    {children}
  </label>
);

const CharCount = ({ current, max }) => (
  <p className="text-white/20 text-[10px] text-right mt-1">{current}/{max}</p>
);

const PillSelect = ({ options, value, onChange }) => (
  <div className="flex flex-wrap gap-2">
    {options.map(opt => (
      <button key={opt} type="button" onClick={() => onChange(value === opt ? '' : opt)}
        className={cn('px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
          value === opt
            ? 'bg-[#C8962C] text-black border-[#C8962C]'
            : 'bg-white/5 text-white/50 border-white/10 active:bg-white/10'
        )}>
        {opt}
      </button>
    ))}
  </div>
);

const MultiPillSelect = ({ options, values, onChange }) => {
  const toggle = (opt) => onChange(
    values.includes(opt) ? values.filter(v => v !== opt) : [...values, opt]
  );
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => toggle(opt)}
          className={cn('px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
            values.includes(opt)
              ? 'bg-[#C8962C] text-black border-[#C8962C]'
              : 'bg-white/5 text-white/50 border-white/10 active:bg-white/10'
          )}>
          {opt}
        </button>
      ))}
    </div>
  );
};

const Section = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/6 last:border-b-0">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 px-4">
        <span className="text-[10px] uppercase tracking-[0.15em] font-black text-[#C8962C]">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
      </button>
      {open && <div className="px-4 pb-5 space-y-5">{children}</div>}
    </div>
  );
};

export default function L2EditProfileSheet() {
  const { closeSheet } = useSheet();
  const avatarInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [pub, setPub] = useState({
    display_name: '',
    bio: '',
    location: '',
    avatar_url: '',
    is_visible: true,
  });

  // Public attributes (stored in profiles.public_attributes JSONB — visible to others)
  const [attrs, setAttrs] = useState({
    pronouns: '',
    height_cm: '',
    body_type: '',
    ethnicity: [],
    sexual_orientation: '',
    position: '',
    looking_for: [],
    hosting: '',
  });

  // Sensitive (stored in user_private_profile — self only)
  const [sensitive, setSensitive] = useState({
    sti_status: '',
    last_tested: '',
    condom_preference: '',
  });

  const setPub_ = useCallback((key, val) => setPub(p => ({ ...p, [key]: val })), []);
  const setAttrs_ = useCallback((key, val) => setAttrs(p => ({ ...p, [key]: val })), []);
  const setSensitive_ = useCallback((key, val) => setSensitive(p => ({ ...p, [key]: val })), []);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [pubRes, privRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('display_name, bio, location, avatar_url, is_visible, public_attributes')
            .eq('id', user.id)
            .single(),
          supabase
            .from('user_private_profile')
            .select('sti_status, last_tested, condom_preference')
            .eq('auth_user_id', user.id)
            .maybeSingle(),
        ]);

        if (pubRes.data) {
          const d = pubRes.data;
          setPub({
            display_name: d.display_name || '',
            bio: d.bio || '',
            location: d.location || '',
            avatar_url: d.avatar_url || '',
            is_visible: d.is_visible !== false,
          });
          const pa = d.public_attributes || {};
          setAttrs({
            pronouns: pa.pronouns || '',
            height_cm: pa.height_cm ? String(pa.height_cm) : '',
            body_type: pa.body_type || '',
            ethnicity: pa.ethnicity || [],
            sexual_orientation: pa.sexual_orientation || '',
            position: pa.position || '',
            looking_for: pa.looking_for || [],
            hosting: pa.hosting || '',
          });
        }

        if (privRes.data) {
          const d = privRes.data;
          setSensitive({
            sti_status: d.sti_status || '',
            last_tested: d.last_tested || '',
            condom_preference: d.condom_preference || '',
          });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const uploadAvatar = async (file) => {
    setAvatarUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const publicUrl = await uploadToStorage(file, 'avatars', user.id);
      setPub_('avatar_url', publicUrl);
      toast.success('Photo updated');
    } catch {
      toast.error('Photo upload failed');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async () => {
    const validation = validateDisplayName(pub.display_name);
    if (!validation.isValid) return toast.error(validation.error);
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      // Build public_attributes payload
      const public_attributes = {
        ...(attrs.pronouns && { pronouns: attrs.pronouns }),
        ...(attrs.height_cm && { height_cm: parseInt(attrs.height_cm, 10) }),
        ...(attrs.body_type && { body_type: attrs.body_type }),
        ...(attrs.ethnicity.length && { ethnicity: attrs.ethnicity }),
        ...(attrs.sexual_orientation && { sexual_orientation: attrs.sexual_orientation }),
        ...(attrs.position && { position: attrs.position }),
        ...(attrs.looking_for.length && { looking_for: attrs.looking_for }),
        ...(attrs.hosting && { hosting: attrs.hosting }),
      };

      // Save core fields to profiles — city mirrors location for grid filtering
      const locationVal = pub.location.trim() || undefined;
      const result = await updateProfile({
        display_name: pub.display_name.trim(),
        bio: pub.bio.trim() || undefined,
        location: locationVal,
        city: locationVal,
        avatar_url: pub.avatar_url || undefined,
        is_visible: pub.is_visible,
      });
      if (!result) throw new Error('Failed to save profile');

      // Save public_attributes separately (column may not exist in older DB schemas)
      if (Object.keys(public_attributes).length > 0) {
        const { error: paError } = await supabase
          .from('profiles')
          .update({ public_attributes })
          .eq('id', user.id);
        if (paError) console.warn('[edit-profile] public_attributes save skipped:', paError.message);
      }

      // Save sensitive fields to user_private_profile
      if (sensitive.sti_status || sensitive.last_tested || sensitive.condom_preference) {
        const { error: privError } = await supabase
          .from('user_private_profile')
          .upsert({
            auth_user_id: user.id,
            sti_status: sensitive.sti_status || null,
            last_tested: sensitive.last_tested || null,
            condom_preference: sensitive.condom_preference || null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'auth_user_id' });
        if (privError) throw privError;
      }

      setSaved(true);
      setTimeout(() => closeSheet(), 1200);
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const heightDisplay = () => {
    const cm = parseInt(attrs.height_cm, 10);
    if (!cm || isNaN(cm)) return '';
    const totalIn = cm / 2.54;
    const ft = Math.floor(totalIn / 12);
    const ins = Math.round(totalIn % 12);
    return ` (${ft}'${ins}")`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">

        {/* Avatar */}
        <div className="flex flex-col items-center gap-2 pt-5 pb-4 border-b border-white/6">
          <button type="button" onClick={() => avatarInputRef.current?.click()} className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-white/8 border-2 border-white/15">
              {pub.avatar_url
                ? <img src={pub.avatar_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><User className="w-10 h-10 text-white/20" /></div>}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex items-center justify-center">
              {avatarUploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
            </div>
            <div className="absolute -inset-1 rounded-full border-2 border-[#C8962C] opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity" />
          </button>
          <p className="text-white/25 text-xs">Tap to change photo</p>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ''; }} />
        </div>

        {/* About */}
        <Section title="About">
          <div>
            <FieldLabel>Display Name *</FieldLabel>
            <input value={pub.display_name} onChange={e => setPub_('display_name', e.target.value)}
              placeholder="How you appear to others" maxLength={40}
              className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#C8962C]/50 text-sm" />
            <CharCount current={pub.display_name.length} max={40} />
          </div>

          <div>
            <FieldLabel>Bio</FieldLabel>
            <textarea value={pub.bio} onChange={e => setPub_('bio', e.target.value)}
              placeholder="Tell people about yourself..." rows={3} maxLength={300}
              className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#C8962C]/50 text-sm resize-none" />
            <CharCount current={pub.bio.length} max={300} />
          </div>

          <div>
            <FieldLabel>City</FieldLabel>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input value={pub.location} onChange={e => setPub_('location', e.target.value)}
                placeholder="London, Berlin, Amsterdam..." maxLength={60}
                className="w-full bg-[#1C1C1E] border border-white/10 rounded-xl pl-9 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#C8962C]/50 text-sm" />
            </div>
          </div>

          <div>
            <FieldLabel>Pronouns</FieldLabel>
            <PillSelect options={PRONOUNS_OPTS} value={attrs.pronouns} onChange={v => setAttrs_('pronouns', v)} />
          </div>
        </Section>

        {/* Physical */}
        <Section title="Physical">
          <div>
            <FieldLabel>Height (cm){heightDisplay()}</FieldLabel>
            <input type="number" min={140} max={220} value={attrs.height_cm}
              onChange={e => setAttrs_('height_cm', e.target.value)} placeholder="e.g. 178"
              className="w-32 bg-[#1C1C1E] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-[#C8962C]/50 text-sm" />
          </div>

          <div>
            <FieldLabel>Body Type</FieldLabel>
            <PillSelect options={BODY_TYPE_OPTS} value={attrs.body_type} onChange={v => setAttrs_('body_type', v)} />
          </div>

          <div>
            <FieldLabel>Ethnicity (select all that apply)</FieldLabel>
            <MultiPillSelect options={ETHNICITY_OPTS} values={attrs.ethnicity} onChange={v => setAttrs_('ethnicity', v)} />
          </div>
        </Section>

        {/* Sexuality & Vibe */}
        <Section title="Sexuality & Vibe">
          <div>
            <FieldLabel>Sexual Orientation</FieldLabel>
            <PillSelect options={ORIENTATION_OPTS} value={attrs.sexual_orientation} onChange={v => setAttrs_('sexual_orientation', v)} />
          </div>

          <div>
            <FieldLabel>Position</FieldLabel>
            <PillSelect options={POSITION_OPTS} value={attrs.position} onChange={v => setAttrs_('position', v)} />
          </div>

          <div>
            <FieldLabel>Looking For (select all that apply)</FieldLabel>
            <MultiPillSelect options={LOOKING_FOR_OPTS} values={attrs.looking_for} onChange={v => setAttrs_('looking_for', v)} />
          </div>

          <div>
            <FieldLabel>Hosting</FieldLabel>
            <PillSelect options={HOSTING_OPTS} value={attrs.hosting} onChange={v => setAttrs_('hosting', v)} />
          </div>
        </Section>

        {/* Safer Sex */}
        <Section title="Safer Sex" defaultOpen={false}>
          <p className="text-white/30 text-xs -mt-1 mb-1">Only visible to people you match with.</p>

          <div>
            <FieldLabel>HIV / STI Status</FieldLabel>
            <PillSelect options={STI_STATUS_OPTS} value={sensitive.sti_status} onChange={v => setSensitive_('sti_status', v)} />
          </div>

          <div>
            <FieldLabel>Last Tested</FieldLabel>
            <PillSelect options={LAST_TESTED_OPTS} value={sensitive.last_tested} onChange={v => setSensitive_('last_tested', v)} />
          </div>

          <div>
            <FieldLabel>Condom Preference</FieldLabel>
            <PillSelect options={CONDOM_OPTS} value={sensitive.condom_preference} onChange={v => setSensitive_('condom_preference', v)} />
          </div>
        </Section>

        {/* Visibility */}
        <Section title="Visibility">
          <div className="bg-[#1C1C1E] rounded-2xl border border-white/8 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {pub.is_visible
                  ? <Eye className="w-5 h-5 text-[#C8962C] flex-shrink-0" />
                  : <EyeOff className="w-5 h-5 text-white/30 flex-shrink-0" />}
                <div>
                  <p className="text-white font-semibold text-sm">
                    {pub.is_visible ? 'Visible on Ghosted' : 'Hidden from Ghosted'}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {pub.is_visible ? 'Others can find and message you' : "Ghost mode — invisible to others"}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setPub_('is_visible', !pub.is_visible)}
                className={cn('w-12 h-6 rounded-full transition-all relative flex-shrink-0', pub.is_visible ? 'bg-[#C8962C]' : 'bg-white/15')}>
                <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all', pub.is_visible ? 'left-6' : 'left-0.5')} />
              </button>
            </div>
          </div>
        </Section>

        <div className="h-6" />
      </div>

      {/* Save bar */}
      <div className="px-4 py-4 border-t border-white/8 bg-black/70 backdrop-blur-md">
        <button type="button" onClick={handleSave}
          disabled={!validateDisplayName(pub.display_name).isValid || saving || avatarUploading}
          className={cn(
            'w-full py-4 font-black uppercase tracking-wide rounded-2xl text-sm transition-all',
            saved
              ? 'bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/30'
              : validateDisplayName(pub.display_name).isValid
                ? 'bg-[#C8962C] text-black active:scale-[0.98]'
                : 'bg-white/5 text-white/20 cursor-not-allowed'
          )}>
          {saving
            ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving...</span>
            : saved
              ? <span className="flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> Saved!</span>
              : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}
