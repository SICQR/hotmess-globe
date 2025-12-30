import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Save, User, Music, Sparkles, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const VIBE_OPTIONS = ['techno', 'house', 'drag', 'indie', 'late_night', 'chill', 'wild', 'artsy'];

export default function EditProfile() {
  const [currentUser, setCurrentUser] = useState(null);
  const [bio, setBio] = useState('');
  const [preferredVibes, setPreferredVibes] = useState([]);
  const [musicTaste, setMusicTaste] = useState('');
  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    twitter: '',
    spotify: '',
    soundcloud: ''
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        setBio(user.bio || '');
        setPreferredVibes(user.preferred_vibes || []);
        setMusicTaste((user.music_taste || []).join(', '));
        setSocialLinks(user.social_links || {
          instagram: '',
          twitter: '',
          spotify: '',
          soundcloud: ''
        });
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('Profile updated!');
      navigate(createPageUrl(`Profile?email=${currentUser.email}`));
    },
    onError: () => {
      toast.error('Failed to update profile');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const musicArray = musicTaste.split(',').map(s => s.trim()).filter(Boolean);
    
    updateProfileMutation.mutate({
      bio,
      preferred_vibes: preferredVibes,
      music_taste: musicArray,
      social_links: socialLinks
    });
  };

  const toggleVibe = (vibe) => {
    setPreferredVibes(prev =>
      prev.includes(vibe) ? prev.filter(v => v !== vibe) : [...prev, vibe]
    );
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <User className="w-12 h-12 text-white/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <h1 className="text-3xl font-black uppercase mb-8">Edit Profile</h1>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Bio Section */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-5 h-5 text-[#FF1493]" />
                <Label className="text-lg font-bold uppercase">Bio</Label>
              </div>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
                maxLength={300}
                className="bg-black border-white/20"
              />
              <p className="text-xs text-white/40 mt-2">{bio.length}/300 characters</p>
            </div>

            {/* Vibes Section */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-[#FFEB3B]" />
                <Label className="text-lg font-bold uppercase">Preferred Vibes</Label>
              </div>
              <div className="flex flex-wrap gap-2">
                {VIBE_OPTIONS.map(vibe => (
                  <button
                    key={vibe}
                    type="button"
                    onClick={() => toggleVibe(vibe)}
                    className={`px-4 py-2 rounded-lg font-bold uppercase text-sm transition-all ${
                      preferredVibes.includes(vibe)
                        ? 'bg-[#FF1493] text-black'
                        : 'bg-white/5 border border-white/20 text-white hover:bg-white/10'
                    }`}
                  >
                    {vibe}
                  </button>
                ))}
              </div>
            </div>

            {/* Music Taste Section */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Music className="w-5 h-5 text-[#B026FF]" />
                <Label className="text-lg font-bold uppercase">Music Taste</Label>
              </div>
              <Input
                value={musicTaste}
                onChange={(e) => setMusicTaste(e.target.value)}
                placeholder="e.g., Techno, House, Amelie Lens, Nina Kraviz"
                className="bg-black border-white/20"
              />
              <p className="text-xs text-white/40 mt-2">Separate with commas</p>
            </div>

            {/* Social Links Section */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <LinkIcon className="w-5 h-5 text-[#00D9FF]" />
                <Label className="text-lg font-bold uppercase">Social Links</Label>
              </div>
              <p className="text-xs text-white/40 mb-4">
                🔒 Only visible to users you've completed a Telegram handshake with
              </p>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-white/60 mb-2 block">Instagram</Label>
                  <Input
                    value={socialLinks.instagram}
                    onChange={(e) => setSocialLinks({...socialLinks, instagram: e.target.value})}
                    placeholder="@username"
                    className="bg-black border-white/20"
                  />
                </div>
                <div>
                  <Label className="text-sm text-white/60 mb-2 block">Twitter/X</Label>
                  <Input
                    value={socialLinks.twitter}
                    onChange={(e) => setSocialLinks({...socialLinks, twitter: e.target.value})}
                    placeholder="@username"
                    className="bg-black border-white/20"
                  />
                </div>
                <div>
                  <Label className="text-sm text-white/60 mb-2 block">Spotify</Label>
                  <Input
                    value={socialLinks.spotify}
                    onChange={(e) => setSocialLinks({...socialLinks, spotify: e.target.value})}
                    placeholder="Profile URL or username"
                    className="bg-black border-white/20"
                  />
                </div>
                <div>
                  <Label className="text-sm text-white/60 mb-2 block">SoundCloud</Label>
                  <Input
                    value={socialLinks.soundcloud}
                    onChange={(e) => setSocialLinks({...socialLinks, soundcloud: e.target.value})}
                    placeholder="Profile URL or username"
                    className="bg-black border-white/20"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="w-full bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black text-lg py-6"
            >
              {updateProfileMutation.isPending ? (
                'SAVING...'
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  SAVE PROFILE
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}