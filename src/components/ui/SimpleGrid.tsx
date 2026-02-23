import React from 'react';
import { GrindrCard } from './GrindrCard';

type Profile = {
  id: string;
  profileName?: string;
  full_name?: string;
  display_name?: string;
  email?: string;
  photos?: Array<{ url?: string } | string>;
  avatar_url?: string;
  is_online?: boolean;
  last_seen?: string;
  looking_for?: string[];
  distance_meters?: number;
  geoLat?: number;
  geoLng?: number;
};

type Props = {
  profiles: Profile[];
  viewerLat?: number;
  viewerLng?: number;
  onOpenProfile: (profile: Profile) => void;
  onMessage: (profile: Profile) => void;
};

function formatDistance(meters?: number): string | undefined {
  if (!meters || meters < 0) return undefined;
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function formatLastSeen(timestamp?: string): string | undefined {
  if (!timestamp) return undefined;
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return `${Math.floor(diffMins / 1440)}d ago`;
}

function getPhotoUrl(profile: Profile): string {
  if (profile.avatar_url) return profile.avatar_url;
  if (Array.isArray(profile.photos) && profile.photos.length > 0) {
    const first = profile.photos[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && first.url) return first.url;
  }
  return '';
}

function getName(profile: Profile): string {
  return profile.display_name || profile.profileName || profile.full_name || 'Unknown';
}

export function SimpleGrid({ profiles, viewerLat, viewerLng, onOpenProfile, onMessage }: Props) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1 p-1">
      {profiles.map((profile) => (
        <GrindrCard
          key={profile.id || profile.email}
          name={getName(profile)}
          photo={getPhotoUrl(profile)}
          distance={formatDistance(profile.distance_meters)}
          isOnline={profile.is_online}
          lastSeen={formatLastSeen(profile.last_seen)}
          lookingFor={profile.looking_for}
          onTap={() => onOpenProfile(profile)}
          onMessage={() => onMessage(profile)}
        />
      ))}
    </div>
  );
}

export default SimpleGrid;
