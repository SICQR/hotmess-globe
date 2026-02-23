import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { base44, supabase } from '@/components/utils/supabaseClient';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowRight, ArrowLeft, Camera, User, MapPin, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Profile fields
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('London');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [lookingFor, setLookingFor] = useState([]);
  
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        // Pre-fill if data exists
        if (user.full_name) setDisplayName(user.full_name);
        if (user.bio) setBio(user.bio);
        if (user.city) setCity(user.city);
        if (user.avatar_url) setAvatarUrl(user.avatar_url);
        // Skip if already onboarded
        if (user.onboarding_completed) {
          navigate(createPageUrl('Home'));
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, [navigate]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be under 5MB');
      return;
    }
    
    setLoading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${currentUser.id || Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);
      
      setAvatarUrl(publicUrl);
      toast.success('Photo uploaded!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload photo');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!currentUser) return;
    if (!displayName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      await base44.auth.updateMe({ 
        full_name: displayName.trim(),
        bio: bio.trim(),
        city: city.trim(),
        avatar_url: avatarUrl,
        looking_for: lookingFor,
        onboarding_completed: true 
      });

      toast.success('Profile complete!');
      navigate(createPageUrl('Home'));
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <AnimatePresence mode="wait">
          {/* STEP 1: Photo & Name */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="text-center"
            >
              <h1 className="text-4xl font-black uppercase mb-2">Set Up Profile</h1>
              <p className="text-white/60 mb-8">Add a photo and your name</p>
              
              {/* Photo upload */}
              <div className="mb-8">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="relative w-32 h-32 mx-auto rounded-full border-4 border-dashed border-white/30 hover:border-[#FF1493] transition-colors overflow-hidden group"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <Camera className="w-10 h-10 text-white/40 group-hover:text-[#FF1493]" />
                    </div>
                  )}
                  {loading && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-[#FF1493]" />
                    </div>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <p className="text-xs text-white/40 mt-2">Tap to add photo</p>
              </div>

              {/* Name input */}
              <div className="mb-6">
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="text-center text-xl font-bold bg-white/5 border-white/20 h-14"
                  maxLength={30}
                />
              </div>

              {/* City */}
              <div className="mb-8">
                <div className="flex items-center justify-center gap-2 text-white/60">
                  <MapPin className="w-4 h-4" />
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="text-center bg-transparent border-none text-white/60 w-32 p-0 h-auto"
                    maxLength={30}
                  />
                </div>
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!displayName.trim()}
                className="w-full bg-[#FF1493] text-black font-black text-lg py-6"
              >
                Next <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* STEP 2: Bio & Looking For */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h2 className="text-3xl font-black uppercase mb-2 text-center">About You</h2>
              <p className="text-white/60 mb-6 text-center">Write a short bio</p>
              
              {/* Bio */}
              <div className="mb-8">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A few words about yourself..."
                  maxLength={150}
                  rows={3}
                  className="w-full bg-white/5 border border-white/20 rounded-lg p-4 text-white placeholder:text-white/40 resize-none focus:outline-none focus:border-[#FF1493]"
                />
                <p className="text-xs text-white/40 text-right mt-1">{bio.length}/150</p>
              </div>

              {/* Looking for */}
              <p className="text-sm text-white/60 mb-3">Looking for:</p>
              <div className="flex flex-wrap gap-2 mb-8">
                {['Chat', 'Dates', 'Mates', 'Friends', 'Fun', 'Networking'].map(option => (
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
                    className={`px-4 py-2 text-sm font-bold uppercase border-2 transition-all ${
                      lookingFor.includes(option)
                        ? 'bg-[#FF1493] border-[#FF1493] text-black'
                        : 'bg-white/5 border-white/20 text-white/60 hover:border-white/40'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setStep(1)} variant="outline" className="border-white/20">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={handleComplete}
                  disabled={loading}
                  className="flex-1 bg-[#FF1493] text-black font-black"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" /> Done
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mt-12">
          {[1, 2].map(s => (
            <div
              key={s}
              className={`w-3 h-3 rounded-full transition-colors ${s <= step ? 'bg-[#FF1493]' : 'bg-white/20'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}