/**
 * L2PhotosSheet — Profile photo management.
 *
 * 2026-05-20: consolidated onto the shared <ProfilePhotoGrid/> so there is a
 * SINGLE profile_photos manager across the app (this sheet, opened from
 * ProfileMode's "Photos" action, and the inline grid in L2EditProfileSheet
 * both render the same component). Previously this sheet had a parallel
 * bespoke implementation with hover-only action buttons (weak on touch) and
 * no drag-to-reorder. The grid adds drag-and-drop + touch-friendly controls
 * and uses the correct (profile_id, position) schema. Private albums remain a
 * separate system (L2AlbumsSheet / ghosted_albums).
 */

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/components/utils/supabaseClient';
import ProfilePhotoGrid from '@/components/profile/ProfilePhotoGrid';

export default function L2PhotosSheet() {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      setUserId(user?.id ?? null);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 text-[#C8962C] animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <ProfilePhotoGrid userId={userId} />
    </div>
  );
}
