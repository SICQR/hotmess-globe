import React, { Suspense } from 'react';
import MusicTab from '@/components/music/MusicTab';
import { PageLoadingSkeleton } from '@/components/skeletons/PageSkeletons';

const MusicMode: React.FC = () => {
  return (
    <Suspense fallback={<PageLoadingSkeleton type="feed" />}>
      <MusicTab />
    </Suspense>
  );
};

export default MusicMode;
