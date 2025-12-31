/**
 * Image optimization utilities
 */

// Generate optimized image URL (for CDN with resize params)
export function getOptimizedImageUrl(url, options = {}) {
  if (!url) return '';
  
  const {
    width,
    height,
    quality = 80,
    format = 'webp',
  } = options;
  
  // If using a CDN like Cloudinary or imgix, add transformation params
  // This is a placeholder - adjust based on your CDN provider
  if (url.includes('cloudinary.com')) {
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      const transforms = [];
      if (width) transforms.push(`w_${width}`);
      if (height) transforms.push(`h_${height}`);
      transforms.push(`q_${quality}`);
      transforms.push(`f_${format}`);
      return `${parts[0]}/upload/${transforms.join(',')}/${parts[1]}`;
    }
  }
  
  // For base44 uploads, return as-is (backend should handle optimization)
  return url;
}

// Preload critical images
export function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Batch preload multiple images
export function preloadImages(sources) {
  return Promise.all(sources.map(src => preloadImage(src)));
}

// Get responsive image srcset
export function getResponsiveSrcSet(url, sizes = [320, 640, 960, 1280]) {
  return sizes
    .map(size => `${getOptimizedImageUrl(url, { width: size })} ${size}w`)
    .join(', ');
}

// Convert data URL to blob for upload
export function dataURLtoBlob(dataURL) {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// Compress image before upload (client-side)
export function compressImage(file, maxWidth = 1920, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            resolve(new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            }));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

// Get blurhash placeholder (requires blurhash library - not installed)
// export function getBlurhash(imageUrl) {
//   // Implementation requires blurhash library
//   return null;
// }