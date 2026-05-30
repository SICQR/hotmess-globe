/**
 * L2AlbumPhotosSheet — manage photos within a single album.
 *
 * Phil exec review 2026-05-13. Companion to L2AlbumsSheet. Lets the
 * owner upload, view, set cover, and delete photos for a given album.
 *
 * Photos land in the private 'ghosted-photos' bucket. The path lives in
 * ghosted_album_photos.storage_path. Display URLs are minted via
 * /api/ghosted/photo-signed-url for both owner and recipient (the
 * endpoint also passes through full external URLs for recon backfill).
 *
 * Props:
 *   albumId — uuid of the album being managed
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, X, Plus, Loader2, Star, Lock } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { toast } from 'sonner';

const MAX_PHOTOS = 12;

/** Mint a signed URL for an album photo via the secure endpoint. */
async function fetchSignedUrl(photoId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  try {
    const res = await fetch('/api/ghosted/photo-signed-url', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ photo_id: photoId }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.url || null;
  } catch {
    return null;
  }
}

export default function L2AlbumPhotosSheet({ albumId }) {
  const { closeSheet } = useSheet();
  const [album, setAlbum]   = useState(null);
  const [photos, setPhotos] = useState([]); // [{ id, storage_path, signedUrl, scan_status }]
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const loadAll = useCallback(async () => {
    if (!albumId) { setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: albumRow } = await supabase
      .from('ghosted_albums')
      .select('id, title, description, is_xxx, photo_count, cover_photo_id')
      .eq('id', albumId)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!albumRow) { toast.error('Album not found'); closeSheet(); return; }
    setAlbum(albumRow);

    const { data: photoRows } = await supabase
      .from('ghosted_album_photos')
      .select('id, storage_path, scan_status, created_at')
      .eq('album_id', albumId)
      .order('created_at', { ascending: true });

    const rows = photoRows || [];
    // Sign each photo. We do this in parallel for snappy loads.
    const signed = await Promise.all(rows.map(async (p) => ({
      ...p,
      signedUrl: await fetchSignedUrl(p.id),
    })));
    setPhotos(signed);
    setLoading(false);
  }, [albumId, closeSheet]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleUpload = async (file) => {
    if (!album) return;
    if (photos.length >= MAX_PHOTOS) {
      toast.error(`Max ${MAX_PHOTOS} photos per album`); return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      // Validate + upload to private bucket
      if (!file.type.startsWith('image/')) throw new Error('Only images');
      if (file.size > 10 * 1024 * 1024)    throw new Error('File too large (max 10 MB)');

      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const storagePath = `${user.id}/${album.id}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('ghosted-photos')
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      // Insert the row — server-side trigger updates album.photo_count
      const { data: row, error: dbErr } = await supabase
        .from('ghosted_album_photos')
        .insert({
          album_id:     album.id,
          owner_id:     user.id,
          storage_path: storagePath,
          byte_size:    file.size,
          mime_type:    file.type,
          scan_status:  'approved', // dev mode auto-approve; production moderation queue picks this up
        })
        .select('id')
        .single();
      if (dbErr) throw dbErr;

      // First photo also becomes the cover
      if (photos.length === 0) {
        await supabase
          .from('ghosted_albums')
          .update({ cover_photo_id: row.id, photo_count: 1 })
          .eq('id', album.id);
      } else {
        await supabase
          .from('ghosted_albums')
          .update({ photo_count: photos.length + 1 })
          .eq('id', album.id);
      }

      toast.success('Photo added');
      await loadAll();
    } catch (err) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photo) => {
    if (!confirm('Delete this photo?')) return;
    try {
      // Best-effort storage cleanup — skip for external URLs (recon data)
      if (!/^https?:\/\//i.test(photo.storage_path)) {
        await supabase.storage.from('ghosted-photos').remove([photo.storage_path]).catch(() => {});
      }
      await supabase.from('ghosted_album_photos').delete().eq('id', photo.id);

      const remaining = Math.max(0, (album?.photo_count ?? photos.length) - 1);
      await supabase
        .from('ghosted_albums')
        .update({ photo_count: remaining })
        .eq('id', album.id);

      toast.success('Photo removed');
      await loadAll();
    } catch {
      toast.error('Could not delete');
    }
  };

  const handleSetCover = async (photo) => {
    try {
      await supabase
        .from('ghosted_albums')
        .update({ cover_photo_id: photo.id })
        .eq('id', album.id);
      setAlbum((a) => a ? { ...a, cover_photo_id: photo.id } : a);
      toast.success('Cover updated');
    } catch {
      toast.error('Could not set cover');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
      </div>
    );
  }
  if (!album) return null;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3 pb-3 flex items-center gap-3">
        <span
          className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
          style={{
            background: 'rgba(200,150,44,0.08)',
            border: '0.5px solid rgba(200,150,44,0.28)',
          }}
        >
          <Lock size={13} style={{ color: 'rgba(200,150,44,0.85)' }} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-medium truncate">{album.title}</span>
            {album.is_xxx && (
              <span
                className="text-[8px] tracking-[0.30em] uppercase font-medium px-1.5 py-0.5"
                style={{
                  background: 'rgba(200,150,44,0.10)',
                  border: '0.5px solid rgba(200,150,44,0.40)',
                  color: '#C8962C',
                  borderRadius: 2,
                }}
              >
                XXX
              </span>
            )}
          </div>
          <span className="block text-white/40 text-[10px] mt-0.5">
            {photos.length}/{MAX_PHOTOS} photos
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {photos.length === 0 ? (
          <div className="text-center py-12">
            <Camera className="w-9 h-9 mx-auto mb-3" style={{ color: 'rgba(200,150,44,0.30)' }} />
            <p className="text-white/55 text-sm font-medium mb-1">Empty album</p>
            <p className="text-white/30 text-xs">
              Add the first photo to make it shareable.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-[4/5] overflow-hidden bg-[#0f0c08]"
                style={{ borderRadius: 2 }}
              >
                {photo.signedUrl ? (
                  <img
                    src={photo.signedUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'rgba(200,150,44,0.45)' }} />
                  </div>
                )}

                {album.cover_photo_id === photo.id && (
                  <span
                    className="absolute top-1.5 left-1.5"
                    style={{
                      background: '#C8962C',
                      borderRadius: 2,
                      padding: '2px 4px',
                    }}
                  >
                    <Star size={9} className="text-black" fill="black" />
                  </span>
                )}

                <div className="absolute inset-0 flex items-end justify-end gap-1 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                     style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55), transparent 60%)' }}>
                  {album.cover_photo_id !== photo.id && (
                    <button
                      onClick={() => handleSetCover(photo)}
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{
                        background: 'rgba(200,150,44,0.85)',
                        color: '#000',
                      }}
                      aria-label="Set as cover"
                    >
                      <Star size={12} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(photo)}
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{
                      background: 'rgba(255,80,80,0.85)',
                      color: '#fff',
                    }}
                    aria-label="Delete photo"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}

            {photos.length < MAX_PHOTOS && (
              <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="aspect-[4/5] flex flex-col items-center justify-center gap-1 disabled:opacity-40"
                style={{
                  border: '1px dashed rgba(255,255,255,0.12)',
                  borderRadius: 2,
                }}
              >
                {uploading
                  ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'rgba(200,150,44,0.65)' }} />
                  : <>
                      <Plus className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.32)' }} />
                      <span className="text-[9px] tracking-[0.22em] uppercase" style={{ color: 'rgba(255,255,255,0.32)' }}>Add</span>
                    </>}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-4 border-t border-white/8">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading || photos.length >= MAX_PHOTOS}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-sm font-medium tracking-[0.22em] uppercase text-[11px] disabled:opacity-40"
          style={{
            background: photos.length < MAX_PHOTOS ? '#C8962C' : 'rgba(255,255,255,0.05)',
            color:      photos.length < MAX_PHOTOS ? '#0B0B0F' : 'rgba(255,255,255,0.30)',
          }}
        >
          <Camera size={14} />
          {uploading ? 'Uploading…' : 'Add photo'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
