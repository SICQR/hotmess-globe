import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Music, Upload, Loader2, Radio, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { snapToGrid } from '../components/utils/locationPrivacy';

export default function RecordManager() {
  const [currentUser, setCurrentUser] = useState(null);
  const [trackTitle, setTrackTitle] = useState('');
  const [trackDescription, setTrackDescription] = useState('');
  const [wavFile, setWavFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: myDrops = [] } = useQuery({
    queryKey: ['audio-drops', currentUser?.email],
    queryFn: () => base44.entities.Beacon.filter({
      kind: 'drop',
      mode: 'radio',
      created_by: currentUser.email
    }, '-created_date'),
    enabled: !!currentUser,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!wavFile || !trackTitle.trim()) {
        throw new Error('Title and WAV file required');
      }

      // Get user location with privacy grid
      let location = { lat: 51.5074, lng: -0.1278 }; // Default London
      if (navigator.geolocation) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          const snapped = snapToGrid(position.coords.latitude, position.coords.longitude);
          location = snapped;
        } catch (error) {
          console.log('Location access denied, using default');
        }
      }

      // Upload WAV to storage
      const { file_url } = await base44.integrations.Core.UploadFile({ file: wavFile });

      // Create audio drop beacon
      const beacon = await base44.entities.Beacon.create({
        title: trackTitle,
        description: trackDescription,
        kind: 'drop',
        mode: 'radio',
        lat: location.lat,
        lng: location.lng,
        city: currentUser.city || 'London',
        xp_scan: 200, // 2x base XP for label tracks
        audio_url: file_url,
        track_id: `convict_${Date.now()}`,
        active: true,
        status: 'published',
      });

      return beacon;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['audio-drops']);
      queryClient.invalidateQueries(['all-beacons']);
      toast.success('Track dropped on the globe! 2x XP for listeners.');
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

  const deleteMutation = useMutation({
    mutationFn: (beaconId) => base44.entities.Beacon.delete(beaconId),
    onSuccess: () => {
      queryClient.invalidateQueries(['audio-drops']);
      toast.success('Track removed');
    },
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.wav')) {
        toast.error('Only WAV files accepted');
        return;
      }
      setWavFile(file);
    }
  };

  const handleUpload = () => {
    setUploading(true);
    uploadMutation.mutate();
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-2">
            RAW <span className="text-[#FF1493]">CONVICT</span> RECORDS
          </h1>
          <p className="text-white/60 uppercase text-sm tracking-wider">
            Headless label. Drop raw WAV tracks on the globe. 2x XP for listeners.
          </p>
        </motion.div>

        {/* Upload Form */}
        <div className="bg-black border-2 border-[#FF1493] p-8 mb-8">
          <div className="space-y-6">
            <div>
              <label className="text-xs uppercase tracking-widest text-white/60 mb-2 block">
                Track Title
              </label>
              <Input
                value={trackTitle}
                onChange={(e) => setTrackTitle(e.target.value)}
                placeholder="Track name"
                className="bg-white/5 border-2 border-white/20"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-white/60 mb-2 block">
                Description (Optional)
              </label>
              <Textarea
                value={trackDescription}
                onChange={(e) => setTrackDescription(e.target.value)}
                placeholder="Track details"
                className="bg-white/5 border-2 border-white/20"
                rows={3}
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-widest text-white/60 mb-2 block">
                WAV File
              </label>
              <div className="border-2 border-dashed border-white/20 p-6 text-center hover:border-[#FF1493] transition-colors">
                <input
                  type="file"
                  accept=".wav"
                  onChange={handleFileChange}
                  className="hidden"
                  id="wav-upload"
                />
                <label htmlFor="wav-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-3 text-white/40" />
                  <p className="text-sm font-bold uppercase">
                    {wavFile ? wavFile.name : 'Click to upload WAV'}
                  </p>
                  <p className="text-xs text-white/40 mt-1">WAV format only</p>
                </label>
              </div>
            </div>

            <Button
              onClick={handleUpload}
              disabled={!trackTitle.trim() || !wavFile || uploading}
              className="w-full bg-[#FF1493] hover:bg-white text-black font-black py-6 border-2 border-white"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  DROPPING ON GLOBE...
                </>
              ) : (
                <>
                  <Radio className="w-5 h-5 mr-2" />
                  DROP TRACK
                </>
              )}
            </Button>
          </div>
        </div>

        {/* My Drops */}
        <div>
          <h2 className="text-2xl font-black uppercase mb-4">
            My Drops ({myDrops.length})
          </h2>
          {myDrops.length === 0 ? (
            <div className="text-center py-12 border-2 border-white/10">
              <Music className="w-16 h-16 text-white/20 mx-auto mb-4" />
              <p className="text-white/40">No tracks dropped yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myDrops.map((drop) => (
                <motion.div
                  key={drop.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white/5 border border-white/10 rounded-xl p-6 flex items-start gap-4"
                >
                  <div className="w-16 h-16 bg-[#FF1493] flex items-center justify-center flex-shrink-0">
                    <Music className="w-8 h-8 text-black" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-lg mb-1">{drop.title}</h3>
                    {drop.description && (
                      <p className="text-sm text-white/60 mb-2">{drop.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-white/40">
                      <span>📍 {drop.city}</span>
                      <span>⚡ {drop.xp_scan} XP per listen</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => deleteMutation.mutate(drop.id)}
                    variant="ghost"
                    size="icon"
                    className="text-white/40 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}