import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AuthContainer, BrandHeader, AvatarUpload, AuthInput, Button } from '@/components/ui/design-system';
import { supabase } from '@/components/utils/supabaseClient';
import { toast } from 'sonner';

interface ProfileSetupScreenProps {
  onSave?: (data: { avatar?: string; username: string; displayName: string; bio: string }) => void;
  onSkip?: () => void;
  initialData?: { username?: string; displayName?: string };
}

export function ProfileSetupScreen({ onSave, onSkip, initialData }: ProfileSetupScreenProps) {
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState<string>();
  const [username, setUsername] = useState(initialData?.username || '');
  const [displayName, setDisplayName] = useState(initialData?.displayName || '');
  const [bio, setBio] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleAvatarUpload = () => {
    // Mock file picker - generates random avatar
    const mockUrl = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + Math.random();
    setAvatar(mockUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: Record<string, string> = {};
    if (!username) newErrors.username = 'Username is required';
    if (!displayName) newErrors.displayName = 'Display name is required';

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Update profile in profiles table
        const { error } = await supabase
          .from('profiles')
          .upsert({
            account_id: user.id,
            username,
            display_name: displayName,
            bio,
            avatar_url: avatar,
            onboarding_complete: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'account_id' });

        if (error) {
          toast.error(error.message || 'Failed to save profile');
          setErrors({ username: error.message });
        } else {
          toast.success('Profile saved! Welcome to HOTMESS 🔥');
          onSave?.({ avatar, username, displayName, bio });
          navigate('/');
        }
      } else {
        toast.error('Please log in first');
        navigate('/examples/auth/login');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onSkip?.();
    navigate('/');
  };

  return (
    <AuthContainer>
      <BrandHeader title="Set Up Profile" subtitle="Make yourself known" showLogo={false} />

      <motion.form
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col gap-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Avatar upload centered */}
        <div className="flex justify-center my-4">
          <AvatarUpload src={avatar} onUpload={handleAvatarUpload} size="xl" />
        </div>

        <AuthInput
          label="Username"
          type="text"
          placeholder="hotmess_user"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={errors.username}
        />

        <AuthInput
          label="Display Name"
          type="text"
          placeholder="Your Name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          error={errors.displayName}
        />

        <div>
          <label className="block text-muted text-sm mb-1.5 font-medium">Bio</label>
          <textarea
            className="w-full bg-chatGray text-light rounded-lg px-4 py-3 border-2 border-borderGlow focus:border-gold transition-colors placeholder-muted outline-none resize-none"
            placeholder="Tell us about yourself..."
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
          />
          <p className="text-muted text-xs text-right mt-1">{bio.length}/160</p>
        </div>

        <div className="flex-1" />

        <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
          {loading ? 'Saving...' : 'Save Profile'}
        </Button>

        <button
          type="button"
          onClick={handleSkip}
          className="text-muted text-sm text-center hover:text-light transition-colors"
        >
          Skip for now
        </button>
      </motion.form>
    </AuthContainer>
  );
}

export default ProfileSetupScreen;
