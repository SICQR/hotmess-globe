import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Music, 
  X, 
  Check, 
  Loader2, 
  Link as LinkIcon,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSoundCloudStatus, useSoundCloudUpload } from '@/hooks/useSoundCloud';
import SoundCloudEmbed from './SoundCloudEmbed';

const MUSIC_GENRES = [
  'Electronic',
  'House',
  'Techno',
  'Disco',
  'Pop',
  'Hip-hop',
  'R&B',
  'Ambient',
  'Experimental',
  'Other',
];

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
const ALLOWED_TYPES = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/flac', 'audio/aiff', 'audio/ogg'];

export default function SoundCloudUploader({ onSuccess, onCancel, className }) {
  const fileInputRef = useRef(null);
  const { isConnected, username, connect, isLoading: statusLoading } = useSoundCloudStatus();
  const { upload, isUploading, uploadProgress, uploadedTrack, error, reset } = useSoundCloudUpload();

  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [tags, setTags] = useState('');
  const [sharing, setSharing] = useState('public');
  const [fileError, setFileError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateFile = useCallback((file) => {
    if (!file) return 'Please select a file';
    if (file.size > MAX_FILE_SIZE) return 'File too large (max 200MB)';
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(wav|mp3|flac|aiff|ogg)$/i)) {
      return 'Invalid file type. Supported: WAV, MP3, FLAC, AIFF, OGG';
    }
    return null;
  }, []);

  const handleFileSelect = useCallback((selectedFile) => {
    const error = validateFile(selectedFile);
    if (error) {
      setFileError(error);
      setFile(null);
      return;
    }
    setFileError(null);
    setFile(selectedFile);
    
    // Auto-fill title from filename
    if (!title && selectedFile.name) {
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, '');
      setTitle(nameWithoutExt);
    }
  }, [title, validateFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !title.trim()) return;

    upload(
      { file, title: title.trim(), description, genre, tags, sharing },
      {
        onSuccess: (data) => {
          onSuccess?.(data);
        },
      }
    );
  };

  const handleReset = () => {
    reset();
    setFile(null);
    setTitle('');
    setDescription('');
    setGenre('');
    setTags('');
    setSharing('public');
    setFileError(null);
  };

  // Loading state
  if (statusLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-[#FF5500]" />
      </div>
    );
  }

  // Not connected state
  if (!isConnected) {
    return (
      <div className={`p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 text-center ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#FF5500]/10 flex items-center justify-center">
          <Music className="w-8 h-8 text-[#FF5500]" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Connect SoundCloud</h3>
        <p className="text-sm text-zinc-400 mb-4">
          Connect your SoundCloud account to upload tracks directly from the app.
        </p>
        <Button onClick={connect} className="bg-[#FF5500] hover:bg-[#FF5500]/80">
          Connect SoundCloud
        </Button>
      </div>
    );
  }

  // Upload success state
  if (uploadedTrack?.ok) {
    return (
      <div className={`p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 ${className}`}>
        <div className="text-center mb-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Upload Complete!</h3>
          <p className="text-sm text-zinc-400">Your track is now on SoundCloud</p>
        </div>

        {uploadedTrack.urn && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <SoundCloudEmbed urlOrUrn={uploadedTrack.urn} visual={false} />
          </div>
        )}

        {uploadedTrack.permalink_url && (
          <a
            href={uploadedTrack.permalink_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-[#FF5500] hover:underline mb-4"
          >
            <LinkIcon className="w-4 h-4" />
            View on SoundCloud
          </a>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            Upload Another
          </Button>
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              Done
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-[#FF5500]" />
          <h3 className="font-semibold text-white">Upload to SoundCloud</h3>
        </div>
        <span className="text-xs text-zinc-500">as @{username}</span>
      </div>

      {/* File Drop Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative mb-4 p-6 rounded-lg border-2 border-dashed cursor-pointer
          transition-colors text-center
          ${isDragging ? 'border-[#FF5500] bg-[#FF5500]/5' : 'border-zinc-700 hover:border-zinc-600'}
          ${file ? 'border-green-500/50 bg-green-500/5' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          onChange={(e) => handleFileSelect(e.target.files?.[0])}
          className="hidden"
        />
        
        <AnimatePresence mode="wait">
          {file ? (
            <motion.div
              key="file-selected"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center justify-center gap-3"
            >
              <Music className="w-8 h-8 text-green-500" />
              <div className="text-left">
                <p className="text-sm font-medium text-white truncate max-w-[200px]">{file.name}</p>
                <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  setFileError(null);
                }}
                className="p-1 rounded-full hover:bg-zinc-700"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="no-file"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">
                Drop audio file or <span className="text-[#FF5500]">click to browse</span>
              </p>
              <p className="text-xs text-zinc-600 mt-1">WAV, MP3, FLAC, AIFF, OGG (max 200MB)</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {fileError && (
        <div className="flex items-center gap-2 text-sm text-red-400 mb-4">
          <AlertCircle className="w-4 h-4" />
          {fileError}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 mb-4 p-3 rounded-lg bg-red-500/10">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Title */}
      <div className="space-y-2 mb-4">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Track title"
          required
          disabled={isUploading}
        />
      </div>

      {/* Description */}
      <div className="space-y-2 mb-4">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Track description (optional)"
          rows={3}
          disabled={isUploading}
        />
      </div>

      {/* Genre & Sharing */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <Label>Genre</Label>
          <Select value={genre} onValueChange={setGenre} disabled={isUploading}>
            <SelectTrigger>
              <SelectValue placeholder="Select genre" />
            </SelectTrigger>
            <SelectContent>
              {MUSIC_GENRES.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Privacy</Label>
          <Select value={sharing} onValueChange={setSharing} disabled={isUploading}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="private">Private</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2 mb-6">
        <Label htmlFor="tags">Tags</Label>
        <Input
          id="tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="house, techno, dj (comma separated)"
          disabled={isUploading}
        />
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-zinc-400">Uploading...</span>
            <span className="text-white font-medium">{uploadProgress}%</span>
          </div>
          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#FF5500]"
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={!file || !title.trim() || isUploading}
          className="flex-1 bg-[#FF5500] hover:bg-[#FF5500]/80"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Upload Track
            </>
          )}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isUploading}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
