import React, { useMemo, useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/components/utils/supabaseClient';
import { auth } from '@/components/utils/supabaseClient';
import { Radio as RadioIcon, Music2, Disc, Play, Pause, Calendar, MapPin, ExternalLink, TrendingUp, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRadio } from '@/components/shell/RadioContext';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';
import SoundCloudEmbed from '@/components/media/SoundCloudEmbed';
import { schedule, getNextEpisode, generateICS, downloadICS } from '../components/radio/radioUtils';
import { toast } from 'sonner';
import { snapToGrid } from '../components/utils/locationPrivacy';
import { KineticHeadline } from '@/components/text/KineticHeadline';

async function getWithAuth(url) {
  const { data } = await auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || payload?.details || 'Request failed');
  }

  return payload;
}

async function postWithAuth(url) {
  const { data } = await auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || payload?.details || 'Request failed');
  }

  return payload;
}

async function postFormWithAuth(url, formData) {
  const { data } = await auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || payload?.details || 'Request failed');
  }

  return payload;
}

export default function Music() {
  const location = useLocation();
  const { isRadioOpen, openRadio } = useRadio();
  const [activeTab, setActiveTab] = useState(() => {
    const path = location?.pathname ?? '';
    if (path.startsWith('/music/releases')) return 'releases';
    return 'live';
  });
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  const [trackTitle, setTrackTitle] = useState('');
  const [trackDescription, setTrackDescription] = useState('');
  const [wavFile, setWavFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [pendingDeleteDropId, setPendingDeleteDropId] = useState(null);

  const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

  const musicUploadEmailAllowlist = useMemo(() => {
    const raw =
      import.meta.env.VITE_MUSIC_UPLOAD_EMAILS ||
      import.meta.env.VITE_OWNER_EMAIL ||
      '';
    return String(raw)
      .split(',')
      .map((e) => normalizeEmail(e))
      .filter(Boolean);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const canUpload = useMemo(() => {
    const email = normalizeEmail(currentUser?.email);
    if (!email) return false;

    // If you set VITE_MUSIC_UPLOAD_EMAILS (recommended), only those addresses can upload.
    if (musicUploadEmailAllowlist.length) {
      return musicUploadEmailAllowlist.includes(email);
    }

    // Back-compat fallback: keep admin-only behavior when the allowlist isn't configured.
    return currentUser?.role === 'admin';
  }, [currentUser?.email, currentUser?.role, musicUploadEmailAllowlist]);

  const HNHMESS_FEATURED = useMemo(
    () => ({
      id: 2243204375,
      title: 'HNHMESS',
      slug: 'hnhmess',
      // Use the SoundCloud API URL with secret_token so the embed works even if unlisted.
      urlOrUrn: 'https://api.soundcloud.com/tracks/2243204375?secret_token=s-jK7AWO2CQ6t',
    }),
    []
  );

  useEffect(() => {
    const params = new URLSearchParams(location?.search || '');
    const sc = params.get('soundcloud');
    if (!sc) return;
    if (sc === 'connected') toast.success('SoundCloud connected');
    if (sc === 'error') toast.error('SoundCloud connect failed');
  }, [location?.search]);

  // Fetch music events (beacons with audio)
  const { data: musicEvents = [] } = useQuery({
    queryKey: ['music-events'],
    queryFn: async () => {
      try {
        const allBeacons = await base44.entities.Beacon.filter({ active: true, status: 'published' });
        const today = new Date();
        // Filter to music events with audio_url
        return allBeacons
          .filter(b => b.audio_url && b.event_date && new Date(b.event_date) >= today)
          .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
          .slice(0, 12);
      } catch (error) {
        console.error('Failed to fetch music events:', error);
        return [];
      }
    },
    refetchInterval: 60000
  });

  const radioShows = schedule?.shows ?? [];
  const showUrlFromSlug = (slug) => `/music/shows/${slug}`;

  const nextUp = useMemo(() => {
    const items = radioShows
      .map((show) => {
        const nextEpisode = getNextEpisode(show?.id);
        if (!show || !nextEpisode?.date) return null;
        return { show, nextEpisode };
      })
      .filter(Boolean)
      .sort((a, b) => a.nextEpisode.date - b.nextEpisode.date);

    return items.slice(0, 3);
  }, [radioShows]);

  const addEpisodeToCalendar = ({ show, nextEpisode }) => {
    if (!show || !nextEpisode) return;
    const ics = generateICS(show, nextEpisode);
    const filename = `${show.slug || show.id}-${format(nextEpisode.date, 'yyyy-MM-dd')}.ics`;
    downloadICS(ics, filename);
    toast.success('Calendar file downloaded.');
  };

  // Fetch audio releases
  const { data: releases = [] } = useQuery({
    queryKey: ['audio-releases'],
    queryFn: async () => {
      try {
        const metadata = await base44.entities.AudioMetadata.list('-created_date', 20);
        if (!metadata || metadata.length === 0) return [];
        
        const beaconIds = metadata.map(m => m.beacon_id).filter(Boolean);
        if (beaconIds.length === 0) return metadata.map(m => ({ ...m, beacon: null }));
        
        const beacons = await Promise.all(
          beaconIds.map(id => base44.entities.Beacon.filter({ id }).then(b => b[0]).catch(() => null))
        );
        return metadata.map(m => ({
          ...m,
          beacon: beacons.find(b => b?.id === m.beacon_id) || null
        }));
      } catch (error) {
        console.error('Failed to fetch releases:', error);
        return [];
      }
    }
  });

  const { data: dropBeacons = [] } = useQuery({
    queryKey: ['audio-drops-public'],
    queryFn: async () => {
      try {
        return await base44.entities.Beacon.filter(
          { kind: 'drop', mode: 'radio', active: true, status: 'published' },
          '-created_date'
        );
      } catch {
        return [];
      }
    },
    refetchInterval: 60000,
  });

  const combinedReleases = (() => {
    const list = Array.isArray(releases) ? [...releases] : [];
    const existingBeaconIds = new Set(
      list.map((r) => r?.beacon_id || r?.beacon?.id).filter(Boolean)
    );

    for (const beacon of Array.isArray(dropBeacons) ? dropBeacons : []) {
      if (!beacon?.id) continue;
      if (existingBeaconIds.has(beacon.id)) continue;
      if (!beacon.audio_url && !beacon.soundcloud_urn && !beacon.soundcloud_url && !beacon?.metadata?.soundcloud_urn && !beacon?.metadata?.soundcloud_url) {
        continue;
      }

      list.push({
        track_id: beacon.track_id || beacon.id,
        beacon_id: beacon.id,
        mood: 'DROP',
        bpm: null,
        genre: null,
        play_count: beacon.play_count || 0,
        soundcloud_urn: beacon.soundcloud_urn || beacon?.metadata?.soundcloud_urn || null,
        soundcloud_url: beacon.soundcloud_url || beacon?.metadata?.soundcloud_url || null,
        beacon,
      });
    }

    return list;
  })();

  const { data: soundcloudStatus } = useQuery({
    queryKey: ['soundcloud-status'],
    queryFn: () => getWithAuth('/api/soundcloud/status'),
    enabled: !!currentUser && canUpload,
    retry: false,
  });

  const { data: soundcloudPublicProfile } = useQuery({
    queryKey: ['soundcloud-public-profile'],
    queryFn: async () => {
      const resp = await fetch('/api/soundcloud/public-profile');
      const payload = await resp.json().catch(() => null);
      if (!payload || payload.connected === false) return null;
      return payload.profile || null;
    },
    retry: false,
  });

  const { data: soundcloudPublicTracks } = useQuery({
    queryKey: ['soundcloud-public-tracks'],
    queryFn: async () => {
      const resp = await fetch('/api/soundcloud/public-tracks');
      const payload = await resp.json().catch(() => null);
      if (!payload || payload.connected === false) return { tracks: [] };
      return { tracks: Array.isArray(payload.tracks) ? payload.tracks : [] };
    },
    retry: false,
  });

  const soundcloudTracksForReleases = useMemo(() => {
    const tracks = Array.isArray(soundcloudPublicTracks?.tracks) ? soundcloudPublicTracks.tracks : [];
    const hasHnh = tracks.some((t) => String(t?.id) === String(HNHMESS_FEATURED.id));
    if (hasHnh) return tracks;

    // If the track is unlisted/secret, it may not appear in the public track list.
    return [HNHMESS_FEATURED, ...tracks];
  }, [soundcloudPublicTracks?.tracks, HNHMESS_FEATURED]);

  const connectSoundcloudMutation = useMutation({
    mutationFn: async () => {
      const redirectTo = '/music/releases';
      return getWithAuth(`/api/soundcloud/authorize?redirect_to=${encodeURIComponent(redirectTo)}`);
    },
    onSuccess: (data) => {
      const url = data?.authorize_url;
      if (!url) {
        toast.error('Failed to start SoundCloud OAuth');
        return;
      }
      window.location.href = url;
    },
    onError: (error) => {
      toast.error(error.message || 'SoundCloud connect failed');
    },
  });

  const disconnectSoundcloudMutation = useMutation({
    mutationFn: () => postWithAuth('/api/soundcloud/disconnect'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['soundcloud-status'] });
      toast.success('SoundCloud disconnected');
    },
    onError: (error) => {
      toast.error(error.message || 'SoundCloud disconnect failed');
    },
  });

  const uploadDropMutation = useMutation({
    mutationFn: async () => {
      if (!canUpload) throw new Error('Not authorized to upload');
      if (!wavFile || !trackTitle.trim()) {
        throw new Error('Title and WAV file required');
      }

      setUploading(true);

      let location = { lat: 51.5074, lng: -0.1278 };
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          location = snapToGrid(position.coords.latitude, position.coords.longitude);
        } catch {
          // ignore
        }
      }

      const { file_url } = await base44.integrations.Core.UploadFile({ file: wavFile });

      let soundcloudUpload = null;
      try {
        const form = new FormData();
        form.set('track[title]', trackTitle.trim());
        if (trackDescription?.trim()) form.set('track[description]', trackDescription.trim());
        form.set('track[asset_data]', wavFile);
        soundcloudUpload = await postFormWithAuth('/api/soundcloud/upload', form);
      } catch {
        soundcloudUpload = null;
      }

      const beacon = await base44.entities.Beacon.create({
        title: trackTitle,
        description: trackDescription,
        kind: 'drop',
        mode: 'radio',
        lat: location.lat,
        lng: location.lng,
        city: currentUser?.city || 'London',
        xp_scan: 200,
        audio_url: file_url,
        track_id: `convict_${Date.now()}`,
        active: true,
        status: 'published',
      });

      if (soundcloudUpload?.urn || soundcloudUpload?.permalink_url) {
        await base44.entities.Beacon.update(beacon.id, {
          soundcloud_urn: soundcloudUpload.urn || null,
          soundcloud_url: soundcloudUpload.permalink_url || null,
          metadata: {
            ...(beacon.metadata || {}),
            soundcloud_urn: soundcloudUpload.urn || null,
            soundcloud_url: soundcloudUpload.permalink_url || null,
          },
        });
      }

      return beacon;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audio-releases'] });
      queryClient.invalidateQueries({ queryKey: ['audio-drops-public'] });
      toast.success('Track dropped on the globe!');
      setTrackTitle('');
      setTrackDescription('');
      setWavFile(null);
      setUploading(false);
    },
    onError: (error) => {
      toast.error(error.message || 'Upload failed');
      setUploading(false);
    },
  });

  const { data: myDrops = [] } = useQuery({
    queryKey: ['owner-audio-drops', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const allDrops = await base44.entities.Beacon.filter(
        { kind: 'drop', mode: 'radio' },
        '-created_date'
      );
      return (Array.isArray(allDrops) ? allDrops : []).filter((b) => {
        const ownerEmail = b?.created_by || b?.owner_email;
        return ownerEmail && String(ownerEmail).toLowerCase() === String(currentUser.email).toLowerCase();
      });
    },
    enabled: !!currentUser && currentUser.role === 'admin',
  });

  const unpublishMutation = useMutation({
    mutationFn: async (beaconId) => {
      return base44.entities.Beacon.update(beaconId, { active: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audio-drops-public'] });
      queryClient.invalidateQueries({ queryKey: ['audio-releases'] });
      queryClient.invalidateQueries({ queryKey: ['owner-audio-drops'] });
      toast.success('Unpublished');
    },
    onError: (error) => {
      toast.error(error.message || 'Unpublish failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (beaconId) => {
      await base44.entities.Beacon.delete(beaconId);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audio-drops-public'] });
      queryClient.invalidateQueries({ queryKey: ['audio-releases'] });
      queryClient.invalidateQueries({ queryKey: ['owner-audio-drops'] });
      toast.success('Deleted');
      setPendingDeleteDropId(null);
    },
    onError: (error) => {
      toast.error(error.message || 'Delete failed');
    },
  });

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Hero */}
      <section className="relative py-20 sm:py-32 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1920&q=80" 
            alt="Music"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-[#B026FF]/40 to-black" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto text-center">
          <RadioIcon className="w-20 h-20 mx-auto mb-6 drop-shadow-2xl" />
          <KineticHeadline 
            text="MUSIC"
            as="h1"
            className="text-5xl sm:text-7xl md:text-9xl font-black italic mb-6 drop-shadow-2xl"
          />
          <p className="text-base sm:text-xl md:text-2xl uppercase tracking-wider text-white/90 mb-8 drop-shadow-lg">
            Live radio first. Then the releases. Then the rabbit hole.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button 
              onClick={openRadio}
              variant="cyan"
              size="xl"
              className="shadow-2xl w-full sm:w-auto font-black uppercase"
            >
              <Play className="w-5 h-5 mr-2" />
              LISTEN LIVE
            </Button>
            <Link to="/music/shows" className="block w-full sm:w-auto">
              <Button 
                variant="glass"
                size="xl"
                className="border-white/20 shadow-2xl backdrop-blur-sm w-full sm:w-auto font-black uppercase"
              >
                BROWSE SHOWS
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/5 mb-12">
            <TabsTrigger 
              value="live"
              className="data-[state=active]:bg-[#00D9FF] data-[state=active]:text-black"
            >
              <RadioIcon className="w-4 h-4 mr-2" />
              LIVE
            </TabsTrigger>
            <TabsTrigger 
              value="shows"
              className="data-[state=active]:bg-[#00D9FF] data-[state=active]:text-black"
            >
              <Music2 className="w-4 h-4 mr-2" />
              SHOWS
            </TabsTrigger>
            <TabsTrigger 
              value="releases"
              className="data-[state=active]:bg-[#00D9FF] data-[state=active]:text-black"
            >
              <Disc className="w-4 h-4 mr-2" />
              RELEASES
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live">
            <div className="bg-white/5 border-2 border-white/10 p-8 text-center">
              <div className="w-32 h-32 bg-[#B026FF] flex items-center justify-center mx-auto mb-6 animate-pulse">
                <RadioIcon className="w-16 h-16" />
              </div>
              <h3 className="text-3xl font-black uppercase mb-3">ON AIR NOW</h3>
              <p className="text-xl text-white/80 mb-2">HOTMESS RADIO</p>
              <p className="text-sm text-white/60 uppercase mb-8">24/7 LONDON OS SOUNDTRACK</p>
              <Button 
                onClick={openRadio}
                variant="cyan"
                size="xl"
                className="font-black uppercase"
              >
                {isRadioOpen ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    NOW PLAYING
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    LISTEN NOW
                  </>
                )}
              </Button>
            </div>

            <div className="mt-12">
              <h4 className="text-2xl font-black uppercase mb-6">NEXT UP</h4>
              <div className="grid gap-4">
                {nextUp.length > 0 ? (
                  nextUp.map(({ show, nextEpisode }) => (
                    <div key={`${show.id}:${nextEpisode.date.toISOString()}`} className="bg-white/5 border-l-4 border-[#B026FF] p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-black uppercase text-lg truncate">{show.title}</p>
                          <p className="text-sm text-white/60 truncate">{show.tagline}</p>
                        </div>

                        <div className="flex items-center gap-3 sm:justify-end">
                          <div className="text-right">
                            <p className="text-2xl font-mono font-bold text-[#B026FF] leading-none">
                              {nextEpisode.startTime}
                            </p>
                            <p className="text-xs text-white/60 uppercase tracking-wider">
                              {format(nextEpisode.date, 'EEE d MMM')} • London
                            </p>
                          </div>

                          <Button
                            type="button"
                            variant="glass"
                            onClick={() => addEpisodeToCalendar({ show, nextEpisode })}
                            className="border-white/40 font-black uppercase"
                          >
                            ADD
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-white/5 border-2 border-white/10">
                    <p className="text-white/60 uppercase text-sm tracking-wider">Schedule coming soon</p>
                    <Link to="/music/schedule" className="inline-block mt-4">
                      <Button variant="glass" className="border-white/20 font-black uppercase">
                        VIEW SCHEDULE
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="shows">
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-3xl font-black uppercase">RADIO SHOWS</h3>
                  <p className="text-white/60 uppercase text-sm tracking-wider">
                    Three tentpoles. One rule: care-first.
                  </p>
                </div>
                <Link to="/music/schedule" className="block w-full sm:w-auto">
                  <Button 
                    variant="glass"
                    className="border-white/20 font-black uppercase w-full sm:w-auto"
                  >
                    VIEW SCHEDULE
                  </Button>
                </Link>
              </div>

              {radioShows.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                  {radioShows.slice(0, 3).map((show) => (
                    <Link
                      key={show.id}
                      to={showUrlFromSlug(show.slug)}
                      className="group"
                    >
                      <div className="relative bg-white/5 border-2 border-white/10 hover:border-[#B026FF] transition-all p-6 h-full">
                        <div className="flex items-center justify-between mb-4">
                          <div className="px-2 py-1 bg-[#B026FF] text-white text-xs font-black uppercase">
                            SHOW
                          </div>
                          <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
                        </div>
                        <h4 className="text-2xl font-black uppercase mb-2 group-hover:text-[#B026FF] transition-colors">
                          {show.title}
                        </h4>
                        <p className="text-white/60 mb-4 text-sm">
                          {show.tagline}
                        </p>
                        <div className="flex items-start gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-[#B026FF] flex-shrink-0 mt-0.5" />
                          <span className="text-white/80">{show.schedule?.length ? `${show.schedule.length} weekly slot${show.schedule.length === 1 ? '' : 's'}` : 'Schedule coming soon'}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-white/5 border-2 border-white/10 mb-12">
                  <RadioIcon className="w-12 h-12 mx-auto mb-3 text-white/40" />
                  <h3 className="text-xl font-black mb-2">SHOWS COMING SOON</h3>
                  <p className="text-white/60">Check back for the weekly grid.</p>
                </div>
              )}

              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-black uppercase">MUSIC EVENTS</h3>
                  <p className="text-white/60 uppercase text-sm tracking-wider">
                    Live sets and upcoming beacons
                  </p>
                </div>
                <Link to="/events">
                  <Button
                    variant="glass"
                    className="border-white/20 font-black uppercase"
                  >
                    VIEW ALL EVENTS
                  </Button>
                </Link>
              </div>

              {musicEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {musicEvents.map((event) => (
                    <Link key={event.id} to={`/events/${encodeURIComponent(event.id)}`}>
                      <div className="group relative aspect-[4/3] overflow-hidden bg-white/5 border-2 border-white/10 hover:border-[#B026FF] transition-all">
                        {event.image_url && (
                          <img 
                            src={event.image_url} 
                            alt={event.title}
                            className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
                        <div className="absolute inset-0 flex flex-col justify-end p-6">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="px-2 py-1 bg-[#B026FF] text-white text-xs font-black uppercase">
                              MUSIC EVENT
                            </div>
                            {event.audio_url && (
                              <div className="px-2 py-1 bg-[#00D9FF] text-black text-xs font-black uppercase flex items-center gap-1">
                                <Play className="w-3 h-3" />
                                AUDIO
                              </div>
                            )}
                          </div>
                          <h4 className="font-black text-xl mb-2 line-clamp-2">{event.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-white/80">
                            {event.event_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(event.event_date), 'MMM d, HH:mm')}
                              </div>
                            )}
                            {event.city && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {event.city}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white/5 border-2 border-white/10">
                  <Music2 className="w-16 h-16 mx-auto mb-4 text-white/40" />
                  <h3 className="text-2xl font-black mb-2">NO MUSIC EVENTS YET</h3>
                  <p className="text-white/60 mb-6">Radio shows are live above — events land here when beacons are scheduled.</p>
                  <Link to="/events">
                    <Button 
                      variant="glass"
                      className="border-white/20 font-black uppercase"
                    >
                      BROWSE ALL EVENTS
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="releases">
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-3xl font-black uppercase">RAW CONVICT RECORDS</h3>
                  <p className="text-white/60 uppercase text-sm tracking-wider">
                    Latest drops, catalogue, and trending tracks
                  </p>
                </div>
                {canUpload && (
                  <Button
                    type="button"
                    variant="hot"
                    onClick={() => {
                      const el = document.getElementById('admin-drop-track');
                      el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
                    }}
                    className="font-black uppercase"
                  >
                    DROP TRACK
                  </Button>
                )}
              </div>

              {soundcloudPublicProfile?.permalink_url && (
                <div className="bg-white/5 border-2 border-white/10 p-6 mb-8">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="min-w-0">
                      <h4 className="text-xl font-black uppercase">SoundCloud</h4>
                      <p className="text-white/60 text-xs uppercase tracking-wider">
                        {soundcloudPublicProfile.username ? `@${soundcloudPublicProfile.username}` : 'Artist'}
                        {typeof soundcloudPublicProfile.followers_count === 'number' ? ` • ${soundcloudPublicProfile.followers_count} followers` : ''}
                        {typeof soundcloudPublicProfile.track_count === 'number' ? ` • ${soundcloudPublicProfile.track_count} tracks` : ''}
                      </p>
                    </div>
                    <Button asChild variant="glass" className="border-white/20 font-black uppercase">
                      <a
                        href={soundcloudPublicProfile.permalink_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Follow
                      </a>
                    </Button>
                  </div>

                  {Array.isArray(soundcloudPublicTracks?.tracks) && soundcloudPublicTracks.tracks.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {soundcloudTracksForReleases.slice(0, 8).map((t) => (
                        <div key={t.id} className="bg-black/40 border border-white/10 p-3">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="min-w-0">
                              <div className="font-black uppercase text-xs truncate">{t.title || 'Track'}</div>
                              {String(t?.slug || '') === 'hnhmess' || String(t?.id) === String(HNHMESS_FEATURED.id) ? (
                                <div className="text-[10px] text-white/50 uppercase tracking-wider">
                                  Featured release
                                </div>
                              ) : null}
                            </div>
                            {String(t?.slug || '') === 'hnhmess' || String(t?.id) === String(HNHMESS_FEATURED.id) ? (
                              <Button asChild variant="glass" className="border-white/20 h-8 px-3 text-[10px] font-black uppercase">
                                <Link to="/music/releases/hnhmess">Open</Link>
                              </Button>
                            ) : null}
                          </div>
                          <SoundCloudEmbed
                            urlOrUrn={t?.urlOrUrn || `soundcloud:tracks:${t.id}`}
                            title={t.title ? `${t.title} (SoundCloud)` : 'SoundCloud player'}
                            visual={true}
                            widgetParams={{
                              auto_play: false,
                              show_artwork: true,
                              show_playcount: true,
                              show_user: true,
                              sharing: true,
                              download: false,
                              buying: false,
                              single_active: true,
                            }}
                            className="w-full"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {canUpload && (
                <div id="admin-drop-track" className="bg-white/5 border-2 border-white/10 p-6 mb-8">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h4 className="text-xl font-black uppercase">Owner Upload</h4>
                      <p className="text-white/60 text-xs uppercase tracking-wider">Drop a WAV + optionally publish to SoundCloud</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-widest text-white/40">
                        SoundCloud: {soundcloudStatus?.connected ? 'Connected' : 'Not connected'}
                      </div>
                      {!soundcloudStatus?.connected && (
                        <Button
                          type="button"
                          variant="glass"
                          onClick={() => connectSoundcloudMutation.mutate()}
                          disabled={connectSoundcloudMutation.isPending}
                          className="mt-2 border-white/20 h-8 px-3 text-xs font-black uppercase"
                        >
                          {connectSoundcloudMutation.isPending ? 'Connecting…' : 'Connect SoundCloud'}
                        </Button>
                      )}
                      {soundcloudStatus?.connected && (
                        <Button
                          type="button"
                          variant="glass"
                          onClick={() => disconnectSoundcloudMutation.mutate()}
                          disabled={disconnectSoundcloudMutation.isPending}
                          className="mt-2 border-white/20 h-8 px-3 text-xs font-black uppercase"
                        >
                          {disconnectSoundcloudMutation.isPending ? 'Disconnecting…' : 'Disconnect'}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs uppercase tracking-widest text-white/60 mb-2 block">Track Title</label>
                      <Input
                        value={trackTitle}
                        onChange={(e) => setTrackTitle(e.target.value)}
                        placeholder="Track name"
                        className="bg-white/5 border-2 border-white/20"
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-widest text-white/60 mb-2 block">WAV File</label>
                      <div className="border-2 border-dashed border-white/20 p-4 text-center hover:border-[#B026FF] transition-colors">
                        <input
                          type="file"
                          accept=".wav"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (!file.name.toLowerCase().endsWith('.wav')) {
                              toast.error('Only WAV files accepted');
                              return;
                            }
                            setWavFile(file);
                          }}
                          className="hidden"
                          id="wav-upload-music"
                        />
                        <label htmlFor="wav-upload-music" className="cursor-pointer">
                          <Upload className="w-8 h-8 mx-auto mb-2 text-white/40" />
                          <p className="text-sm font-bold uppercase">
                            {wavFile ? wavFile.name : 'Click to upload WAV'}
                          </p>
                          <p className="text-xs text-white/40 mt-1">WAV format only</p>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-xs uppercase tracking-widest text-white/60 mb-2 block">Description (Optional)</label>
                    <Textarea
                      value={trackDescription}
                      onChange={(e) => setTrackDescription(e.target.value)}
                      placeholder="Track details"
                      className="bg-white/5 border-2 border-white/20"
                      rows={3}
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={() => uploadDropMutation.mutate()}
                    disabled={!trackTitle.trim() || !wavFile || uploading}
                    variant="hot"
                    size="xl"
                    className="mt-4 w-full font-black uppercase"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        DROPPING ON GLOBE…
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 mr-2" />
                        DROP TRACK
                      </>
                    )}
                  </Button>

                  <div className="mt-6 border-t border-white/10 pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-black uppercase">My Drops</h5>
                      <div className="text-[10px] uppercase tracking-widest text-white/40">
                        {myDrops.length} total
                      </div>
                    </div>

                    {myDrops.length === 0 ? (
                      <div className="text-xs text-white/50">No drops yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {myDrops.map((drop) => (
                          <div
                            key={drop.id}
                            className="flex items-center justify-between gap-3 p-3 bg-black/40 border border-white/10"
                          >
                            <div className="min-w-0">
                              <div className="font-black uppercase text-xs truncate">{drop.title || drop.id}</div>
                              <div className="text-[10px] text-white/50 uppercase tracking-wider">
                                {drop.city ? drop.city : '—'} • {drop.active === false ? 'UNPUBLISHED' : 'PUBLISHED'}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="glass"
                                className="border-white/20 text-[10px] font-black uppercase h-8"
                                onClick={() => unpublishMutation.mutate(drop.id)}
                                disabled={unpublishMutation.isPending || deleteMutation.isPending || drop.active === false}
                              >
                                UNPUBLISH
                              </Button>
                              {pendingDeleteDropId === drop.id ? (
                                <>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="border-red-500/40 text-red-300 hover:bg-red-500 hover:text-black text-[10px] font-black uppercase h-8"
                                    onClick={() => deleteMutation.mutate(drop.id)}
                                    disabled={deleteMutation.isPending || unpublishMutation.isPending}
                                  >
                                    CONFIRM
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="glass"
                                    className="border-white/20 text-[10px] font-black uppercase h-8"
                                    onClick={() => setPendingDeleteDropId(null)}
                                    disabled={deleteMutation.isPending}
                                  >
                                    CANCEL
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="border-red-500/40 text-red-300 hover:bg-red-500 hover:text-black text-[10px] font-black uppercase h-8"
                                  onClick={() => setPendingDeleteDropId(drop.id)}
                                  disabled={deleteMutation.isPending || unpublishMutation.isPending}
                                >
                                  DELETE
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {combinedReleases.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {combinedReleases.map((release) => (
                    <div 
                      key={release.track_id}
                      className="group relative bg-white/5 border-2 border-white/10 hover:border-[#B026FF] transition-all p-4"
                    >
                      <div className="aspect-square bg-gradient-to-br from-[#B026FF]/20 to-black/40 mb-4 flex items-center justify-center">
                        <Disc className="w-16 h-16 text-[#B026FF] group-hover:animate-spin" style={{ animationDuration: '3s' }} />
                      </div>

                      {(release.soundcloud_urn || release.soundcloud_url) && (
                        <div className="mb-4">
                          <SoundCloudEmbed
                            urlOrUrn={release.soundcloud_urn || release.soundcloud_url}
                            title={release.beacon?.title ? `${release.beacon.title} (SoundCloud)` : 'SoundCloud player'}
                            visual={false}
                            className="w-full"
                          />
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {release.mood && (
                            <span className="px-2 py-0.5 bg-[#B026FF] text-white text-[10px] font-black uppercase">
                              {release.mood}
                            </span>
                          )}
                          {release.bpm !== null && release.bpm !== undefined && (
                            <span className="px-2 py-0.5 bg-white/20 text-white text-[10px] font-black uppercase">
                              {release.bpm} BPM
                            </span>
                          )}
                        </div>
                        
                        <h4 className="font-black uppercase text-sm line-clamp-2">
                          {release.beacon?.title || release.track_id}
                        </h4>
                        
                        {release.genre && (
                          <p className="text-xs text-white/60 uppercase">{release.genre}</p>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          <div className="flex items-center gap-1 text-xs text-white/60">
                            <TrendingUp className="w-3 h-3" />
                            {release.play_count || 0} plays
                          </div>
                          
                          {release.soundcloud_url && (
                            <a 
                              href={release.soundcloud_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-[#FF1493] text-black hover:bg-white transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>

                        {release.beacon && (
                          <Link 
                            to={createPageUrl(`BeaconDetail?id=${release.beacon.id}`)}
                            className="block mt-2"
                          >
                            <Button 
                              variant="glass"
                              className="w-full border-white/20 text-xs font-black uppercase"
                            >
                              VIEW DETAILS
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white/5 border-2 border-white/10">
                  <Disc className="w-16 h-16 mx-auto mb-4 text-white/40" />
                  <h3 className="text-2xl font-black mb-2">NO RELEASES YET</h3>
                  <p className="text-white/60 mb-6">Label catalogue coming soon</p>
                  {currentUser && currentUser.role === 'admin' && (
                    <Link to={createPageUrl('CreateBeacon')}>
                      <Button 
                        variant="hot"
                        className="font-black uppercase"
                      >
                        ADD FIRST RELEASE
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}