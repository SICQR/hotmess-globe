/**
 * VaultAccessRequest — the recipient-side CTA on someone else's profile.
 *
 * Renders when the viewed user has a Private vault (is_xxx album) with at
 * least one approved photo, AND the caller does NOT have an active share.
 *
 * Three states:
 *   1. Caller has an active share → unlocked padlock + "Vault unlocked" indicator
 *   2. Vault exists, caller has no share → "Request access" CTA that opens chat
 *      with the owner with a pre-filled vault-request message
 *   3. No vault / no content → renders null
 *
 * Bridges to the existing chat surface rather than building a parallel
 * notification queue — the owner already has VaultShareToggle in their
 * chat header to grant / revoke once the conversation is open.
 */
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Unlock } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import { useSheet, SHEET_TYPES } from '@/contexts/SheetContext';
import { track } from '@/lib/analytics';

const GOLD = '#C8962C';

export function VaultAccessRequest({ ownerId, ownerName }) {
  const [vaultState, setVaultState] = useState('loading'); // 'loading' | 'none' | 'locked' | 'unlocked'
  const [albumId, setAlbumId] = useState(null);
  const { openSheet } = useSheet();

  useEffect(() => {
    let mounted = true;
    if (!ownerId) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      // Does the owner have a Private vault with approved content?
      const { data: album } = await supabase
        .from('ghosted_albums')
        .select('id, photo_count')
        .eq('owner_id', ownerId)
        .eq('is_xxx', true)
        .is('archived_at', null)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!mounted) return;
      if (!album || (album.photo_count || 0) === 0) {
        setVaultState('none');
        return;
      }
      setAlbumId(album.id);

      // Does the caller have an active share?
      const { data: share } = await supabase
        .from('ghosted_album_shares')
        .select('id')
        .eq('album_id', album.id)
        .eq('recipient_id', user.id)
        .is('revoked_at', null)
        .maybeSingle();

      if (!mounted) return;
      setVaultState(share ? 'unlocked' : 'locked');
    })();
    return () => { mounted = false; };
  }, [ownerId]);

  if (vaultState === 'loading' || vaultState === 'none') return null;

  // State: caller already has access — quiet unlocked indicator only.
  if (vaultState === 'unlocked') {
    return (
      <div
        style={{
          padding: '8px 12px',
          borderRadius: 4,
          background: 'rgba(200,150,44,0.06)',
          border: '0.5px solid rgba(200,150,44,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: GOLD,
        }}
      >
        <Unlock size={12} />
        Vault unlocked
      </div>
    );
  }

  // State: locked — request via chat
  function handleRequest() {
    track('vault_access_requested', 'lockbox');
    openSheet(SHEET_TYPES.CHAT || 'chat', {
      userId: ownerId,
      prefill: 'Hey — can I see your private vault?',
    });
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={handleRequest}
      aria-label={`Request vault access from ${ownerName || 'this user'}`}
      style={{
        padding: '10px 14px',
        borderRadius: 4,
        background: 'rgba(255,255,255,0.04)',
        border: '0.5px solid rgba(255,255,255,0.12)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.85)',
        cursor: 'pointer',
        width: '100%',
        justifyContent: 'center',
      }}
    >
      <Lock size={13} style={{ color: GOLD }} />
      Private vault — request access
    </motion.button>
  );
}

export default VaultAccessRequest;
