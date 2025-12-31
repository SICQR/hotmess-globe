/**
 * Image Optimization Utilities
 * Resize and compress images before upload
 */

/**
 * Resize and compress image file
 * @param {File} file - Image file to optimize
 * @param {Object} options - Optimization options
 * @param {number} options.maxWidth - Max width (default: 1200)
 * @param {number} options.maxHeight - Max height (default: 1200)
 * @param {number} options.quality - JPEG quality 0-1 (default: 0.85)
 * @param {string} options.format - Output format: 'jpeg' | 'webp' | 'png' (default: 'webp')
 * @returns {Promise<Blob>} Optimized image blob
 */
export async function optimizeImage(file, options = {}) {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.85,
    format = 'webp'
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with compression
        const mimeType = format === 'webp' ? 'image/webp' : 
                        format === 'png' ? 'image/png' : 
                        'image/jpeg';
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create blob'));
            }
          },
          mimeType,
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert blob to File object
 * @param {Blob} blob - Image blob
 * @param {string} filename - Original filename
 * @returns {File}
 */
export function blobToFile(blob, filename) {
  const ext = filename.split('.').pop();
  const name = filename.replace(`.${ext}`, '');
  const newExt = blob.type.includes('webp') ? 'webp' : 
                 blob.type.includes('png') ? 'png' : 'jpg';
  return new File([blob], `${name}.${newExt}`, { type: blob.type });
}

/**
 * Optimize image and return File object ready for upload
 * @param {File} file - Original image file
 * @param {Object} options - Optimization options
 * @returns {Promise<File>} Optimized file
 */
export async function optimizeAndConvert(file, options = {}) {
  const blob = await optimizeImage(file, options);
  return blobToFile(blob, file.name);
}

/**
 * Validate and optimize image for upload
 * Combines validation + optimization in one step
 * @param {File} file - Image file
 * @param {Object} options - Options
 * @returns {Promise<{optimized: File, originalSize: number, newSize: number}>}
 */
export async function validateAndOptimize(file, options = {}) {
  // Validation
  const maxOriginalSize = options.maxOriginalSize || 20 * 1024 * 1024; // 20MB
  const allowedTypes = options.allowedTypes || ['image/jpeg', 'image/png', 'image/webp'];
  
  if (file.size > maxOriginalSize) {
    throw new Error(`File too large. Maximum ${maxOriginalSize / (1024 * 1024)}MB allowed.`);
  }
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
  }
  
  // Optimize
  const optimized = await optimizeAndConvert(file, options);
  
  return {
    optimized,
    originalSize: file.size,
    newSize: optimized.size,
    savedBytes: file.size - optimized.size,
    savedPercent: Math.round(((file.size - optimized.size) / file.size) * 100)
  };
}

/**
 * Create thumbnail from image file
 * @param {File} file - Image file
 * @param {number} size - Thumbnail size (default: 200)
 * @returns {Promise<File>}
 */
export async function createThumbnail(file, size = 200) {
  const blob = await optimizeImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.8,
    format: 'jpeg'
  });
  return blobToFile(blob, `thumb_${file.name}`);
}