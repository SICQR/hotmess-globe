/**
 * VaultShareToggle — Grindr-style "Share Private Vault with [name]" toggle.
 *
 * Renders inside L2ChatSheet's header. Auto-creates the caller's single Private
 * (is_xxx=true) album lazily on first use. Calls share_album_with /
 * revoke_album_share RPCs.
 *
 * Brand: HOTMESS dark luxury — gold #C8962C, slightly squared corners, condensed
 * uppercase labels, no hearts.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';
import { track } from '@/lib/analytics';

const GOLD = '#C8962C';

export function VaultShareToggle({ recipientId, recipientName, conversationId }) {
  const [albumId, setAlbumId] = useState(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [share, setShare] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      // Find or auto-create the user's single Private album
      let { data: album } = await supabase
        .from('ghosted_albums')
        .select('id, photo_count')
        .eq('owner_id', user.id)
        .eq('is_xxx', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!album) {
        const { data: created, error } = await supabase
          .from('ghosted_albums')
          .insert({ owner_id: user.id, title: 'Private', is_xxx: true })
          .select('id, photo_count')
          .single();
        if (error || !created) { if (mounted) setReady(true); return; }
        album = created;
      }

      if (!mounted) return;
      setAlbumId(album.id);
      setPhotoCount(album.photo_count || 0);

      // Existing active share to this recipient?
      if (recipientId) {
        const { data: existing } = await supabase
          .from('ghosted_album_shares')
          .select('id, shared_at')
          .eq('album_id', album.id)
          .eq('recipient_id', recipientId)
          .is('revoked_at', null)
          .maybeSingle();
        if (mounted) setShare(existing);
      }
      if (mounted) setReady(true);
    })();
    return () => { mounted = false; };
  }, [recipientId]);

  async function handleToggle() {
    if (!albumId || loading) return;
    setLoading(true);
    try {
      if (share) {
        const { data: ok, error } = await supabase.rpc('revoke_album_share', { p_share_id: share.id });
        if (error) { toast.error('Could not revoke'); return; }
        if (ok) {
          setShare(null);
          track('vault_share_revoked', 'lockbox');
          toast('Vault access revoked');
        }
      } else {
        const { data: id, error } = await supabase.rpc('share_album_with', {
          p_album_id: albumId,
          p_recipient_id: recipientId,
          p_conversation_id: conversationId || null,
          p_expires_at: null,
        });
        if (error) { toast.error('Could not share'); return; }
        if (id) {
          setShare({ id, shared_at: new Date().toISOString() });
          track('vault_share_granted', 'lockbox');
          toast(`Vault shared with ${recipientName || 'them'}`);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return null;

  // No vault content yet — surface a quiet hint instead of the toggle.
  if (!albumId || photoCount === 0) {
    return (
      <div
        style={{
          padding: '8px 12px',
          borderRadius: 4,
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(255,255,255,0.08)',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          fontSize: 11,
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '0.04em',
        }}
      >
        <Lock size={12} />
        Add photos to your vault to share it
      </div>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={handleToggle}
      disabled={loading}
      aria-label={share ? 'Revoke vault access' : 'Share private vault'}
      style={{
        padding: '10px 14px',
        borderRadius: 4,
        background: share ? 'rgba(200,150,44,0.10)' : GOLD,
        color: share ? GOLD : '#1a1208',
        border: share ? `0.5px solid ${GOLD}` : 'none',
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        opacity: loading ? 0.6 : 1,
      }}
    >
      {share ? <Unlock size={13} /> : <Lock size={13} />}
      {share ? 'Vault shared — revoke' : 'Share private vault'}
    </motion.button>
  );
}

export default VaultShareToggle;
