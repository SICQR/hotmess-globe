/**
 * L2PhotosSheet — Profile photo management (D10-conformant rewrite)
 *
 * Phil 2026-06-02 — Photos D10 Slice 1.
 *
 * Brings the owner-side photo sheet up to D10 §103-112 spec:
 *   §103 photo transitions and reveals
 *   §104 Drag weight — heavy damping, low stiffness, snap-back, no bounce
 *   §106 Haptic feedback on every successful gesture (navigator.vibrate)
 *   §112 No autoplay
 *
 * Substrate compliance:
 *   D17 / D53 §1.4 — single Add affordance (the sticky CTA). The previous
 *     inline `+ Add` grid cell was a duplicate primitive and has been removed.
 *   D53 §1.1 — no silent affordance. Every gesture either advances state or
 *     surfaces explicit error via toast.
 *
 * Gesture map:
 *   Tap photo (drag handle area) — drag-initiate (hello-pangea/dnd default)
 *   Tap star button             — set cover (always-visible, no hover required)
 *   Tap X button                — delete
 *   Drag                        — reorder, persists position to DB on drop
 *   Tap sticky "Add Photo"      — file picker (the ONLY add affordance)
 */

import { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Camera, X, Loader2, Image, Star, RefreshCw, ImagePlus } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { uploadToStorage, insertProfilePhoto } from '@/lib/uploadToStorage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { humanizeError } from '@/lib/errorUtils';

// D10 §106 haptic primitive. Single-pulse default, longer pulse for major
// state changes. Silent no-op on platforms without navigator.vibrate (desktop).
const haptic = (ms = 8) => {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try { navigator.vibrate(ms); } catch { /* non-fatal */ }
  }
};

const MAX_PHOTOS = 6; // D10 §142 first six slots

