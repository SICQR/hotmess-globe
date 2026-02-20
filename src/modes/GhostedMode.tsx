/**
 * GhostedMode - Default OS mode
 * 
 * Full-screen edge-to-edge proximity grid.
 * No hero banners.
 * No stacked preview widgets.
 * No marketing blocks.
 * No website headers.
 * Chat opens as overlay (not route jump).
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSheet } from '@/contexts/SheetContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { getProfiles, subscribeToProfiles, type Profile } from '@/lib/data';

// Lazy load the grid component
import ProfilesGrid from '@/features/profilesGrid/ProfilesGrid';

interface GhostedModeProps {
  className?: string;
}

export function GhostedMode({ className = '' }: GhostedModeProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { openSheet } = useSheet();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Load profiles
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const loadProfiles = async () => {
      setIsLoading(true);
      const data = await getProfiles({ limit: 100 });
      setProfiles(data);
      setIsLoading(false);

      // Subscribe to realtime updates
      unsubscribe = subscribeToProfiles((updated) => {
        setProfiles(updated);
      });
    };

    loadProfiles();

    return () => {
      unsubscribe?.();
    };
  }, []);

  // Handle profile tap - open as overlay
  const handleProfileTap = (profileId: string) => {
    openSheet('L2ProfileSheet', { userId: profileId });
  };

  // Handle chat tap - open as overlay
  const handleChatTap = (profileId: string) => {
    openSheet('ChatSheet', { recipientId: profileId });
  };

  return (
    <div className={`h-full w-full bg-black ${className}`}>
      {/* Full-screen grid - no header, no padding, edge-to-edge */}
      <div className="h-full w-full overflow-y-auto scroll-momentum pb-20">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-64"
            >
              <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <ProfilesGrid 
                onOpenProfile={(profile) => handleProfileTap(profile.id)}
                containerClassName="p-0"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Online count indicator */}
      <div className="fixed top-4 right-4 z-40 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-full border border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-white/70">
            {profiles.filter(p => p.is_online).length} online
          </span>
        </div>
      </div>
    </div>
  );
}

export default GhostedMode;
