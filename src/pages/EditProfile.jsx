import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Save, User, Music, Sparkles, Link as LinkIcon, Upload, Briefcase, Zap, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const VIBE_OPTIONS = ['techno', 'house', 'drag', 'indie', 'late_night', 'chill', 'wild', 'artsy'];
const EVENT_VIBES = ['techno', 'house', 'drag', 'late_night', 'underground', 'warehouse', 'rooftop', 'intimate'];
const ACTIVITY_STATUSES = [
  { value: 'online', label: 'Online', color: '#00D9FF' },
  { value: 'busy', label: 'Busy', color: '#FF6B35' },
  { value: 'looking_for_collabs', label: 'Looking for Collaborators', color: '#39FF14' },
  { value: 'at_event', label: 'At Event', color: '#FF1493' },
  { value: 'offline', label: 'Offline', color: '#666' },
];
const SKILLS = ['DJ', 'Producer', 'Designer', 'Photographer', 'Videographer', 'Promoter', 'Artist', 'Performer'];

export default function EditProfile() {
  const [currentUser, setCurrentUser] = useState(null);
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [preferredVibes, setPreferredVibes] = useState([]);
  const [eventPreferences, setEventPreferences] = useState([]);
  const [activityStatus, setActivityStatus] = useState('offline');
  const [skills, setSkills] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [musicTaste, setMusicTaste] = useState('');
  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    twitter: '',
    spotify: '',
    soundcloud: ''
  });
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        setBio(user.bio || '');
        setAvatarUrl(user.avatar_url || '');
        setPreferredVibes(user.preferred_vibes || []);
        setEventPreferences(user.event_preferences || []);
        setActivityStatus(user.activity_status || 'offline');
        setSkills(user.skills || []);
        setPortfolio(user.portfolio || []);
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

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAvatarUrl(file_url);
      toast.success('Avatar uploaded!');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const musicArray = musicTaste.split(',').map(s => s.trim()).filter(Boolean);
    
    updateProfileMutation.mutate({
      bio,
      avatar_url: avatarUrl,
      preferred_vibes: preferredVibes,
      event_preferences: eventPreferences,
      activity_status: activityStatus,
      skills,
      portfolio,
      music_taste: musicArray,
      social_links: socialLinks
    });
  };

  const toggleVibe = (vibe) => {
    setPreferredVibes(prev =>
      prev.includes(vibe) ? prev.filter(v => v !== vibe) : [...prev, vibe]
    );
  };

  const toggleEventVibe = (vibe) => {
    setEventPreferences(prev =>
      prev.includes(vibe) ? prev.filter(v => v !== vibe) : [...prev, vibe]
    );
  };

  const toggleSkill = (skill) => {
    setSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const addPortfolioItem = () => {
    setPortfolio(prev => [...prev, { title: '', description: '', type: 'track', url: '', image_url: '' }]);
  };

  const updatePortfolioItem = (index, field, value) => {
    setPortfolio(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const removePortfolioItem = (index) => {
    setPortfolio(prev => prev.filter((_, i) => i !== index));
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

          <h1 className="text-4xl font-black uppercase mb-2">Edit Profile</h1>
          <p className="text-white/40 text-sm uppercase tracking-wider mb-8">Customize your hotmess presence</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar & Bio */}
            <div className="bg-black border-2 border-white p-6">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-[#FF1493] to-[#B026FF] flex items-center justify-center overflow-hidden border-2 border-white">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold">{currentUser?.full_name?.[0] || 'U'}</span>
                  )}
                </div>
                <div>
                  <Button
                    type="button"
                    onClick={() => document.getElementById('avatar-upload-edit').click()}
                    disabled={uploading}
                    className="bg-white text-black hover:bg-[#FF1493] font-bold"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Photo'}
                  </Button>
                  <input
                    id="avatar-upload-edit"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
              </div>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell the night about yourself..."
                rows={4}
                maxLength={300}
                className="bg-white/5 border-2 border-white/20 text-white"
              />
              <p className="text-xs text-white/40 mt-2 font-mono">{bio.length}/300</p>
            </div>

            {/* Activity Status */}
            <div className="bg-black border-2 border-white p-6">
              <Label className="text-xs uppercase tracking-widest text-white/40 mb-4 block">Activity Status</Label>
              <div className="grid grid-cols-2 gap-2">
                {ACTIVITY_STATUSES.map(({ value, label, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setActivityStatus(value)}
                    className={`px-4 py-3 text-xs font-black uppercase border-2 transition-all ${
                      activityStatus === value
                        ? 'border-white text-black'
                        : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                    }`}
                    style={activityStatus === value ? { backgroundColor: color } : {}}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: activityStatus === value ? '#fff' : color }}
                      />
                      {label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Vibes */}
            <div className="bg-black border-2 border-white p-6">
              <Label className="text-xs uppercase tracking-widest text-white/40 mb-4 block">Preferred Vibes</Label>
              <div className="flex flex-wrap gap-2">
                {VIBE_OPTIONS.map(vibe => (
                  <button
                    key={vibe}
                    type="button"
                    onClick={() => toggleVibe(vibe)}
                    className={`px-4 py-2 text-xs font-black uppercase border-2 transition-all ${
                      preferredVibes.includes(vibe)
                        ? 'bg-[#FF1493] border-[#FF1493] text-black'
                        : 'bg-white/5 border-white/20 text-white/60 hover:border-white/40'
                    }`}
                  >
                    {vibe}
                  </button>
                ))}
              </div>
            </div>

            {/* Event Preferences */}
            <div className="bg-black border-2 border-white p-6">
              <Label className="text-xs uppercase tracking-widest text-white/40 mb-4 block">Event Preferences</Label>
              <div className="flex flex-wrap gap-2">
                {EVENT_VIBES.map(vibe => (
                  <button
                    key={vibe}
                    type="button"
                    onClick={() => toggleEventVibe(vibe)}
                    className={`px-4 py-2 text-xs font-black uppercase border-2 transition-all ${
                      eventPreferences.includes(vibe)
                        ? 'bg-[#00D9FF] border-[#00D9FF] text-black'
                        : 'bg-white/5 border-white/20 text-white/60 hover:border-white/40'
                    }`}
                  >
                    {vibe}
                  </button>
                ))}
              </div>
            </div>

            {/* Skills */}
            <div className="bg-black border-2 border-white p-6">
              <Label className="text-xs uppercase tracking-widest text-white/40 mb-4 block">Skills & Talents</Label>
              <div className="flex flex-wrap gap-2">
                {SKILLS.map(skill => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`px-4 py-2 text-xs font-black uppercase border-2 transition-all ${
                      skills.includes(skill)
                        ? 'bg-[#39FF14] border-[#39FF14] text-black'
                        : 'bg-white/5 border-white/20 text-white/60 hover:border-white/40'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Music Taste */}
            <div className="bg-black border-2 border-white p-6">
              <Label className="text-xs uppercase tracking-widest text-white/40 mb-4 block">Music Taste</Label>
              <Input
                value={musicTaste}
                onChange={(e) => setMusicTaste(e.target.value)}
                placeholder="Techno, House, Amelie Lens, Nina Kraviz"
                className="bg-white/5 border-2 border-white/20 text-white"
              />
              <p className="text-xs text-white/40 mt-2 uppercase">Separate with commas</p>
            </div>

            {/* Portfolio */}
            <div className="bg-black border-2 border-white p-6">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-xs uppercase tracking-widest text-white/40">Portfolio / Creations</Label>
                <Button
                  type="button"
                  onClick={addPortfolioItem}
                  size="sm"
                  className="bg-[#FF1493] hover:bg-[#FF1493]/90 text-black font-black"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>
              <div className="space-y-4">
                {portfolio.map((item, idx) => (
                  <div key={idx} className="bg-white/5 border-2 border-white/10 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/60 uppercase font-bold">Item {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removePortfolioItem(idx)}
                        className="text-xs text-red-400 hover:text-red-300 font-bold uppercase"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <Input
                      placeholder="Title"
                      value={item.title}
                      onChange={(e) => updatePortfolioItem(idx, 'title', e.target.value)}
                      className="bg-white/5 border-white/20 text-white"
                    />
                    <Textarea
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updatePortfolioItem(idx, 'description', e.target.value)}
                      className="bg-white/5 border-white/20 text-white h-20"
                    />
                    <Select value={item.type} onValueChange={(val) => updatePortfolioItem(idx, 'type', val)}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="track">Track</SelectItem>
                        <SelectItem value="mix">Mix</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="photo">Photo</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="URL (SoundCloud, Instagram, etc.)"
                      value={item.url}
                      onChange={(e) => updatePortfolioItem(idx, 'url', e.target.value)}
                      className="bg-white/5 border-white/20 text-white"
                    />
                    <Input
                      placeholder="Image URL (optional)"
                      value={item.image_url}
                      onChange={(e) => updatePortfolioItem(idx, 'image_url', e.target.value)}
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Social Links */}
            <div className="bg-black border-2 border-white p-6">
              <Label className="text-xs uppercase tracking-widest text-white/40 mb-4 block">Social Links</Label>
              <p className="text-xs text-white/40 mb-4 uppercase">🔒 Only visible after handshake</p>
              <div className="space-y-4">
                {['instagram', 'twitter', 'spotify', 'soundcloud'].map(platform => (
                  <Input
                    key={platform}
                    value={socialLinks[platform]}
                    onChange={(e) => setSocialLinks({...socialLinks, [platform]: e.target.value})}
                    placeholder={platform.charAt(0).toUpperCase() + platform.slice(1)}
                    className="bg-white/5 border-2 border-white/20 text-white"
                  />
                ))}
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="w-full bg-[#FF1493] hover:bg-white text-black font-black text-lg py-6 border-2 border-white shadow-[0_0_10px_#FF1493]"
            >
              {updateProfileMutation.isPending ? 'SAVING...' : (
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