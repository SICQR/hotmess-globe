/**
 * Image optimization utilities for HOTMESS
 * Handles compression, format conversion, and CDN preparation
 */

/**
 * Compress and resize an image file
 * @param {File} file - Image file to compress
 * @param {Object} options - Compression options
 * @returns {Promise<Blob>} - Compressed image blob
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    format = 'image/jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          format,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
  });
}

/**
 * Generate multiple sizes of an image (thumbnail, medium, large)
 * @param {File} file - Original image file
 * @returns {Promise<Object>} - Object with different sizes
 */
export async function generateImageSizes(file) {
  const [thumbnail, medium, large] = await Promise.all([
    compressImage(file, { maxWidth: 200, maxHeight: 200, quality: 0.7 }),
    compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.8 }),
    compressImage(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.85 })
  ]);

  return { thumbnail, medium, large };
}

/**
 * Convert image to WebP format (better compression)
 * @param {File} file - Image file
 * @returns {Promise<Blob>} - WebP blob
 */
export async function convertToWebP(file) {
  return compressImage(file, { format: 'image/webp', quality: 0.85 });
}

/**
 * Generate a blurhash placeholder for lazy loading
 * Note: Requires blurhash library installation for production
 * @param {File} file - Image file
 * @returns {Promise<string>} - Blurhash string
 */
export async function generateBlurhash(file) {
  // Placeholder implementation
  // In production, use: import { encode } from 'blurhash';
  return 'L6PZfSi_.AyE_3t7t7R**0o#DgR4'; // Example hash
}

/**
 * Lazy load image with loading state
 * @param {string} src - Image source URL
 * @param {HTMLImageElement} img - Image element
 * @param {Function} onLoad - Callback on load
 */
export function lazyLoadImage(src, img, onLoad) {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          img.src = src;
          img.onload = onLoad;
          observer.disconnect();
        }
      });
    });
    observer.observe(img);
  } else {
    // Fallback for older browsers
    img.src = src;
    img.onload = onLoad;
  }
}

/**
 * Get optimized image URL based on viewport
 * @param {string} baseUrl - Base image URL
 * @param {number} viewportWidth - Current viewport width
 * @returns {string} - Optimized image URL
 */
export function getOptimizedImageUrl(baseUrl, viewportWidth) {
  if (viewportWidth <= 640) return baseUrl.replace(/\.(jpg|jpeg|png)$/i, '-thumbnail.$1');
  if (viewportWidth <= 1024) return baseUrl.replace(/\.(jpg|jpeg|png)$/i, '-medium.$1');
  return baseUrl.replace(/\.(jpg|jpeg|png)$/i, '-large.$1');
}

/**
 * Preload critical images
 * @param {string[]} urls - Array of image URLs to preload
 */
export function preloadImages(urls) {
  urls.forEach((url) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
}