import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { User, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function ProfileSetup() {
  const [fullName, setFullName] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!avatarFile) {
      toast.error('Please upload an avatar');
      return;
    }

    setSaving(true);
    setUploading(true);

    try {
      // Upload avatar
      const { file_url } = await base44.integrations.Core.UploadFile({ file: avatarFile });
      
      setUploading(false);

      // Update user profile
      await base44.auth.updateMe({
        full_name: fullName.trim(),
        avatar_url: file_url
      });

      toast.success('Profile complete!');
      navigate(createPageUrl('Home'));
    } catch (error) {
      console.error('Profile setup failed:', error);
      toast.error('Setup failed. Please try again.');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black uppercase mb-2">
            <span className="text-[#FF1493]">HOT</span>MESS
          </h1>
          <p className="text-sm text-white/60 uppercase tracking-wider">Complete Your Profile</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 border-2 border-white p-8 space-y-6">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-32 h-32 bg-gradient-to-br from-[#FF1493] to-[#B026FF] border-2 border-white flex items-center justify-center overflow-hidden">
              {avatarFile ? (
                <img
                  src={URL.createObjectURL(avatarFile)}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                  style={{ filter: 'grayscale(100%)' }}
                />
              ) : (
                <User className="w-16 h-16 text-white/40" />
              )}
            </div>
            <Button
              type="button"
              onClick={() => document.getElementById('avatar-upload').click()}
              className="bg-white text-black hover:bg-[#FF1493] hover:text-white font-black"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Avatar
            </Button>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <p className="text-xs text-white/40 uppercase text-center">
              Avatar will be displayed in grayscale
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-white/40 mb-2">
              Full Name
            </label>
            <Input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your name"
              className="bg-white/5 border-2 border-white/20 text-white"
              required
            />
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={saving || !fullName.trim() || !avatarFile}
            className="w-full bg-[#FF1493] hover:bg-white text-white hover:text-black font-black text-lg py-6 border-2 border-white"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                {uploading ? 'UPLOADING...' : 'SAVING...'}
              </>
            ) : (
              'COMPLETE SETUP'
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}