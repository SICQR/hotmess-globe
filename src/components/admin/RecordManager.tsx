import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Music, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import logger from '@/utils/logger';

/**
 * RecordManager - RAW CONVICT RECORDS Admin Terminal
 * 
 * Upload WAV files to SoundCloud Pro via Edge Function
 * Automatically creates audio_drop beacons on the globe
 */
export default function RecordManager() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('London');
  const [lat, setLat] = useState(51.5074);
  const [lng, setLng] = useState(-0.1278);
  const [wavFile, setWavFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const queryClient = useQueryClient();

  const { data: audioBeacons = [] } = useQuery({
    queryKey: ['audio-beacons'],
    queryFn: () => base44.entities.Beacon.filter({ mode: 'radio' })
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: any) => {
      setUploading(true);
      
      // Step 1: Upload WAV file to storage
      const { file_url } = await base44.integrations.Core.UploadFile({ file: data.wavFile });
      
      // Step 2: Create audio_drop beacon
      // NOTE: In production, call Edge Function to proxy to SoundCloud Pro API
      // For now, we'll create the beacon with the uploaded file URL
      const beacon = await base44.entities.Beacon.create({
        title: data.title,
        description: data.description,
        kind: 'drop',
        mode: 'radio',
        city: data.city,
        lat: data.lat,
        lng: data.lng,
        audio_url: file_url,
        track_id: `raw_${Date.now()}`, // In production, this comes from SoundCloud
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

  const handleSubmit = (e: React.FormEvent) => {
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
      wavFile
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
                  file:bg-[#B026FF] file:text-black
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
              className="w-full bg-[#B026FF] hover:bg-[#B026FF]/90 text-black font-black text-lg py-6"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  UPLOADING TO SOUNDCLOUD...
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