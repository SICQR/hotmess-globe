import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Music, Loader2, CheckCircle2, Link2, Unlink, CloudUpload } from 'lucide-react';
import { toast } from 'sonner';
import logger from '@/utils/logger';

/**
 * RecordManager - RAW CONVICT RECORDS Admin Terminal
 *
 * Upload WAV files to storage and publish audio_drop beacons on the globe.
 * Now with full SoundCloud OAuth integration.
 */

// SoundCloud OAuth hook
function useSoundCloudAuth() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [username, setUsername] = useState<string | null>(null);

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/soundcloud/status');
      const data = await res.json();
      setStatus(data.connected ? 'connected' : 'disconnected');
      setUsername(data.username || null);
    } catch {
      setStatus('disconnected');
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const connect = () => {
    window.location.href = '/api/soundcloud/authorize';
  };

  const disconnect = async () => {
    try {
      await fetch('/api/soundcloud/disconnect', { method: 'POST' });
      setStatus('disconnected');
      setUsername(null);
      toast.success('SoundCloud disconnected');
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  return { status, username, connect, disconnect, refresh: checkStatus };
}

export default function RecordManager() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('London');
  const [lat, setLat] = useState(51.5074);
  const [lng, setLng] = useState(-0.1278);
  const [wavFile, setWavFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [publishToSoundCloud, setPublishToSoundCloud] = useState(true);
  
  const soundcloud = useSoundCloudAuth();

  type UploadAudioVars = {
    title: string;
    description: string;
    city: string;
    lat: number;
    lng: number;
    wavFile: File;
  };

  const queryClient = useQueryClient();

  const { data: audioBeacons = [] } = useQuery({
    queryKey: ['audio-beacons'],
    queryFn: () => base44.entities.Beacon.filter({ mode: 'radio' })
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: UploadAudioVars) => {
      setUploading(true);
      
      // Step 1: Upload WAV file to storage
      const { file_url } = await base44.integrations.Core.UploadFile({ file: data.wavFile });
      
      let soundcloudTrackId = null;
      let soundcloudUrl = null;
      
      // Step 2: If SoundCloud connected and enabled, upload there too
      if (publishToSoundCloud && soundcloud.status === 'connected') {
        const formData = new FormData();
        formData.append('file', data.wavFile);
        formData.append('title', data.title);
        formData.append('description', data.description || '');
        
        const scRes = await fetch('/api/soundcloud/upload', {
          method: 'POST',
          body: formData
        });
        
        if (scRes.ok) {
          const scData = await scRes.json();
          soundcloudTrackId = scData.id;
          soundcloudUrl = scData.permalink_url;
          toast.success('Published to SoundCloud!');
        } else {
          toast.error('SoundCloud upload failed, continuing with local storage');
        }
      }
      
      // Step 3: Create audio_drop beacon
      const beacon = await base44.entities.Beacon.create({
        title: data.title,
        description: data.description,
        kind: 'drop',
        mode: 'radio',
        city: data.city,
        lat: data.lat,
        lng: data.lng,
        audio_url: soundcloudUrl || file_url,
        track_id: soundcloudTrackId || `raw_${Date.now()}`,
        xp_scan: 10,
        active: true
      });
      
      return beacon;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audio-beacons'] });
      toast.success('Audio drop created and live on globe!');
      
      // Reset form
      setTitle('');
      setDescription('');
      setWavFile(null);
      setUploading(false);
    },
    onError: (error: any) => {
      logger.error('Upload failed', { error: error.message, fileName: wavFile?.name });
      toast.error('Upload failed. Try again.');
      setUploading(false);
    }
  });

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
          className="bg-white/5 border-2 border-[#FF5500] p-6 mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CloudUpload className="w-8 h-8 text-[#FF5500]" />
              <div>
                <h3 className="font-black uppercase">SoundCloud</h3>
                <p className="text-xs text-white/60">
                  {soundcloud.status === 'loading' && 'Checking connection...'}
                  {soundcloud.status === 'connected' && `Connected as ${soundcloud.username}`}
                  {soundcloud.status === 'disconnected' && 'Not connected'}
                </p>
              </div>
            </div>
            {soundcloud.status === 'connected' ? (
              <Button
                onClick={soundcloud.disconnect}
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-500/10"
              >
                <Unlink className="w-4 h-4 mr-2" />
                Disconnect
              </Button>
            ) : soundcloud.status === 'disconnected' ? (
              <Button
                onClick={soundcloud.connect}
                className="bg-[#FF5500] hover:bg-[#FF5500]/90"
              >
                <Link2 className="w-4 h-4 mr-2" />
                Connect SoundCloud
              </Button>
            ) : null}
          </div>
          
          {soundcloud.status === 'connected' && (
            <label className="flex items-center gap-2 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={publishToSoundCloud}
                onChange={(e) => setPublishToSoundCloud(e.target.checked)}
                className="w-4 h-4 accent-[#FF5500]"
              />
              <span className="text-sm">Publish tracks to SoundCloud automatically</span>
            </label>
          )}
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
                WAV File *
              </label>
              <input
                type="file"
                accept=".wav"
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
            {audioBeacons.map((beacon) => (
              <div
                key={beacon.id}
                className="flex items-center justify-between p-3 bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-3">
                  <Music className="w-5 h-5 text-[#B026FF]" />
                  <div>
                    <p className="font-bold">{beacon.title}</p>
                    <p className="text-xs text-white/60">{beacon.city} • {beacon.xp_scan} XP</p>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-[#39FF14]" />
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