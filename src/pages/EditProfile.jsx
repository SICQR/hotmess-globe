import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Save, User, Upload, Plus, X, Users as UsersIcon, Image as ImageIcon, Video as VideoIcon, Crown, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { taxonomyConfig } from '../components/discovery/taxonomyConfig';
import TagSelector from '../components/discovery/TagSelector';
import { PhotoGallery, VideoUploader, PremiumVideoManager } from '../components/profile/MediaGallery';
import { validateBio } from '../components/utils/validation';
import { sanitizeSocialLinks } from '../components/utils/sanitize';

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

const PROFILE_THEMES = [
  { id: 'default', label: 'Default', gradient: 'from-[#FF1493] to-[#B026FF]' },
  { id: 'cyber', label: 'Cyber', gradient: 'from-[#00D9FF] to-[#39FF14]' },
  { id: 'sunset', label: 'Sunset', gradient: 'from-[#FF6B35] to-[#FFEB3B]' },
  { id: 'midnight', label: 'Midnight', gradient: 'from-[#1a1a2e] to-[#16213e]' },
  { id: 'neon', label: 'Neon', gradient: 'from-[#FF1493] to-[#00D9FF]' }
];

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
  const [tribes, setTribes] = useState([]);
  const [selectedTagIds, setSelectedTagIds] = useState([]);
  const [essentialTagIds, setEssentialTagIds] = useState([]);
  const [dealbreakerTagIds, setDealbreakerTagIds] = useState([]);
  const [lookingFor, setLookingFor] = useState([]);
  const [meetAt, setMeetAt] = useState([]);
  const [aftercareMenu, setAftercareMenu] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [videoIntroUrl, setVideoIntroUrl] = useState('');
  const [premiumVideos, setPremiumVideos] = useState([]);
  const [premiumUnlockXp, setPremiumUnlockXp] = useState(1000);
  const [interests, setInterests] = useState([]);
  const [dealbrekersText, setDealbrekersText] = useState([]);
  const [newInterest, setNewInterest] = useState('');
  const [newDealbreaker, setNewDealbreaker] = useState('');
  const [availabilityStatus, setAvailabilityStatus] = useState('offline');
  const [preferredCommunication, setPreferredCommunication] = useState([]);
  const [profileTheme, setProfileTheme] = useState('default');
  const [accentColor, setAccentColor] = useState('#FF1493');
  const [tagVisibility, setTagVisibility] = useState({
    substances_visibility: 'nobody',
    aftercare_visibility: 'matches',
    essentials_visibility: 'matches'
  });
  const [profileType, setProfileType] = useState('standard');
  const [sellerBio, setSellerBio] = useState('');
  const [sellerTagline, setSellerTagline] = useState('');
  const [shopBannerUrl, setShopBannerUrl] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: userTags = [] } = useQuery({
    queryKey: ['user-tags', currentUser?.email],
    queryFn: () => base44.entities.UserTag.filter({ user_email: currentUser.email }),
    enabled: !!currentUser
  });

  const { data: userTribes = [] } = useQuery({
    queryKey: ['user-tribes', currentUser?.email],
    queryFn: () => base44.entities.UserTribe.filter({ user_email: currentUser.email }),
    enabled: !!currentUser
  });

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
        setLookingFor(user.looking_for || []);
        setMeetAt(user.meet_at || []);
        setAftercareMenu(user.aftercare_menu || []);
        setTagVisibility({
          substances_visibility: user.substances_visibility || 'nobody',
          aftercare_visibility: user.aftercare_visibility || 'matches',
          essentials_visibility: user.essentials_visibility || 'matches'
        });
        setPhotos(user.photos || []);
        setVideoIntroUrl(user.video_intro_url || '');
        setPremiumVideos(user.premium_videos || []);
        setPremiumUnlockXp(user.premium_unlock_xp || 1000);
        setInterests(user.interests || []);
        setDealbrekersText(user.dealbreakers_text || []);
        setAvailabilityStatus(user.availability_status || 'offline');
        setPreferredCommunication(user.preferred_communication || []);
        setProfileTheme(user.profile_theme || 'default');
        setAccentColor(user.accent_color || '#FF1493');
        setProfileType(user.profile_type || 'standard');
        setSellerBio(user.seller_bio || '');
        setSellerTagline(user.seller_tagline || '');
        setShopBannerUrl(user.shop_banner_url || '');
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (userTribes.length > 0) {
      setTribes(userTribes.map(t => t.tribe_id));
    }
    if (userTags.length > 0) {
      setSelectedTagIds(userTags.map(t => t.tag_id));
      setEssentialTagIds(userTags.filter(t => t.is_essential).map(t => t.tag_id));
      setDealbreakerTagIds(userTags.filter(t => t.is_dealbreaker).map(t => t.tag_id));
    }
  }, [userTags, userTribes]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('Profile updated! 🎉');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const bioValidation = validateBio(bio);
    if (!bioValidation.valid) {
      toast.error(bioValidation.error);
      return;
    }
    
    const sanitizedSocialLinks = sanitizeSocialLinks(socialLinks);
    const musicArray = musicTaste.split(',').map(s => s.trim()).filter(Boolean).slice(0, 10);
    
    await updateProfileMutation.mutateAsync({
      bio: bioValidation.sanitized,
      avatar_url: avatarUrl,
      preferred_vibes: preferredVibes.slice(0, 5),
      event_preferences: eventPreferences.slice(0, 5),
      activity_status: activityStatus,
      skills: skills.slice(0, 8),
      portfolio: portfolio.slice(0, 6),
      music_taste: musicArray,
      social_links: sanitizedSocialLinks,
      looking_for: lookingFor,
      meet_at: meetAt,
      aftercare_menu: aftercareMenu,
      photos,
      video_intro_url: videoIntroUrl,
      premium_videos: premiumVideos,
      premium_unlock_xp: premiumUnlockXp,
      has_premium_content: photos.some(p => p.is_premium) || premiumVideos.length > 0,
      interests,
      dealbreakers_text: dealbrekersText,
      availability_status: availabilityStatus,
      preferred_communication: preferredCommunication,
      profile_theme: profileTheme,
      accent_color: accentColor,
      profile_type: profileType,
      seller_bio: sellerBio,
      seller_tagline: sellerTagline,
      shop_banner_url: shopBannerUrl,
      ...tagVisibility
    });

    for (const oldTribe of userTribes) {
      await base44.entities.UserTribe.delete(oldTribe.id);
    }
    for (const oldTag of userTags) {
      await base44.entities.UserTag.delete(oldTag.id);
    }

    for (const tribeId of tribes) {
      const tribe = taxonomyConfig.tribes.find(t => t.id === tribeId);
      if (tribe) {
        await base44.entities.UserTribe.create({
          user_email: currentUser.email,
          tribe_id: tribeId,
          tribe_label: tribe.label
        });
      }
    }

    for (const tagId of selectedTagIds) {
      const tag = taxonomyConfig.tags.find(t => t.id === tagId);
      if (tag) {
        await base44.entities.UserTag.create({
          user_email: currentUser.email,
          tag_id: tagId,
          tag_label: tag.label,
          category_id: tag.categoryId,
          is_essential: essentialTagIds.includes(tagId),
          is_dealbreaker: dealbreakerTagIds.includes(tagId),
          visibility: tag.isSensitive ? 'nobody' : 'public'
        });
      }
    }

    queryClient.invalidateQueries(['user-tags']);
    queryClient.invalidateQueries(['user-tribes']);
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
            {/* Profile Type */}
            <div className="bg-black border-2 border-[#FF1493] p-6">
              <Label className="text-xs uppercase tracking-widest text-white/40 mb-4 block">Profile Type</Label>
              <p className="text-xs text-white/60 mb-4">Changes how your profile displays and what features are available</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'standard', label: 'Standard', desc: 'Regular hookup/dating profile', icon: '👤' },
                  { value: 'seller', label: 'Seller', desc: 'MessMarket seller with shop features', icon: '🛍️' },
                  { value: 'premium', label: 'Premium', desc: 'Exclusive content creator', icon: '💎' },
                  { value: 'creator', label: 'Creator', desc: 'Artist/DJ/performer profile', icon: '🎨' }
                ].map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setProfileType(type.value)}
                    className={`p-4 text-left border-2 transition-all ${
                      profileType === type.value
                        ? 'bg-[#FF1493] border-[#FF1493] text-black'
                        : 'bg-white/5 border-white/20 text-white hover:border-white/40'
                    }`}
                  >
                    <div className="text-2xl mb-2">{type.icon}</div>
                    <div className="font-black uppercase text-xs mb-1">{type.label}</div>
                    <div className="text-[10px] opacity-70">{type.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Seller-specific fields */}
            {profileType === 'seller' && (
              <div className="bg-black border-2 border-[#00D9FF] p-6">
                <Label className="text-xs uppercase tracking-widest text-[#00D9FF] mb-4 block">Seller Profile Details</Label>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-white/60 mb-2 block">Shop Tagline</Label>
                    <Input
                      value={sellerTagline}
                      onChange={(e) => setSellerTagline(e.target.value)}
                      placeholder="Premium streetwear & club gear"
                      maxLength={60}
                      className="bg-white/5 border-2 border-white/20 text-white"
                    />
                    <p className="text-xs text-white/40 mt-1">{sellerTagline.length}/60</p>
                  </div>
                  <div>
                    <Label className="text-xs text-white/60 mb-2 block">Seller Bio</Label>
                    <Textarea
                      value={sellerBio}
                      onChange={(e) => setSellerBio(e.target.value)}
                      placeholder="Tell buyers about your shop, what you sell, shipping policies..."
                      rows={6}
                      maxLength={500}
                      className="bg-white/5 border-2 border-white/20 text-white"
                    />
                    <p className="text-xs text-white/40 mt-1">{sellerBio.length}/500</p>
                  </div>
                  <div>
                    <Label className="text-xs text-white/60 mb-2 block">Shop Banner URL</Label>
                    <Input
                      value={shopBannerUrl}
                      onChange={(e) => setShopBannerUrl(e.target.value)}
                      placeholder="https://..."
                      className="bg-white/5 border-2 border-white/20 text-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Profile Theme Customization */}
            <div className="bg-black border-2 border-white p-6">
              <Label className="text-xs uppercase tracking-widest text-white/40 mb-4 block flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Profile Aesthetics
              </Label>
              
              <div className="mb-6">
                <p className="text-xs text-white/60 mb-3 uppercase">Theme</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {PROFILE_THEMES.map(theme => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setProfileTheme(theme.id)}
                      className={`relative overflow-hidden border-2 transition-all h-20 ${
                        profileTheme === theme.id
                          ? 'border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                          : 'border-white/20 hover:border-white/40'
                      }`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient}`} />
                      <div className="relative z-10 h-full flex items-center justify-center">
                        <span className="text-xs font-black uppercase text-white drop-shadow-lg">
                          {theme.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-white/60 mb-2 block">Accent Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-16 h-16 cursor-pointer bg-transparent border-2 border-white"
                  />
                  <Input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    placeholder="#FF1493"
                    className="bg-white/5 border-white/20 text-white flex-1"
                  />
                </div>
                <p className="text-xs text-white/40 mt-2">Custom color for profile highlights</p>
              </div>
            </div>

            {/* Photos */}
            <div className="bg-black border-2 border-white p-6">
              <Label className="text-xs uppercase tracking-widest text-white/40 mb-4 block flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Photo Gallery
              </Label>
              <PhotoGallery photos={photos} onPhotosChange={setPhotos} maxPhotos={6} allowPremium={true} />
              <div className="mt-4 pt-4 border-t border-white/10">
                <Label className="text-xs text-white/60 mb-2 block">Premium Content Unlock Price</Label>
                <Input
                  type="number"
                  value={premiumUnlockXp}
                  onChange={(e) => setPremiumUnlockXp(Number(e.target.value))}
                  min={100}
                  max={10000}
                  className="bg-white/5 border-white/20 text-white w-32"
                />
                <p className="text-xs text-white/40 mt-2">XP cost for others to unlock your premium photos</p>
              </div>
            </div>

            {/* Video Intro */}
            <div className="bg-black border-2 border-white p-6">
              <Label className="text-xs uppercase tracking-widest text-white/40 mb-4 block flex items-center gap-2">
                <VideoIcon className="w-4 h-4" />
                Video Introduction
              </Label>
              <p className="text-xs text-white/60 mb-4">Add a short video to introduce yourself (max 30s, public)</p>
              <VideoUploader videoUrl={videoIntroUrl} onVideoChange={setVideoIntroUrl} />
            </div>

            {/* Premium Videos */}
            <div className="bg-black border-2 border-[#FFD700] p-6">
              <Label className="text-xs uppercase tracking-widest text-[#FFD700] mb-4 block flex items-center gap-2">
                <Crown className="w-4 h-4" />
                Premium Videos (XXX)
              </Label>
              <p className="text-xs text-white/60 mb-4">Upload locked videos that users pay XP to unlock</p>
              <PremiumVideoManager videos={premiumVideos} onVideosChange={setPremiumVideos} />
            </div>

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

            {/* Rest of existing form sections... */}
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

            {/* Interests */}
            <div className="bg-black border-2 border-white p-6">
              <Label className="text-xs uppercase tracking-widest text-white/40 mb-4 block">Interests & Hobbies</Label>
              <div className="flex gap-2 mb-3">
                <Input
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  placeholder="Add interest..."
                  className="bg-white/5 border-2 border-white/20 text-white flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newInterest.trim() && interests.length < 10) {
                        setInterests([...interests, newInterest.trim()]);
                        setNewInterest('');
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (newInterest.trim() && interests.length < 10) {
                      setInterests([...interests, newInterest.trim()]);
                      setNewInterest('');
                    }
                  }}
                  className="bg-[#00D9FF] text-black hover:bg-[#00D9FF]/90"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {interests.map((interest, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-white/10 text-white text-xs font-bold uppercase flex items-center gap-2"
                  >
                    {interest}
                    <button
                      type="button"
                      onClick={() => setInterests(interests.filter((_, i) => i !== idx))}
                      className="text-white/60 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <p className="text-xs text-white/40 mt-2">{interests.length}/10 interests</p>
            </div>

            {/* Availability Status */}
            <div className="bg-black border-2 border-white p-6">
              <Label className="text-xs uppercase tracking-widest text-white/40 mb-4 block">Availability Status</Label>
              <p className="text-xs text-white/60 mb-3">Let others know when you're free to connect</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'available', label: 'Available', color: '#39FF14' },
                  { value: 'busy', label: 'Busy', color: '#FF6B35' },
                  { value: 'away', label: 'Away', color: '#FFEB3B' },
                  { value: 'do_not_disturb', label: 'Do Not Disturb', color: '#FF1493' },
                  { value: 'offline', label: 'Offline', color: '#666' }
                ].map(({ value, label, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAvailabilityStatus(value)}
                    className={`px-4 py-3 text-xs font-black uppercase border-2 transition-all ${
                      availabilityStatus === value
                        ? 'border-white text-black'
                        : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'
                    }`}
                    style={availabilityStatus === value ? { backgroundColor: color } : {}}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: availabilityStatus === value ? '#fff' : color }}
                      />
                      {label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Preferred Communication */}
            <div className="bg-black border-2 border-white p-6">
              <Label className="text-xs uppercase tracking-widest text-white/40 mb-4 block">Preferred Communication</Label>
              <p className="text-xs text-white/60 mb-3">How do you like to connect?</p>
              <div className="flex flex-wrap gap-2">
                {['telegram', 'voice_call', 'video_call', 'in_person'].map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      if (preferredCommunication.includes(method)) {
                        setPreferredCommunication(preferredCommunication.filter(m => m !== method));
                      } else {
                        setPreferredCommunication([...preferredCommunication, method]);
                      }
                    }}
                    className={`px-4 py-2 text-xs font-black uppercase border-2 transition-all ${
                      preferredCommunication.includes(method)
                        ? 'bg-[#00D9FF] border-[#00D9FF] text-black'
                        : 'bg-white/5 border-white/20 text-white/60 hover:border-white/40'
                    }`}
                  >
                    {method.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Dealbreakers */}
            <div className="bg-black border-2 border-white p-6">
              <Label className="text-xs uppercase tracking-widest text-white/40 mb-4 block">Dealbreakers</Label>
              <p className="text-xs text-white/60 mb-3">Things you're not looking for</p>
              <div className="flex gap-2 mb-3">
                <Input
                  value={newDealbreaker}
                  onChange={(e) => setNewDealbreaker(e.target.value)}
                  placeholder="Add dealbreaker..."
                  className="bg-white/5 border-2 border-white/20 text-white flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newDealbreaker.trim() && dealbrekersText.length < 5) {
                        setDealbrekersText([...dealbrekersText, newDealbreaker.trim()]);
                        setNewDealbreaker('');
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={() => {
                    if (newDealbreaker.trim() && dealbrekersText.length < 5) {
                      setDealbrekersText([...dealbrekersText, newDealbreaker.trim()]);
                      setNewDealbreaker('');
                    }
                  }}
                  className="bg-[#FF1493] text-black hover:bg-[#FF1493]/90"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {dealbrekersText.map((dealbreaker, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold uppercase flex items-center gap-2"
                  >
                    {dealbreaker}
                    <button
                      type="button"
                      onClick={() => setDealbrekersText(dealbrekersText.filter((_, i) => i !== idx))}
                      className="text-red-300/60 hover:text-red-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <p className="text-xs text-white/40 mt-2">{dealbrekersText.length}/5 dealbreakers</p>
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

            {/* Tribes & Tags */}
            <div className="bg-black border-2 border-white p-6">
              <Label className="text-xs uppercase tracking-widest text-white/40 mb-4 block flex items-center gap-2">
                <UsersIcon className="w-4 h-4" />
                Tribes & Tags (Connect Discovery)
              </Label>
              
              <div className="mb-6">
                <p className="text-xs text-white/60 mb-3 uppercase">Select up to 3 tribes</p>
                <div className="flex flex-wrap gap-2">
                  {taxonomyConfig.tribes.map(tribe => (
                    <button
                      key={tribe.id}
                      type="button"
                      onClick={() => {
                        if (tribes.includes(tribe.id)) {
                          setTribes(tribes.filter(t => t !== tribe.id));
                        } else if (tribes.length < 3) {
                          setTribes([...tribes, tribe.id]);
                        }
                      }}
                      disabled={!tribes.includes(tribe.id) && tribes.length >= 3}
                      className={`px-3 py-2 text-xs font-bold uppercase border-2 transition-all ${
                        tribes.includes(tribe.id)
                          ? 'bg-[#00D9FF] border-[#00D9FF] text-black'
                          : 'bg-white/5 border-white/20 text-white/60 hover:border-white/40 disabled:opacity-30'
                      }`}
                    >
                      {tribe.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-white/40 mt-2">{tribes.length}/3 selected</p>
              </div>

              <div className="mb-6">
                <p className="text-xs text-white/60 mb-3 uppercase">Tags (searchable)</p>
                <TagSelector
                  selectedTagIds={selectedTagIds}
                  onTagsChange={setSelectedTagIds}
                  maxTags={10}
                  showEssentials={true}
                  essentialTagIds={essentialTagIds}
                  onEssentialsChange={setEssentialTagIds}
                  showDealbreakers={true}
                  dealbreakerTagIds={dealbreakerTagIds}
                  onDealbbreakersChange={setDealbreakerTagIds}
                />
              </div>

              <div className="mb-6">
                <p className="text-xs text-white/60 mb-3 uppercase">Looking for</p>
                <div className="flex flex-wrap gap-2">
                  {['Chat', 'Dates', 'Mates', 'Play', 'Friends', 'Something ongoing'].map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        if (lookingFor.includes(option)) {
                          setLookingFor(lookingFor.filter(o => o !== option));
                        } else {
                          setLookingFor([...lookingFor, option]);
                        }
                      }}
                      className={`px-3 py-2 text-xs font-bold uppercase border-2 ${
                        lookingFor.includes(option)
                          ? 'bg-[#FF1493] border-[#FF1493] text-black'
                          : 'bg-white/5 border-white/20 text-white/60'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-white/60 mb-3 uppercase">Aftercare menu</p>
                <div className="flex flex-wrap gap-2">
                  {['Water', 'Shower', 'Cuddle', 'Quiet time', 'Debrief', 'Snack', 'Breakfast', 'Check-in text'].map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        if (aftercareMenu.includes(option)) {
                          setAftercareMenu(aftercareMenu.filter(o => o !== option));
                        } else {
                          setAftercareMenu([...aftercareMenu, option]);
                        }
                      }}
                      className={`px-3 py-2 text-xs font-bold uppercase border-2 ${
                        aftercareMenu.includes(option)
                          ? 'bg-[#39FF14] border-[#39FF14] text-black'
                          : 'bg-white/5 border-white/20 text-white/60'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Privacy Controls */}
            <div className="bg-black border-2 border-white p-6">
              <Label className="text-xs uppercase tracking-widest text-white/40 mb-4 block">Privacy Settings</Label>
              <p className="text-xs text-white/60 mb-4">Control who can see sensitive information</p>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm mb-2 block">Substances Tags Visibility</Label>
                  <Select value={tagVisibility.substances_visibility} onValueChange={(val) => setTagVisibility({...tagVisibility, substances_visibility: val})}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="matches">Handshake connections only</SelectItem>
                      <SelectItem value="nobody">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Aftercare Menu Visibility</Label>
                  <Select value={tagVisibility.aftercare_visibility} onValueChange={(val) => setTagVisibility({...tagVisibility, aftercare_visibility: val})}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="matches">Handshake connections only</SelectItem>
                      <SelectItem value="nobody">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm mb-2 block">Essentials/Dealbreakers Visibility</Label>
                  <Select value={tagVisibility.essentials_visibility} onValueChange={(val) => setTagVisibility({...tagVisibility, essentials_visibility: val})}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="matches">Handshake connections only</SelectItem>
                      <SelectItem value="nobody">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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