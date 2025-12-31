import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Upload, Image as ImageIcon, Video as VideoIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export function PhotoGallery({ photos = [], onPhotosChange, maxPhotos = 6 }) {
  const [uploading, setUploading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);

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

  return (
    <div className="space-y-4">
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
            {photo.is_primary && (
              <div className="absolute top-2 left-2 px-2 py-1 bg-[#FF1493] text-black text-[10px] font-black uppercase">
                PRIMARY
              </div>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetPrimary(idx);
                }}
                className="bg-white text-black hover:bg-[#FF1493]"
              >
                Set Primary
              </Button>
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
        {photos.length}/{maxPhotos} photos • Click photo to view • First photo is shown in discovery
      </p>

      {/* Lightbox */}
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

    // Check file size (max 50MB)
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