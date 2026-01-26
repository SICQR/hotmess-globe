import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Image as ImageIcon, Video as VideoIcon, Trash2, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function PhotoGallery({ photos = [], onPhotosChange, maxPhotos = 6, allowPremium = false }) {
  const [uploading, setUploading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [uploadType, setUploadType] = useState('regular');

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > maxPhotos) {
      toast.error(`Maximum ${maxPhotos} photos allowed`);
      return;
    }

    setUploading(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      
      const newPhotos = results.map((result, idx) => ({
        url: result.file_url,
        is_primary: photos.length === 0 && idx === 0,
        is_premium: uploadType === 'premium',
        order: photos.length + idx
      }));

      onPhotosChange([...photos, ...newPhotos]);
      toast.success('Photos uploaded!');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (index) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onPhotosChange(newPhotos);
  };

  const handleSetPrimary = (index) => {
    const newPhotos = photos.map((photo, i) => ({
      ...photo,
      is_primary: i === index
    }));
    onPhotosChange(newPhotos);
  };

  const togglePremium = (index) => {
    const newPhotos = photos.map((photo, i) => 
      i === index ? { ...photo, is_premium: !photo.is_premium } : photo
    );
    onPhotosChange(newPhotos);
  };

  return (
    <div className="space-y-4">
      {allowPremium && (
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            onClick={() => setUploadType('regular')}
            variant={uploadType === 'regular' ? 'default' : 'outline'}
            className={uploadType === 'regular' ? 'bg-[#00D9FF] text-black' : ''}
          >
            Regular Photos
          </Button>
          <Button
            type="button"
            onClick={() => setUploadType('premium')}
            variant={uploadType === 'premium' ? 'default' : 'outline'}
            className={uploadType === 'premium' ? 'bg-[#FF1493] text-black' : ''}
          >
            <Crown className="w-4 h-4 mr-2" />
            Premium (Coming Soon)
          </Button>
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        {photos.map((photo, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative aspect-square group"
          >
            <img
              src={photo.url}
              alt={`Photo ${idx + 1}`}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setSelectedIndex(idx)}
            />
            <div className="absolute top-2 left-2 flex flex-col gap-1">
              {photo.is_primary && (
                <div className="px-2 py-1 bg-[#FF1493] text-black text-[10px] font-black uppercase">
                  PRIMARY
                </div>
              )}
              {photo.is_premium && (
                <div className="px-2 py-1 bg-[#FFD700] text-black text-[10px] font-black uppercase flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  PREMIUM
                </div>
              )}
            </div>
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetPrimary(idx);
                  }}
                  className="bg-white text-black hover:bg-[#FF1493] text-xs"
                >
                  Primary
                </Button>
                {allowPremium && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePremium(idx);
                    }}
                    className="bg-[#FFD700] text-black hover:bg-[#FFD700]/90 text-xs"
                  >
                    <Crown className="w-3 h-3" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(idx);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}

        {photos.length < maxPhotos && (
          <label className="aspect-square border-2 border-dashed border-white/20 hover:border-[#FF1493] cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
            {uploading ? (
              <div className="text-white/40 text-xs uppercase">Uploading...</div>
            ) : (
              <>
                <ImageIcon className="w-8 h-8 text-white/40" />
                <span className="text-xs text-white/40 uppercase">Add Photo</span>
              </>
            )}
          </label>
        )}
      </div>

      <p className="text-xs text-white/40 uppercase">
        {photos.length}/{maxPhotos} photos • {allowPremium ? 'Premium photos coming soon • ' : ''}First photo shown in discovery
      </p>

      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
            onClick={() => setSelectedIndex(null)}
          >
            <button
              onClick={() => setSelectedIndex(null)}
              className="absolute top-4 right-4 p-2 text-white hover:text-[#FF1493]"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={photos[selectedIndex]?.url}
              alt="Full size"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function VideoUploader({ videoUrl, onVideoChange }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video must be under 50MB');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onVideoChange(file_url);
      toast.success('Video uploaded!');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {videoUrl ? (
        <div className="relative aspect-video bg-black">
          <video
            src={videoUrl}
            controls
            className="w-full h-full"
          />
          <Button
            onClick={() => onVideoChange(null)}
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Remove
          </Button>
        </div>
      ) : (
        <label className="aspect-video border-2 border-dashed border-white/20 hover:border-[#FF1493] cursor-pointer flex flex-col items-center justify-center gap-3 transition-colors">
          <input
            type="file"
            accept="video/*"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
          {uploading ? (
            <div className="text-white/40 text-sm uppercase">Uploading...</div>
          ) : (
            <>
              <VideoIcon className="w-12 h-12 text-white/40" />
              <span className="text-sm text-white/40 uppercase">Upload Video Introduction</span>
              <span className="text-xs text-white/30">Max 30 seconds, 50MB</span>
            </>
          )}
        </label>
      )}
    </div>
  );
}

export function PremiumVideoManager({ videos = [], onVideosChange }) {
  const [uploading, setUploading] = useState(false);
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoXp, setNewVideoXp] = useState(500);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error('Video must be under 100MB');
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onVideosChange([...videos, { 
        url: file_url, 
        title: newVideoTitle || 'Untitled',
        unlock_xp: newVideoXp 
      }]);
      toast.success('Premium video uploaded!');
      setNewVideoTitle('');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (index) => {
    onVideosChange(videos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {videos.map((video, idx) => (
        <div key={idx} className="bg-white/5 border-2 border-[#FFD700]/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-[#FFD700]" />
              <span className="text-sm font-bold text-white">{video.title}</span>
              <span className="text-xs text-[#FFD700]">{video.unlock_xp} XP</span>
            </div>
            <Button
              onClick={() => handleDelete(idx)}
              variant="ghost"
              size="sm"
              className="text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <video src={video.url} controls className="w-full aspect-video bg-black" />
        </div>
      ))}

      <div className="border-2 border-dashed border-[#FFD700]/40 p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Crown className="w-5 h-5 text-[#FFD700]" />
          <span className="text-sm font-bold text-white uppercase">Add Premium Video</span>
        </div>
        
        <Input
          placeholder="Video title"
          value={newVideoTitle}
          onChange={(e) => setNewVideoTitle(e.target.value)}
          className="bg-white/5 border-white/20 text-white"
        />
        
        <div>
          <Label className="text-xs text-white/60 mb-2 block">Unlock cost (XP)</Label>
          <Input
            type="number"
            value={newVideoXp}
            onChange={(e) => setNewVideoXp(Number(e.target.value))}
            min={100}
            max={5000}
            className="bg-white/5 border-white/20 text-white"
          />
        </div>

        <label className="block">
          <input
            type="file"
            accept="video/*"
            onChange={handleUpload}
            disabled={uploading || !newVideoTitle}
            className="hidden"
          />
          <Button
            type="button"
            disabled={uploading || !newVideoTitle}
            className="w-full bg-[#FFD700] text-black hover:bg-[#FFD700]/90 font-black"
            onClick={() => document.querySelector('input[type="file"][accept="video/*"]').click()}
          >
            {uploading ? 'Uploading...' : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Premium Video
              </>
            )}
          </Button>
        </label>
      </div>

      <p className="text-xs text-white/40">
        Premium videos are locked behind XP payment. Users must pay to unlock.
      </p>
    </div>
  );
}