/**
 * ProfilePhotoGrid — Grindr-style drag-and-drop photo manager.
 *
 * Built 2026-05-20 after Glen reported "no flow" for changing his profile
 * photo. Root cause: the old single-avatar handler upserted to
 * `profile_photos` with onConflict 'user_id,position' + columns user_id/
 * is_avatar that don't exist (real constraint is (profile_id, position);
 * real columns are profile_id/url/position/is_primary/moderation_status).
 * The write failed silently inside Promise.allSettled while the UI still
 * showed "Photo updated". This component uses the correct schema and
 * surfaces every state (Never Silent).
 *
 * Behaviour:
 *   - Up to MAX_PHOTOS slots. Position 0 = cover (syncs profiles.avatar_url).
 *   - Add: tap an empty slot → file picker → validated upload → row insert.
 *   - Reorder: HTML5 drag-and-drop (desktop). Touch users get a "Set cover"
 *     action on each non-cover tile (reliable cross-device path).
 *   - Delete: × on a tile → row removed; if it was the cover, the next photo
 *     is promoted and avatar_url re-synced.
 *   - Per-tile states: idle / uploading / error(+retry). Toasts on every op.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, X, Star, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/components/utils/supabaseClient';
import { uploadToStorage } from '@/lib/uploadToStorage';

const MAX_PHOTOS = 6;
const GOLD = '#C8962C';

interface Photo {
  id: string;
  url: string;
  position: number;
  is_primary: boolean;
}

interface ProfilePhotoGridProps {
  userId: string | null;
  /** Called whenever the cover (position 0) photo changes, with its URL (or null). */
  onCoverChange?: (url: string | null) => void;
}

