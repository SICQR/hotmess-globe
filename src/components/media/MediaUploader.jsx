import React, { useState } from 'react';
import { Upload, Image, Video, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { processAndUploadMedia } from '../utils/mediaProcessing';
import { validateAndOptimize } from '../utils/imageOptimization';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function MediaUploader({ 
  onUploadComplete, 
  type = 'image', 
  acceptMultiple = false,
  showPreview = true,
  compress = true,
  moderate = true
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setProgress({ stage: 'validating', message: 'Validating file...' });

    try {
      let file = files[0];

      // Optimize image before upload
      if (type === 'image' && compress) {
        setProgress({ stage: 'optimizing', message: 'Optimizing image...' });
        try {
          const result = await validateAndOptimize(file, {
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 0.85,
            format: 'webp'
          });
          file = result.optimized;
          console.log(`Image optimized: ${result.savedPercent}% smaller`);
        } catch (err) {
          console.warn('Image optimization failed, using original:', err);
        }
      }

      // Preview
      if (showPreview && type === 'image') {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(file);
      }

      // Processing pipeline
      setProgress({ stage: 'processing', message: compress ? 'Compressing...' : 'Processing...' });
      
      const result = await processAndUploadMedia(file, {
        type,
        compress,
        moderate,
      });

      // Moderation check
      if (!result.moderation.approved) {
        setProgress({ 
          stage: 'rejected', 
          message: `Content rejected: ${result.moderation.reason}` 
        });
        toast.error('Upload rejected by content moderation');
        setTimeout(() => {
          setUploading(false);
          setProgress(null);
          setPreview(null);
        }, 3000);
        return;
      }

      setProgress({ stage: 'complete', message: 'Upload successful!' });
      toast.success(`${type === 'image' ? 'Image' : 'Video'} uploaded successfully!`);
      
      onUploadComplete({
        url: result.url,
        moderation: result.moderation,
        stats: {
          originalSize: result.originalSize,
          processedSize: result.processedSize,
          compressionRatio: result.compressionRatio
        }
      });

      setTimeout(() => {
        setUploading(false);
        setProgress(null);
        setPreview(null);
      }, 2000);

    } catch (error) {
      console.error('Upload failed:', error);
      setProgress({ stage: 'error', message: error.message });
      toast.error(error.message || 'Upload failed');
      setTimeout(() => {
        setUploading(false);
        setProgress(null);
        setPreview(null);
      }, 3000);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept={type === 'image' ? 'image/*' : 'video/*'}
        onChange={handleFileSelect}
        disabled={uploading}
        multiple={acceptMultiple}
        className="hidden"
        id={`media-upload-${type}`}
      />
      
      <label htmlFor={`media-upload-${type}`}>
        <Button
          type="button"
          onClick={() => document.getElementById(`media-upload-${type}`).click()}
          disabled={uploading}
          variant="outline"
          className="w-full border-white/20 text-white hover:bg-white/10"
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? 'Processing...' : `Upload ${type === 'image' ? 'Image' : 'Video'}`}
        </Button>
      </label>

      <AnimatePresence>
        {uploading && progress && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-lg border-2 ${
              progress.stage === 'complete' ? 'bg-[#39FF14]/20 border-[#39FF14]' :
              progress.stage === 'rejected' || progress.stage === 'error' ? 'bg-[#FF073A]/20 border-[#FF073A]' :
              'bg-[#00D9FF]/20 border-[#00D9FF]'
            }`}
          >
            <div className="flex items-center gap-3">
              {progress.stage === 'complete' ? (
                <CheckCircle className="w-5 h-5 text-[#39FF14]" />
              ) : progress.stage === 'rejected' || progress.stage === 'error' ? (
                <AlertCircle className="w-5 h-5 text-[#FF073A]" />
              ) : (
                <Loader2 className="w-5 h-5 text-[#00D9FF] animate-spin" />
              )}
              <div className="flex-1">
                <p className="text-sm font-bold uppercase">{progress.stage}</p>
                <p className="text-xs text-white/60">{progress.message}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {preview && showPreview && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <img 
            src={preview} 
            alt="Preview" 
            className="w-full h-48 object-cover rounded-lg border-2 border-[#FF1493]"
          />
          {progress?.stage === 'complete' && (
            <div className="absolute top-2 right-2 bg-[#39FF14] text-black px-2 py-1 rounded text-[10px] font-black uppercase">
              ✓ Approved
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}