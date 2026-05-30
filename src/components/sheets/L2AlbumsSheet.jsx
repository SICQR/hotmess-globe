/**
 * L2AlbumsSheet — manage private (XXX) albums.
 *
 * Phil exec review 2026-05-13. Owner-facing flow:
 *   • list albums (ghosted_albums where owner_id = me)
 *   • create new album (with is_xxx toggle)
 *   • archive / restore
 *   • tap album → opens L2AlbumPhotosSheet to manage photos within
 *
 * Visibility / sharing is handled separately by VaultShareToggle in
 * chat threads. This sheet is just owner-side album management.
 */

import { useCallback, useEffect, useState } from 'react';
import { Plus, Lock, Loader2, ChevronRight, Image as ImageIcon, Archive } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet } from '@/contexts/SheetContext';
import { toast } from 'sonner';

const MAX_ALBUMS = 5;

export default function L2AlbumsSheet() {
  const { openSheet } = useSheet();
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isXxx, setIsXxx] = useState(true);

  const loadAlbums = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data, error } = await supabase
      .from('ghosted_albums')
      .select('id, title, description, is_xxx, photo_count, cover_photo_id, created_at, archived_at')
      .eq('owner_id', user.id)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[L2AlbumsSheet] load failed:', error.message);
      toast.error('Could not load albums');
    }
    setAlbums(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAlbums(); }, [loadAlbums]);

  const handleCreate = async () => {
    const title = newTitle.trim();
    if (!title) { toast.error('Give the album a name'); return; }
    if (albums.length >= MAX_ALBUMS) {
      toast.error(`Max ${MAX_ALBUMS} albums`); return;
    }
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const { data, error } = await supabase
        .from('ghosted_albums')
        .insert({
          owner_id:    user.id,
          title,
          description: newDesc.trim() || null,
          is_xxx:      isXxx,
          photo_count: 0,
        })
        .select('id')
        .single();
      if (error) throw error;

      toast.success('Album created');
      setShowCreate(false);
      setNewTitle('');
      setNewDesc('');
      setIsXxx(true);
      await loadAlbums();
      // Jump straight into the new album so user can add photos
      openSheet('album-photos', { albumId: data.id });
    } catch (err) {
      toast.error(err?.message || 'Could not create album');
    } finally {
      setCreating(false);
    }
  };

  const handleArchive = async (albumId) => {
    if (!confirm('Archive this album? It hides from your profile and revokes all shares.')) return;
    try {
      await supabase
        .from('ghosted_albums')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', albumId);
      // Best-effort revoke of any active shares
      await supabase
        .from('ghosted_album_shares')
        .update({ revoked_at: new Date().toISOString() })
        .eq('album_id', albumId)
        .is('revoked_at', null);
      toast.success('Album archived');
      await loadAlbums();
    } catch {
      toast.error('Could not archive');
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
      <div className="px-4 pt-3 pb-2">
        <p className="text-white/45 text-xs">
          {albums.length}/{MAX_ALBUMS} albums · Private until you share
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {/* Create form — inline expand, no nested sheet */}
        {showCreate && (
          <div
            className="mb-3 p-4 rounded-md"
            style={{
              background: 'rgba(200,150,44,0.04)',
              border: '0.5px solid rgba(200,150,44,0.28)',
            }}
          >
            <div className="text-[10px] tracking-[0.32em] uppercase text-[#C8962C]/75 font-medium mb-3">
              New album
            </div>

            <input
              type="text"
              placeholder="Title (eg. After hours)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={40}
              className="w-full bg-transparent border-0 border-b border-white/10 text-white text-sm py-2 px-0 focus:outline-none focus:border-[#C8962C]/45 placeholder:text-white/25"
            />
            <textarea
              placeholder="Optional note (only you see this)"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              maxLength={120}
              rows={2}
              className="w-full bg-transparent border-0 border-b border-white/10 text-white text-xs py-2 px-0 mt-2 focus:outline-none focus:border-[#C8962C]/45 placeholder:text-white/25 resize-none"
            />

            <label className="flex items-center gap-3 mt-4 cursor-pointer">
              <span
                onClick={() => setIsXxx(!isXxx)}
                className="relative w-9 h-5 rounded-full transition-colors"
                style={{
                  background: isXxx ? 'rgba(200,150,44,0.45)' : 'rgba(255,255,255,0.08)',
                  border: '0.5px solid ' + (isXxx ? 'rgba(200,150,44,0.65)' : 'rgba(255,255,255,0.15)'),
                }}
              >
                <span
                  className="absolute top-[1px] w-[15px] h-[15px] rounded-full bg-white transition-transform"
                  style={{ transform: isXxx ? 'translateX(17px)' : 'translateX(1px)' }}
                />
              </span>
              <div>
                <span className="text-white text-xs font-medium">XXX album</span>
                <span className="block text-white/40 text-[10px] mt-0.5">
                  Recipients must have XXX access enabled
                </span>
              </div>
            </label>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCreate}
                disabled={creating || !newTitle.trim()}
                className="flex-1 py-2.5 rounded-sm bg-[#C8962C] text-black text-[11px] font-medium tracking-[0.22em] uppercase disabled:opacity-40"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewTitle(''); setNewDesc(''); }}
                className="px-4 py-2.5 rounded-sm border border-white/10 text-white/55 text-[11px] font-medium tracking-[0.22em] uppercase"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Album list */}
        {albums.length === 0 && !showCreate ? (
          <div className="text-center py-12">
            <Lock className="w-9 h-9 mx-auto mb-3" style={{ color: 'rgba(200,150,44,0.35)' }} />
            <p className="text-white/55 text-sm font-medium mb-1">No private albums yet</p>
            <p className="text-white/30 text-xs mb-5">
              Create one for after-hours photos. Share per person, revoke anytime.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {albums.map((album) => (
              <div
                key={album.id}
                className="group flex items-center gap-3 p-3 rounded-md cursor-pointer active:scale-[0.99] transition-transform"
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '0.5px solid rgba(255,255,255,0.06)',
                }}
                onClick={() => openSheet('album-photos', { albumId: album.id })}
              >
                <span
                  className="w-12 h-12 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'rgba(200,150,44,0.06)',
                    border: '0.5px solid rgba(200,150,44,0.22)',
                  }}
                >
                  {album.is_xxx
                    ? <Lock size={16} style={{ color: 'rgba(200,150,44,0.85)' }} />
                    : <ImageIcon size={16} style={{ color: 'rgba(255,255,255,0.55)' }} />}
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
                  <span className="block text-white/40 text-[10px] mt-1">
                    {album.photo_count} photo{album.photo_count === 1 ? '' : 's'}
                    {album.description ? ` · ${album.description}` : ''}
                  </span>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); handleArchive(album.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5"
                  aria-label="Archive album"
                >
                  <Archive size={14} style={{ color: 'rgba(255,255,255,0.45)' }} />
                </button>
                <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.30)' }} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-4 border-t border-white/8">
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            disabled={albums.length >= MAX_ALBUMS}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-sm font-medium tracking-[0.22em] uppercase text-[11px] disabled:opacity-40"
            style={{
              background: 'rgba(200,150,44,0.10)',
              border: '0.5px solid rgba(200,150,44,0.45)',
              color: '#C8962C',
            }}
          >
            <Plus size={14} />
            New private album
          </button>
        )}
      </div>
    </div>
  );
}