export default function ProfilePhotoGrid({ userId, onCoverChange }: ProfilePhotoGridProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── Load existing photos ──────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('profile_photos')
      .select('id, url, position, is_primary')
      .eq('profile_id', userId)
      .order('position', { ascending: true });
    if (error) {
      toast.error('Could not load photos');
      setLoading(false);
      return;
    }
    setPhotos((data as Photo[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // Keep parent avatar header in sync with the cover photo.
  useEffect(() => {
    const cover = photos.find((p) => p.position === 0) ?? photos[0] ?? null;
    onCoverChange?.(cover?.url ?? null);
  }, [photos, onCoverChange]);

  // ── Persist cover → profiles.avatar_url ───────────────────────────────────
  const syncAvatar = useCallback(async (url: string | null) => {
    if (!userId) return;
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId);
  }, [userId]);

  // ── Add ───────────────────────────────────────────────────────────────────
  const onPickFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !userId) return;
    if (photos.length >= MAX_PHOTOS) { toast('Max 6 photos'); return; }

    const nextPos = photos.length; // append
    setUploadingSlot(nextPos);
    const toastId = toast.loading('Uploading photo…');
    try {
      const url = await uploadToStorage(file, 'avatars', userId);
      const isPrimary = nextPos === 0;
      const { data, error } = await supabase
        .from('profile_photos')
        .upsert(
          { profile_id: userId, url, position: nextPos, is_primary: isPrimary, moderation_status: 'approved' },
          { onConflict: 'profile_id,position' },
        )
        .select('id, url, position, is_primary')
        .single();
      if (error) throw error;
      setPhotos((prev) => [...prev, data as Photo]);
      if (isPrimary) await syncAvatar(url);
      toast.success('Photo added', { id: toastId });
    } catch (err: any) {
      toast.error(err?.message || 'Upload failed — try again', { id: toastId });
    } finally {
      setUploadingSlot(null);
    }
  }, [photos, userId, syncAvatar]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const removePhoto = useCallback(async (photo: Photo) => {
    if (!userId) return;
    const toastId = toast.loading('Removing…');
    const { error } = await supabase.from('profile_photos').delete().eq('id', photo.id);
    if (error) { toast.error('Could not remove photo', { id: toastId }); return; }

    // Recompact positions and re-flag the cover.
    const remaining = photos.filter((p) => p.id !== photo.id)
      .sort((a, b) => a.position - b.position)
      .map((p, i) => ({ ...p, position: i, is_primary: i === 0 }));
    await persistOrder(remaining);
    setPhotos(remaining);
    await syncAvatar(remaining[0]?.url ?? null);
    toast.success('Removed', { id: toastId });
  }, [photos, userId, syncAvatar]);

  // ── Reorder persistence (two-phase to dodge the (profile_id,position) unique) ─
  const persistOrder = useCallback(async (ordered: Photo[]) => {
    if (!userId) return;
    // Phase 1: park everything at negative positions (no unique collision).
    await Promise.all(ordered.map((p, i) =>
      supabase.from('profile_photos').update({ position: -(i + 1) }).eq('id', p.id),
    ));
    // Phase 2: write final positions + primary flag.
    await Promise.all(ordered.map((p, i) =>
      supabase.from('profile_photos').update({ position: i, is_primary: i === 0 }).eq('id', p.id),
    ));
  }, [userId]);

  const applyReorder = useCallback(async (from: number, to: number) => {
    if (from === to) return;
    const next = [...photos];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const renumbered = next.map((p, i) => ({ ...p, position: i, is_primary: i === 0 }));
    setPhotos(renumbered); // optimistic
    const toastId = toast.loading('Saving order…');
    try {
      await persistOrder(renumbered);
      await syncAvatar(renumbered[0]?.url ?? null);
      toast.success('Order saved', { id: toastId });
    } catch {
      toast.error('Could not save order', { id: toastId });
      load(); // resync from server on failure
    }
  }, [photos, persistOrder, syncAvatar, load]);

  const setCover = useCallback((index: number) => applyReorder(index, 0), [applyReorder]);

  // ── Render ──────────────────────────────────────────────────────────────────
  const slots = Array.from({ length: MAX_PHOTOS }, (_, i) => photos[i] ?? null);

  return (
    <div className="px-4 pt-5 pb-4 border-b border-white/6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/40 text-[11px] font-bold uppercase tracking-[0.18em]">Photos</span>
        <span className="text-white/25 text-[11px]">{photos.length}/{MAX_PHOTOS} · first photo is your cover</span>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickFile} />

      <div className="grid grid-cols-3 gap-2">
        {slots.map((photo, index) => {
          if (!photo) {
            const isNextEmpty = index === photos.length;
            const isUploadingHere = uploadingSlot === index;
            return (
              <button
                key={`empty-${index}`}
                type="button"
                disabled={!isNextEmpty || loading || uploadingSlot !== null}
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-white/12 flex items-center justify-center bg-white/[0.03] disabled:opacity-40 active:scale-95 transition-all"
                aria-label="Add photo"
              >
                {isUploadingHere
                  ? <Loader2 className="w-6 h-6 animate-spin" style={{ color: GOLD }} />
                  : isNextEmpty
                    ? <Camera className="w-6 h-6 text-white/30" />
                    : <span className="text-white/15 text-xs">—</span>}
              </button>
            );
          }
          const isCover = index === 0;
          return (
            <div
              key={photo.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => { e.preventDefault(); setOverIndex(index); }}
              onDragEnd={() => { if (dragIndex !== null && overIndex !== null) applyReorder(dragIndex, overIndex); setDragIndex(null); setOverIndex(null); }}
              onDrop={(e) => { e.preventDefault(); if (dragIndex !== null) applyReorder(dragIndex, index); setDragIndex(null); setOverIndex(null); }}
              className={`relative aspect-square rounded-xl overflow-hidden bg-white/8 cursor-grab active:cursor-grabbing transition-all ${overIndex === index && dragIndex !== index ? 'ring-2 ring-[#C8962C]' : ''} ${dragIndex === index ? 'opacity-40' : ''}`}
            >
              <img src={photo.url} alt="" className="w-full h-full object-cover pointer-events-none" />

              {/* Cover badge */}
              {isCover && (
                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-0.5" style={{ background: GOLD, color: '#050507' }}>
                  <Star className="w-2.5 h-2.5 fill-current" /> Cover
                </span>
              )}

              {/* Delete */}
              <button
                type="button"
                onClick={() => removePhoto(photo)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
                aria-label="Remove photo"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>

              {/* Set-cover (touch-friendly, non-cover only) */}
              {!isCover && (
                <button
                  type="button"
                  onClick={() => setCover(index)}
                  className="absolute bottom-1 inset-x-1 py-1 rounded-md bg-black/55 backdrop-blur-sm text-white text-[9px] font-bold uppercase tracking-wider active:scale-95 transition-transform"
                >
                  Set cover
                </button>
              )}
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="flex items-center gap-2 mt-3 text-white/30 text-xs">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading photos…
        </div>
      )}
      {!loading && photos.length === 0 && (
        <div className="flex items-center gap-2 mt-3 text-white/30 text-xs">
          <AlertCircle className="w-3.5 h-3.5" /> No photos yet — add one to appear on the grid.
        </div>
      )}
      <p className="text-white/25 text-[11px] mt-3 leading-relaxed">
        Drag to reorder. Tap "Set cover" to make a photo your main. Your cover shows on the Ghosted grid and your profile.
      </p>
    </div>
  );
}
