/**
 * Chunked Upload Hook
 * Handles large file uploads with progress tracking and resumability
 */

import { useState, useCallback, useRef } from 'react';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

export function useChunkedUpload(options = {}) {
  const {
    onProgress,
    onComplete,
    onError,
    maxRetries = 3,
  } = options;

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadId, setUploadId] = useState(null);
  const abortControllerRef = useRef(null);

  /**
   * Initialize a new chunked upload
   */
  const initUpload = useCallback(async (file) => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    const response = await fetch('/api/upload/chunk?action=init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        filesize: file.size,
        mimetype: file.type,
        totalChunks,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to initialize upload');
    }

    return response.json();
  }, []);

  /**
   * Upload a single chunk with retry logic
   */
  const uploadChunk = useCallback(async (uploadId, file, chunkIndex, retries = 0) => {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('uploadId', uploadId);
    formData.append('chunkIndex', chunkIndex.toString());
    formData.append('chunk', chunk);

    try {
      const response = await fetch('/api/upload/chunk?action=chunk', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current?.signal,
      });

      if (!response.ok) {
        throw new Error(`Chunk ${chunkIndex} upload failed`);
      }

      return response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error;
      }

      if (retries < maxRetries) {
        // Exponential backoff
        await new Promise(r => setTimeout(r, Math.pow(2, retries) * 1000));
        return uploadChunk(uploadId, file, chunkIndex, retries + 1);
      }

      throw error;
    }
  }, [maxRetries]);

  /**
   * Complete the upload
   */
  const completeUpload = useCallback(async (uploadId) => {
    const response = await fetch('/api/upload/chunk?action=complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to complete upload');
    }

    return response.json();
  }, []);

  /**
   * Start the chunked upload process
   */
  const upload = useCallback(async (file) => {
    if (uploading) {
      throw new Error('Upload already in progress');
    }

    setUploading(true);
    setProgress(0);
    abortControllerRef.current = new AbortController();

    try {
      // Initialize
      const { uploadId: newUploadId } = await initUpload(file);
      setUploadId(newUploadId);

      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      let uploadedChunks = 0;

      // Upload chunks in parallel (max 3 concurrent)
      const concurrency = 3;
      const chunks = Array.from({ length: totalChunks }, (_, i) => i);

      for (let i = 0; i < chunks.length; i += concurrency) {
        const batch = chunks.slice(i, i + concurrency);
        
        await Promise.all(batch.map(async (chunkIndex) => {
          await uploadChunk(newUploadId, file, chunkIndex);
          uploadedChunks++;
          
          const newProgress = Math.round((uploadedChunks / totalChunks) * 100);
          setProgress(newProgress);
          onProgress?.(newProgress, uploadedChunks, totalChunks);
        }));
      }

      // Complete upload
      const result = await completeUpload(newUploadId);
      
      setProgress(100);
      setUploading(false);
      setUploadId(null);
      
      onComplete?.(result);
      return result;

    } catch (error) {
      setUploading(false);
      setProgress(0);
      
      if (error.name !== 'AbortError') {
        onError?.(error);
      }
      
      throw error;
    }
  }, [uploading, initUpload, uploadChunk, completeUpload, onProgress, onComplete, onError]);

  /**
   * Cancel the current upload
   */
  const cancel = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (uploadId) {
      try {
        await fetch(`/api/upload/chunk?uploadId=${uploadId}`, {
          method: 'DELETE',
        });
      } catch {
        // Ignore cleanup errors
      }
    }

    setUploading(false);
    setProgress(0);
    setUploadId(null);
  }, [uploadId]);

  /**
   * Resume a failed upload
   */
  const resume = useCallback(async (file, existingUploadId) => {
    if (uploading) {
      throw new Error('Upload already in progress');
    }

    setUploading(true);
    setUploadId(existingUploadId);
    abortControllerRef.current = new AbortController();

    try {
      // Get upload status
      const statusResponse = await fetch(`/api/upload/chunk?uploadId=${existingUploadId}`);
      if (!statusResponse.ok) {
        throw new Error('Upload not found - start a new upload');
      }

      const status = await statusResponse.json();
      const { uploadedChunks, totalChunks } = status;
      const remainingChunks = Array.from({ length: totalChunks }, (_, i) => i)
        .filter(i => !uploadedChunks.includes(i));

      let completed = uploadedChunks.length;
      setProgress(Math.round((completed / totalChunks) * 100));

      // Upload remaining chunks
      const concurrency = 3;
      for (let i = 0; i < remainingChunks.length; i += concurrency) {
        const batch = remainingChunks.slice(i, i + concurrency);
        
        await Promise.all(batch.map(async (chunkIndex) => {
          await uploadChunk(existingUploadId, file, chunkIndex);
          completed++;
          
          const newProgress = Math.round((completed / totalChunks) * 100);
          setProgress(newProgress);
          onProgress?.(newProgress, completed, totalChunks);
        }));
      }

      // Complete upload
      const result = await completeUpload(existingUploadId);
      
      setProgress(100);
      setUploading(false);
      setUploadId(null);
      
      onComplete?.(result);
      return result;

    } catch (error) {
      setUploading(false);
      
      if (error.name !== 'AbortError') {
        onError?.(error);
      }
      
      throw error;
    }
  }, [uploading, uploadChunk, completeUpload, onProgress, onComplete, onError]);

  return {
    upload,
    cancel,
    resume,
    uploading,
    progress,
    uploadId,
  };
}

export default useChunkedUpload;
