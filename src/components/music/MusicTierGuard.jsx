/**
 * MusicTierGuard — pushes the user's tier music_preview_seconds cap into the
 * MusicPlayerContext.
 *
 * MUST be rendered inside MusicPlayerProvider but at App level (so the
 * useUserBenefits subscription mounts once + survives sheet/route changes).
 *
 * Failure modes are silent: if the hook throws or the cap can't be read, the
 * context default (Infinity = no cap) stays. Live users never get cut off
 * because of a wiring bug.
 */

import { useEffect } from 'react';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { useUserBenefits } from '@/hooks/useUserBenefits';

export default function MusicTierGuard() {
  const { setPreviewCap } = useMusicPlayer();
  const benefits = useUserBenefits();

  useEffect(() => {
    try {
      const cap = benefits?.music_preview_seconds;
      // -1 = unlimited (HOTMESS+). null/undefined while loading = no enforcement yet.
      if (cap == null || cap === -1) {
        setPreviewCap(Infinity);
        return;
      }
      if (typeof cap === 'number' && cap >= 5) {
        setPreviewCap(cap);
      } else {
        setPreviewCap(Infinity);
      }
    } catch {
      setPreviewCap(Infinity);
    }
  }, [benefits, setPreviewCap]);

  return null;
}
