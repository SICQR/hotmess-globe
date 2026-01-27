import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChunkedUpload } from './useChunkedUpload';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Create mock file
function createMockFile(size, name = 'test.txt') {
  const content = new Array(size).fill('a').join('');
  return new File([content], name, { type: 'text/plain' });
}

describe('useChunkedUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useChunkedUpload());

    expect(result.current.uploading).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.uploadId).toBeNull();
  });

  it('should upload a small file in one chunk', async () => {
    // Mock init response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ uploadId: 'upload-123' }),
    });

    // Mock chunk upload response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    // Mock complete response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ file_url: 'https://storage.example.com/file.txt' }),
    });

    const onProgress = vi.fn();
    const onComplete = vi.fn();

    const { result } = renderHook(() => useChunkedUpload({
      onProgress,
      onComplete,
    }));

    const file = createMockFile(1000); // 1KB file

    await act(async () => {
      await result.current.upload(file);
    });

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ file_url: 'https://storage.example.com/file.txt' })
    );
    expect(result.current.uploading).toBe(false);
    expect(result.current.progress).toBe(100);
  });

  it('should track progress for multi-chunk uploads', async () => {
    // Mock init response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ uploadId: 'upload-123' }),
    });

    // Mock chunk upload responses (3 chunks)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    // Mock complete response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ file_url: 'https://storage.example.com/file.txt' }),
    });

    const onProgress = vi.fn();

    const { result } = renderHook(() => useChunkedUpload({ onProgress }));

    // Create a file that spans 3 chunks (5MB each = need > 10MB)
    const file = createMockFile(12 * 1024 * 1024); // 12MB

    await act(async () => {
      await result.current.upload(file);
    });

    // Progress should have been called multiple times
    expect(onProgress).toHaveBeenCalled();
    expect(result.current.progress).toBe(100);
  });

  it('should handle upload initialization failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Storage full' }),
    });

    const onError = vi.fn();

    const { result } = renderHook(() => useChunkedUpload({ onError }));

    const file = createMockFile(1000);

    await expect(act(async () => {
      await result.current.upload(file);
    })).rejects.toThrow('Storage full');

    expect(onError).toHaveBeenCalled();
    expect(result.current.uploading).toBe(false);
  });

  it('should prevent multiple concurrent uploads', async () => {
    // Mock slow init response
    mockFetch.mockImplementation(() => new Promise(resolve => 
      setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ uploadId: 'upload-123' }),
      }), 100)
    ));

    const { result } = renderHook(() => useChunkedUpload());

    const file = createMockFile(1000);

    // Start first upload (don't await)
    act(() => {
      result.current.upload(file).catch(() => {});
    });

    // Try to start second upload while first is in progress
    await expect(act(async () => {
      await result.current.upload(file);
    })).rejects.toThrow('Upload already in progress');
  });

  it('should cancel upload', async () => {
    // Mock init response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ uploadId: 'upload-123' }),
    });

    // Mock slow chunk upload
    mockFetch.mockImplementation(() => new Promise(resolve => 
      setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }), 1000)
    ));

    const { result } = renderHook(() => useChunkedUpload());

    const file = createMockFile(12 * 1024 * 1024); // Large file

    // Start upload
    const uploadPromise = result.current.upload(file);

    // Cancel after a short delay
    await new Promise(r => setTimeout(r, 50));
    
    await act(async () => {
      await result.current.cancel();
    });

    expect(result.current.uploading).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.uploadId).toBeNull();
  });

  it('should retry failed chunks', async () => {
    // Mock init response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ uploadId: 'upload-123' }),
    });

    // First attempt fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
    });

    // Retry succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    // Complete response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ file_url: 'https://storage.example.com/file.txt' }),
    });

    const { result } = renderHook(() => useChunkedUpload({ maxRetries: 3 }));

    const file = createMockFile(1000);

    await act(async () => {
      await result.current.upload(file);
    });

    // Should have called fetch at least 4 times (init, fail, retry, complete)
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('should resume failed upload', async () => {
    // Mock status check
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        uploadedChunks: [0], // First chunk already uploaded
        totalChunks: 3,
      }),
    });

    // Mock remaining chunk uploads
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    // Mock complete response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ file_url: 'https://storage.example.com/file.txt' }),
    });

    const onComplete = vi.fn();

    const { result } = renderHook(() => useChunkedUpload({ onComplete }));

    const file = createMockFile(12 * 1024 * 1024); // 12MB file

    await act(async () => {
      await result.current.resume(file, 'existing-upload-id');
    });

    expect(onComplete).toHaveBeenCalled();
    expect(result.current.progress).toBe(100);
  });
});
