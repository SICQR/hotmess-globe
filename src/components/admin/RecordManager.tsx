import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Upload, Music, Loader2, CheckCircle2, AlertCircle, Cloud, Link2, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import logger from '@/utils/logger';
import { useAuth } from '@/lib/AuthContext';

/**
 * RecordManager - RAW CONVICT RECORDS Admin Terminal
 *
 * Upload WAV files to storage and publish audio_drop beacons on the globe.
 * Optionally publish to SoundCloud if connected.
 */
export default function RecordManager() {
  useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('London');
  const [lat, setLat] = useState(51.5074);
  const [lng, setLng] = useState(-0.1278);
  const [wavFile, setWavFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [publishToSoundCloud, setPublishToSoundCloud] = useState(false);

  type UploadAudioVars = {
    title: string;
    description: string;
    city: string;
    lat: number;
    lng: number;
    wavFile: File;
    publishToSoundCloud: boolean;
  };

  const queryClient = useQueryClient();

  // Check SoundCloud connection status
  const { data: soundCloudStatus, isLoading: scStatusLoading, refetch: refetchScStatus } = useQuery({
    queryKey: ['soundcloud-status'],
    queryFn: async () => {
      const token = await base44.auth.getAccessToken?.() || localStorage.getItem('supabase.auth.token');
      const res = await fetch('/api/soundcloud/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 403) return { connected: false, authorized: false };
        throw new Error('Failed to check SoundCloud status');
      }
      return res.json();
    },
    retry: false,
    staleTime: 60000,
  });

  const { data: audioBeacons = [] } = useQuery({
    queryKey: ['audio-beacons'],
    queryFn: () => base44.entities.Beacon.filter({ mode: 'radio' })
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: UploadAudioVars) => {
      setUploading(true);
      setUploadProgress('Uploading file...');
      
      // Step 1: Upload WAV file to storage
      const { file_url } = await base44.integrations.Core.UploadFile({ file: data.wavFile });
      
      let soundCloudData = null;
      
      // Step 2: Optionally upload to SoundCloud
      if (data.publishToSoundCloud && soundCloudStatus?.connected) {
        setUploadProgress('Publishing to SoundCloud...');
        
        const token = await base44.auth.getAccessToken?.() || localStorage.getItem('supabase.auth.token');
        const formData = new FormData();
        formData.append('track[title]', data.title);
        formData.append('track[description]', data.description || '');
        formData.append('track[sharing]', 'public');
        formData.append('track[asset_data]', data.wavFile);
        
        const scRes = await fetch('/api/soundcloud/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        
        if (!scRes.ok) {
          const err = await scRes.json().catch(() => ({}));
          throw new Error(err.error || 'SoundCloud upload failed');
        }
        
        soundCloudData = await scRes.json();
        logger.info('SoundCloud upload successful', { trackId: soundCloudData.id });
      }
      
      setUploadProgress('Creating beacon...');
      
      // Step 3: Create audio_drop beacon
      const beacon = await base44.entities.Beacon.create({
        title: data.title,
        description: data.description,
        kind: 'drop',
        mode: 'radio',
        city: data.city,
        lat: data.lat,
        lng: data.lng,
        audio_url: soundCloudData?.permalink_url || file_url,
        track_id: soundCloudData?.id ? `sc_${soundCloudData.id}` : `raw_${Date.now()}`,
        xp_scan: 10,
        active: true
      });
      
      return { beacon, soundCloudData };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['audio-beacons'] });
      
      if (result.soundCloudData) {
        toast.success('Track published to SoundCloud and live on globe!', {
          action: {
            label: 'View on SoundCloud',
            onClick: () => window.open(result.soundCloudData.permalink_url, '_blank')
          }
        });
      } else {
        toast.success('Audio drop created and live on globe!');
      }
      
      // Reset form
      setTitle('');
      setDescription('');
      setWavFile(null);
      setUploading(false);
      setUploadProgress('');
    },
    onError: (error: any) => {
      logger.error('Upload failed', { error: error.message, fileName: wavFile?.name });
      toast.error(error.message || 'Upload failed. Try again.');
      setUploading(false);
      setUploadProgress('');
    }
  });
  
  // Connect to SoundCloud
  const handleConnectSoundCloud = async () => {
    try {
      const token = await base44.auth.getAccessToken?.() || localStorage.getItem('supabase.auth.token');
      const res = await fetch('/api/soundcloud/authorize', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to start authorization');
      
      const { url } = await res.json();
      window.location.href = url;
    } catch (err: any) {
      toast.error(err.message || 'Failed to connect to SoundCloud');
    }
  };
  
  // Disconnect from SoundCloud
  const handleDisconnectSoundCloud = async () => {
    try {
      const token = await base44.auth.getAccessToken?.() || localStorage.getItem('supabase.auth.token');
      const res = await fetch('/api/soundcloud/disconnect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to disconnect');
      
      toast.success('Disconnected from SoundCloud');
      refetchScStatus();
    } catch (err: any) {
      toast.error(err.message || 'Failed to disconnect');
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!wavFile || !title || !city) {
      toast.error('Missing required fields');
      return;
    }

    uploadMutation.mutate({
      title,
      description,
      city,
      lat,
      lng,
      wavFile,
      publishToSoundCloud,
    });
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-black uppercase mb-2">
            <span className="text-[#B026FF]">RAW</span> CONVICT RECORDS
          </h1>
          <p className="text-sm text-white/60 uppercase tracking-wider">
            Headless Label Terminal - Admin Only
          </p>
        </div>

        {/* SoundCloud Connection Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border border-white/10 p-4 mb-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Cloud className={`w-6 h-6 ${soundCloudStatus?.connected ? 'text-[#FF5500]' : 'text-white/40'}`} />
            <div>
              <p className="font-bold text-sm">SoundCloud</p>
              {scStatusLoading ? (
                <p className="text-xs text-white/60">Checking status...</p>
              ) : soundCloudStatus?.connected ? (
                <p className="text-xs text-[#39FF14]">
                  Connected {soundCloudStatus.expired && <span className="text-red-400">(Token expired)</span>}
                </p>
              ) : soundCloudStatus?.authorized === false ? (
                <p className="text-xs text-yellow-400">Not authorized for uploads</p>
              ) : (
                <p className="text-xs text-white/60">Not connected</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refetchScStatus()}
              disabled={scStatusLoading}
              className="text-white/60 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${scStatusLoading ? 'animate-spin' : ''}`} />
            </Button>
            {soundCloudStatus?.connected ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDisconnectSoundCloud}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                Disconnect
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleConnectSoundCloud}
                className="bg-[#FF5500] hover:bg-[#FF5500]/80 text-white"
              >
                <Link2 className="w-4 h-4 mr-1" />
                Connect
              </Button>
            )}
          </div>
        </motion.div>

        {/* Upload Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 border-2 border-[#B026FF] p-8 mb-8"
        >
          <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-2">
            <Upload className="w-6 h-6 text-[#B026FF]" />
            Drop New Track
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">
                Track Title *
              </label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Track name"
                className="bg-white/5 border-white/20 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">
                Description
              </label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Track details"
                className="bg-white/5 border-white/20 text-white h-24"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">
                  City *
                </label>
                <Input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="bg-white/5 border-white/20 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">
                  Latitude
                </label>
                <Input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value))}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">
                  Longitude
                </label>
                <Input
                  type="number"
                  step="0.0001"
                  value={lng}
                  onChange={(e) => setLng(parseFloat(e.target.value))}
                  className="bg-white/5 border-white/20 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-widest text-white/60 mb-2">
                Audio File *
              </label>
              <input
                type="file"
                accept=".wav,.mp3,.flac,.aiff,.ogg"
                onChange={(e) => setWavFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-white/60
                  file:mr-4 file:py-2 file:px-4
                  file:border-0
                  file:text-sm file:font-bold
                  file:bg-[#B026FF] file:text-white
                  hover:file:bg-[#B026FF]/80
                  file:cursor-pointer"
                required
              />
              {wavFile && (
                <p className="text-xs text-white/60 mt-2">
                  Selected: {wavFile.name} ({(wavFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* SoundCloud Publishing Option */}
            {soundCloudStatus?.connected && !soundCloudStatus.expired && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center justify-between p-4 bg-[#FF5500]/10 border border-[#FF5500]/30 rounded"
              >
                <div className="flex items-center gap-3">
                  <Cloud className="w-5 h-5 text-[#FF5500]" />
                  <div>
                    <p className="font-bold text-sm">Publish to SoundCloud</p>
                    <p className="text-xs text-white/60">Also upload track to your SoundCloud account</p>
                  </div>
                </div>
                <Switch
                  checked={publishToSoundCloud}
                  onCheckedChange={setPublishToSoundCloud}
                />
              </motion.div>
            )}

            {/* Upload Progress */}
            <AnimatePresence>
              {uploading && uploadProgress && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-3 p-3 bg-[#B026FF]/20 border border-[#B026FF]/40 rounded"
                >
                  <Loader2 className="w-5 h-5 animate-spin text-[#B026FF]" />
                  <p className="text-sm font-medium">{uploadProgress}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              disabled={uploading}
              className="w-full bg-[#B026FF] hover:bg-[#B026FF]/90 text-white font-black text-lg py-6"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  UPLOADING...
                </>
              ) : (
                <>
                  <Music className="w-5 h-5 mr-2" />
                  DROP TRACK ON GLOBE
                </>
              )}
            </Button>
          </form>
        </motion.div>

        {/* Existing Audio Drops */}
        <div className="bg-white/5 border-2 border-white/10 p-6">
          <h2 className="text-2xl font-black uppercase mb-4">Live Audio Drops</h2>
          <div className="space-y-3">
            {audioBeacons.map((beacon: any) => (
              <div
                key={beacon.id}
                className="flex items-center justify-between p-3 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Music className="w-5 h-5 text-[#B026FF]" />
                  <div>
                    <p className="font-bold">{beacon.title}</p>
                    <p className="text-xs text-white/60">{beacon.city} • {beacon.xp_scan} XP</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {beacon.track_id?.startsWith('sc_') && beacon.audio_url && (
                    <a
                      href={beacon.audio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 hover:bg-[#FF5500]/20 rounded transition-colors"
                      title="View on SoundCloud"
                    >
                      <ExternalLink className="w-4 h-4 text-[#FF5500]" />
                    </a>
                  )}
                  <CheckCircle2 className="w-5 h-5 text-[#39FF14]" />
                </div>
              </div>
            ))}
            {audioBeacons.length === 0 && (
              <p className="text-center text-white/40 py-8">No audio drops yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}