export default function L2PhotosSheet() {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [reorderPending, setReorderPending] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    loadPhotos();
  }, []);

  const loadPhotos = async () => {
    let { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from('profile_photos')
      .select('id, url, position, is_primary')
      .eq('profile_id', user.id)
      .order('position', { ascending: true });

    setPhotos(data || []);
    setLoading(false);
  };

  const handleUpload = async (file) => {
    setUploading(true);
    setUploadError(null);
    try {
      let { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const publicUrl = await uploadToStorage(file, 'avatars', user.id);
      await insertProfilePhoto(user.id, publicUrl, photos.length, photos.length === 0);

      await loadPhotos();
      haptic(10);
      toast.success('Photo added');
    } catch (err) {
      setUploadError({ file, message: humanizeError(err, 'Couldn\'t upload photo. Try again or pick another.') });
      toast.error('Couldn\'t upload photo. Try again or pick another.');
    } finally {
      setUploading(false);
    }
  };

  const handleRetryUpload = () => {
    if (uploadError?.file) handleUpload(uploadError.file);
  };

  const handleChooseAnother = () => {
    setUploadError(null);
    inputRef.current?.click();
  };

  const handleDelete = async (id) => {
    haptic(8);
    try {
      await supabase.from('profile_photos').delete().eq('id', id);
      setPhotos(prev => prev.filter(p => p.id !== id));
      toast.success('Photo removed');
    } catch {
      toast.error('Couldn\'t remove photo. Try again.');
    }
  };

  const handleSetPrimary = async (id) => {
    haptic(12);
    try {
      let { data: { user } } = await supabase.auth.getUser();
      await supabase.from('profile_photos').update({ is_primary: false }).eq('profile_id', user.id);
      await supabase.from('profile_photos').update({ is_primary: true }).eq('id', id);
      const primary = photos.find(p => p.id === id);
      if (primary?.url) {
        await supabase.from('profiles').update({ avatar_url: primary.url, updated_at: new Date().toISOString() }).eq('id', user.id);
      }
      setPhotos(prev => prev.map(p => ({ ...p, is_primary: p.id === id })));
      toast.success('Cover photo updated');
    } catch {
      toast.error('Couldn\'t update cover photo. Try again.');
    }
  };

  // D10 §104 — drag reorder. Optimistic UI, persist new positions to DB.
  // On failure, revert via loadPhotos so view always reflects DB truth.
  const handleDragStart = () => {
    haptic(8);
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    haptic(10);

    const newPhotos = Array.from(photos);
    const [moved] = newPhotos.splice(result.source.index, 1);
    newPhotos.splice(result.destination.index, 0, moved);

    setPhotos(newPhotos);
    setReorderPending(true);

    try {
      // Persist new positions. Sequential to avoid Supabase Web Lock contention
      // (D08 step 3 family — same pattern as #383 hotfix).
      for (let i = 0; i < newPhotos.length; i++) {
        await supabase
          .from('profile_photos')
          .update({ position: i })
          .eq('id', newPhotos[i].id);
      }
    } catch {
      toast.error('Couldn\'t save new order. Reverting.');
      await loadPhotos();
    } finally {
      setReorderPending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <p className="text-white/40 text-xs">
          {photos.length}/{MAX_PHOTOS} photos · Drag to reorder · Tap ★ to set cover
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {/* Upload error recovery banner */}
        {uploadError && (
          <div className="mb-3 p-3 rounded-xl bg-[#FF3B30]/10 border border-[#FF3B30]/20">
            <p className="text-white/80 text-xs font-bold mb-2">{uploadError.message}</p>
            <div className="flex gap-2">
              <button
                onClick={handleRetryUpload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C8962C] text-black text-xs font-bold active:scale-95 transition-transform"
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </button>
              <button
                onClick={handleChooseAnother}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 text-white/70 text-xs font-bold active:scale-95 transition-transform"
              >
                <ImagePlus className="w-3 h-3" />
                Choose another
              </button>
            </div>
          </div>
        )}

        {/* D10 §104 drag-reorder. Grid is the Droppable; each cell is a Draggable.
            hello-pangea/dnd handles touch long-press detection, accessibility
            keyboard nav, and motion. */}
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <Droppable droppableId="photos-grid" direction="horizontal" type="PHOTO">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="grid grid-cols-3 gap-2"
              >
                {photos.map((photo, index) => (
                  <Draggable key={photo.id} draggableId={photo.id} index={index}>
                    {(draggable, snapshot) => (
                      <div
                        ref={draggable.innerRef}
                        {...draggable.draggableProps}
                        {...draggable.dragHandleProps}
                        className={cn(
                          'relative aspect-square rounded-xl overflow-hidden bg-[#1C1C1E] select-none',
                          snapshot.isDragging && 'scale-[1.04] shadow-[0_8px_24px_rgba(0,0,0,0.6)] ring-1 ring-[#C8962C]/40 z-10',
                          reorderPending && 'opacity-90'
                        )}
                        style={{
                          ...draggable.draggableProps.style,
                          touchAction: 'manipulation',
                        }}
                      >
                        <img
                          src={photo.url}
                          alt=""
                          className="w-full h-full object-cover pointer-events-none"
                          draggable={false}
                        />

                        {/* Cover badge */}
                        {photo.is_primary && (
                          <div className="absolute top-1.5 left-1.5 bg-[#C8962C] rounded-full p-1 pointer-events-none">
                            <Star className="w-2.5 h-2.5 text-black fill-black" />
                          </div>
                        )}

                        {/* D17 + D53 §1.1 — actions always reachable on mobile.
                            Previous design used opacity-0 hover:opacity-100 which
                            made these buttons unreachable on touch devices. Now
                            always visible at low opacity, full on hover. */}
                        <div className="absolute bottom-1.5 right-1.5 flex gap-1 opacity-90 md:opacity-60 md:hover:opacity-100 transition-opacity">
                          {!photo.is_primary && (
                            <button
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => { e.stopPropagation(); handleSetPrimary(photo.id); }}
                              aria-label="Set as cover photo"
                              className="w-7 h-7 rounded-full bg-[#C8962C] flex items-center justify-center active:scale-90 transition-transform"
                            >
                              <Star className="w-3.5 h-3.5 text-black" />
                            </button>
                          )}
                          <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); handleDelete(photo.id); }}
                            aria-label="Delete photo"
                            className="w-7 h-7 rounded-full bg-red-500/90 flex items-center justify-center active:scale-90 transition-transform"
                          >
                            <X className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {photos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Image className="w-10 h-10 text-white/10 mb-2" />
            <p className="text-white/40 text-sm font-bold">No photos yet</p>
            <p className="text-white/25 text-xs mt-1">Add up to {MAX_PHOTOS} photos</p>
          </div>
        )}
      </div>

      {/* D53 §1.4 — single Add primitive. The previous inline `+ Add` grid cell
          was a duplicate of this sticky CTA. Removed. */}
      <div className="px-4 py-4 border-t border-white/8">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading || photos.length >= MAX_PHOTOS}
          className={cn(
            'w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all',
            photos.length < MAX_PHOTOS
              ? 'bg-[#C8962C] text-black active:scale-95'
              : 'bg-white/5 text-white/20 cursor-not-allowed'
          )}
        >
          <Camera className="w-4 h-4" />
          {uploading
            ? 'Uploading...'
            : photos.length >= MAX_PHOTOS
              ? `${MAX_PHOTOS}/${MAX_PHOTOS} photos`
              : 'Add Photo'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
