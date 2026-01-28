import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { 
  Disc3, 
  Play, 
  ExternalLink,
  Calendar,
  Music2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';

const RELEASE_TYPES = {
  single: { label: 'Single', color: '#E62020' },
  ep: { label: 'EP', color: '#00D9FF' },
  album: { label: 'Album', color: '#39FF14' },
  compilation: { label: 'Compilation', color: '#B026FF' },
};

const GENRES = {
  techno: '#E62020',
  house: '#00D9FF',
  dnb: '#39FF14',
  ambient: '#B026FF',
  experimental: '#FF6B35',
};

export default function LabelCatalog() {
  const [filter, setFilter] = useState('all');

  // Fetch releases
  const { data: releases = [], isLoading } = useQuery({
    queryKey: ['label-releases'],
    queryFn: async () => {
      try {
        const data = await base44.entities.LabelRelease?.list() || [];
        return data.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
      } catch {
        return getMockReleases();
      }
    },
  });

  const filteredReleases = releases.filter(release => {
    if (filter === 'all') return true;
    return release.release_type === filter;
  });

  const featuredRelease = releases.find(r => r.featured);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Disc3 className="w-12 h-12 text-white/40 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Featured Release */}
      {featuredRelease && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-10" />
          {featuredRelease.artwork_url && (
            <img 
              src={featuredRelease.artwork_url} 
              alt={featuredRelease.title}
              className="absolute inset-0 w-full h-full object-cover opacity-50"
            />
          )}
          
          <div className="relative z-20 p-8 flex items-end gap-6 min-h-[300px]">
            {featuredRelease.artwork_url && (
              <img 
                src={featuredRelease.artwork_url} 
                alt={featuredRelease.title}
                className="w-48 h-48 rounded-lg object-cover shadow-2xl"
              />
            )}
            <div className="flex-1">
              <Badge className="mb-2 bg-[#E62020] text-black">Featured Release</Badge>
              <h2 className="text-4xl font-black mb-2">{featuredRelease.title}</h2>
              <p className="text-xl text-white/80 mb-4">{featuredRelease.artist}</p>
              <div className="flex items-center gap-4 text-sm text-white/60 mb-4">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {featuredRelease.release_date && format(parseISO(featuredRelease.release_date), 'MMM d, yyyy')}
                </span>
                <Badge style={{ 
                  backgroundColor: `${RELEASE_TYPES[featuredRelease.release_type]?.color}20`,
                  color: RELEASE_TYPES[featuredRelease.release_type]?.color,
                }}>
                  {RELEASE_TYPES[featuredRelease.release_type]?.label}
                </Badge>
              </div>
              <div className="flex gap-2">
                {featuredRelease.soundcloud_url && (
                  <Button 
                    onClick={() => window.open(featuredRelease.soundcloud_url, '_blank')}
                    className="bg-[#FF6B35] text-white"
                  >
                    <Play className="w-4 h-4 mr-2 fill-current" />
                    Listen on SoundCloud
                  </Button>
                )}
                {featuredRelease.spotify_url && (
                  <Button 
                    variant="outline"
                    onClick={() => window.open(featuredRelease.spotify_url, '_blank')}
                    className="border-[#1DB954] text-[#1DB954]"
                  >
                    Spotify
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-white text-black' : 'border-white/20 text-white'}
        >
          All Releases
        </Button>
        {Object.entries(RELEASE_TYPES).map(([key, { label, color }]) => (
          <Button
            key={key}
            variant={filter === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(key)}
            style={filter === key ? { backgroundColor: color, color: '#000' } : {}}
            className={filter !== key ? 'border-white/20 text-white' : ''}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Releases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReleases.map((release, idx) => (
          <motion.div
            key={release.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white/5 border border-white/10 rounded-xl overflow-hidden group hover:border-white/30 transition-all"
          >
            {/* Artwork */}
            <div className="aspect-square relative overflow-hidden">
              {release.artwork_url ? (
                <img 
                  src={release.artwork_url} 
                  alt={release.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#E62020] to-[#B026FF] flex items-center justify-center">
                  <Disc3 className="w-16 h-16 text-white/40" />
                </div>
              )}
              
              {/* Play overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button 
                  size="icon"
                  className="w-16 h-16 rounded-full bg-[#E62020] text-black"
                  onClick={() => {
                    if (release.soundcloud_url) window.open(release.soundcloud_url, '_blank');
                  }}
                >
                  <Play className="w-8 h-8 fill-current" />
                </Button>
              </div>

              {/* Type badge */}
              <Badge 
                className="absolute top-3 left-3"
                style={{ 
                  backgroundColor: RELEASE_TYPES[release.release_type]?.color,
                  color: '#000',
                }}
              >
                {RELEASE_TYPES[release.release_type]?.label}
              </Badge>

              {release.pre_release && (
                <Badge className="absolute top-3 right-3 bg-[#FFEB3B] text-black">
                  Pre-Release
                </Badge>
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              <h3 className="font-black text-lg mb-1 line-clamp-1">{release.title}</h3>
              <p className="text-white/60 mb-3">{release.artist}</p>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {release.release_date && format(parseISO(release.release_date), 'MMM yyyy')}
                </span>
                
                <div className="flex gap-2">
                  {release.genre && (
                    <span 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: GENRES[release.genre] || '#666' }}
                    />
                  )}
                  {release.tracks?.length > 0 && (
                    <span className="text-white/40 flex items-center gap-1">
                      <Music2 className="w-3 h-3" />
                      {release.tracks.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Tracks preview */}
              {release.tracks?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="text-xs text-white/40 uppercase mb-2">Tracks</div>
                  <div className="space-y-1">
                    {release.tracks.slice(0, 3).map((track, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-white/60">
                        <span className="text-white/40">{i + 1}.</span>
                        <span className="flex-1 truncate">{track.title}</span>
                        {track.duration && (
                          <span className="text-white/40">{track.duration}</span>
                        )}
                      </div>
                    ))}
                    {release.tracks.length > 3 && (
                      <div className="text-xs text-white/40">
                        +{release.tracks.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Links */}
              <div className="flex gap-2 mt-4">
                {release.soundcloud_url && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1 border-white/20"
                    onClick={() => window.open(release.soundcloud_url, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    SoundCloud
                  </Button>
                )}
                {release.beatport_url && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1 border-white/20"
                    onClick={() => window.open(release.beatport_url, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Beatport
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredReleases.length === 0 && (
        <div className="text-center py-12">
          <Disc3 className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <p className="text-white/40">No releases found</p>
        </div>
      )}
    </div>
  );
}

function getMockReleases() {
  return [
    {
      id: '1',
      title: 'Neon Nights EP',
      artist: 'HOTMESS Collective',
      release_type: 'ep',
      genre: 'techno',
      release_date: '2024-01-15',
      featured: true,
      artwork_url: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=500',
      soundcloud_url: 'https://soundcloud.com',
      tracks: [
        { title: 'Neon Lights', duration: '6:42' },
        { title: 'Dark Matter', duration: '7:15' },
        { title: 'Electric Dreams', duration: '5:58' },
        { title: 'Midnight Run', duration: '6:30' },
      ],
    },
    {
      id: '2',
      title: 'Deep State',
      artist: 'DJ Pulse',
      release_type: 'single',
      genre: 'house',
      release_date: '2024-01-08',
      artwork_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500',
      soundcloud_url: 'https://soundcloud.com',
      tracks: [
        { title: 'Deep State', duration: '7:22' },
      ],
    },
    {
      id: '3',
      title: 'Bass Culture',
      artist: 'Bass Crew',
      release_type: 'album',
      genre: 'dnb',
      release_date: '2023-12-20',
      artwork_url: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=500',
      beatport_url: 'https://beatport.com',
      tracks: [
        { title: 'Intro', duration: '1:30' },
        { title: 'Pressure Drop', duration: '5:45' },
        { title: 'Jungle Fever', duration: '6:12' },
        { title: 'Steppin', duration: '5:58' },
        { title: 'Concrete Jungle', duration: '6:30' },
        { title: 'Outro', duration: '2:15' },
      ],
    },
  ];
}
