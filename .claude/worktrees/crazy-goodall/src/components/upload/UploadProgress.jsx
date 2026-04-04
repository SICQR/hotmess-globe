import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  FileImage,
  FileVideo,
  File
} from 'lucide-react';

/**
 * Upload Progress Component
 * Shows upload progress with retry capability
 */
export function UploadProgress({ 
  file, 
  progress = 0, 
  status = 'uploading', // uploading, completed, error, queued
  error,
  onRetry,
  onCancel,
  onRemove 
}) {
  const getFileIcon = () => {
    if (file.type?.startsWith('image/')) return FileImage;
    if (file.type?.startsWith('video/')) return FileVideo;
    return File;
  };
  
  const FileIcon = getFileIcon();
  
  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'bg-[#39FF14]';
      case 'error': return 'bg-red-500';
      case 'queued': return 'bg-yellow-500';
      default: return 'bg-[#C8962C]';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white/5 border border-white/10 rounded-lg p-4"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileIcon className="w-5 h-5 text-white/60" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium truncate">{file.name}</span>
            <span className="text-xs text-white/40 ml-2">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${getStatusColor()}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          
          {/* Status Text */}
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-white/60">
              {status === 'uploading' && `${progress}%`}
              {status === 'completed' && 'Upload complete'}
              {status === 'error' && (error || 'Upload failed')}
              {status === 'queued' && 'Waiting to upload...'}
            </span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          {status === 'completed' && (
            <CheckCircle2 className="w-5 h-5 text-[#39FF14]" />
          )}
          
          {status === 'error' && (
            <>
              <AlertCircle className="w-5 h-5 text-red-500" />
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="p-1 hover:bg-white/10 rounded"
                  title="Retry"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </>
          )}
          
          {(status === 'uploading' || status === 'queued') && onCancel && (
            <button
              onClick={onCancel}
              className="p-1 hover:bg-white/10 rounded text-white/60"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          
          {(status === 'completed' || status === 'error') && onRemove && (
            <button
              onClick={onRemove}
              className="p-1 hover:bg-white/10 rounded text-white/60"
              title="Remove"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Upload Queue Component
 * Manages multiple file uploads
 */
export function UploadQueue({ uploads, onRetry, onCancel, onRemove }) {
  if (uploads.length === 0) return null;
  
  const completedCount = uploads.filter(u => u.status === 'completed').length;
  const errorCount = uploads.filter(u => u.status === 'error').length;
  
  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/60">
          {uploads.length} file{uploads.length !== 1 ? 's' : ''}
        </span>
        <div className="flex items-center gap-4">
          {completedCount > 0 && (
            <span className="text-[#39FF14]">
              {completedCount} completed
            </span>
          )}
          {errorCount > 0 && (
            <span className="text-red-500">
              {errorCount} failed
            </span>
          )}
        </div>
      </div>
      
      {/* Upload List */}
      <AnimatePresence>
        {uploads.map((upload, idx) => (
          <UploadProgress
            key={upload.id || idx}
            file={upload.file}
            progress={upload.progress}
            status={upload.status}
            error={upload.error}
            onRetry={() => onRetry?.(upload.id)}
            onCancel={() => onCancel?.(upload.id)}
            onRemove={() => onRemove?.(upload.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * Chunked Upload Hook
 * For uploading large files in chunks
 */
export function useChunkedUpload(options = {}) {
  const { 
    chunkSize = 5 * 1024 * 1024, // 5MB chunks
    maxRetries = 3,
    onProgress,
    onComplete,
    onError,
  } = options;
  
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const uploadFile = useCallback(async (file, uploadUrl) => {
    setUploading(true);
    setProgress(0);
    
    const totalChunks = Math.ceil(file.size / chunkSize);
    let uploadedChunks = 0;
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      
      let retries = 0;
      let success = false;
      
      while (!success && retries < maxRetries) {
        try {
          const formData = new FormData();
          formData.append('chunk', chunk);
          formData.append('chunkIndex', i.toString());
          formData.append('totalChunks', totalChunks.toString());
          formData.append('fileName', file.name);
          
          const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
          });
          
          if (!response.ok) throw new Error('Upload failed');
          
          success = true;
          uploadedChunks++;
          
          const newProgress = Math.round((uploadedChunks / totalChunks) * 100);
          setProgress(newProgress);
          onProgress?.(newProgress);
          
        } catch (error) {
          retries++;
          if (retries >= maxRetries) {
            setUploading(false);
            onError?.(error);
            throw error;
          }
          // Wait before retry with exponential backoff
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, retries)));
        }
      }
    }
    
    setUploading(false);
    onComplete?.();
    
  }, [chunkSize, maxRetries, onProgress, onComplete, onError]);
  
  return {
    uploadFile,
    uploading,
    progress,
  };
}

export default UploadProgress;
