import { base44 } from '@/api/base44Client';
import logger from '@/utils/logger';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

/**
 * Validate file type and size
 */
export function validateMedia(file, type = 'image') {
  const errors = [];
  
  if (!file) {
    errors.push('No file provided');
    return { valid: false, errors };
  }

  // Type validation
  const allowedTypes = type === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
  if (!allowedTypes.includes(file.type)) {
    errors.push(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
  }

  // Size validation
  const maxSize = type === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
  if (file.size > maxSize) {
    errors.push(`File too large. Max size: ${maxSize / (1024 * 1024)}MB`);
  }

  return {
    valid: errors.length === 0,
    errors,
    fileSize: file.size,
    fileType: file.type
  };
}

/**
 * Compress image before upload
 */
export async function compressImage(file, maxWidth = 1920, quality = 0.8) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Scale down if too large
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
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * AI-based content moderation
 */
export async function moderateContent(fileUrl, type = 'image') {
  try {
    const prompt = `Analyze this ${type} for inappropriate content:

Check for:
- NSFW/explicit content
- Violence or gore
- Hate symbols
- Illegal activities

Return JSON with:
- approved (boolean)
- reason (string if not approved)
- confidence (0-1)`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [fileUrl],
      response_json_schema: {
        type: 'object',
        properties: {
          approved: { type: 'boolean' },
          reason: { type: 'string' },
          confidence: { type: 'number' }
        }
      }
    });

    return {
      approved: result.approved,
      reason: result.reason || null,
      confidence: result.confidence || 0
    };
  } catch (error) {
    logger.error('Moderation failed:', error);
    // Default to approved on error, but log it
    return { approved: true, reason: 'Moderation service unavailable', confidence: 0 };
  }
}

/**
 * Upload and process media through complete pipeline
 */
export async function processAndUploadMedia(file, options = {}) {
  const {
    type = 'image',
    compress = true,
    moderate = true,
    maxWidth = 1920,
    quality = 0.8
  } = options;

  // Step 1: Validate
  const validation = validateMedia(file, type);
  if (!validation.valid) {
    throw new Error(validation.errors.join(', '));
  }

  // Step 2: Compress (images only)
  let processedFile = file;
  if (type === 'image' && compress) {
    processedFile = await compressImage(file, maxWidth, quality);
  }

  // Step 3: Upload
  const { file_url } = await base44.integrations.Core.UploadFile({ file: processedFile });

  // Step 4: Moderate
  let moderation = { approved: true };
  if (moderate) {
    moderation = await moderateContent(file_url, type);
  }

  return {
    url: file_url,
    moderation,
    originalSize: file.size,
    processedSize: processedFile.size,
    compressionRatio: ((1 - processedFile.size / file.size) * 100).toFixed(1)
  };
}

/**
 * Generate thumbnail from image
 */
export async function generateThumbnail(file, size = 200) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        const scale = size / Math.max(img.width, img.height);
        const width = img.width * scale;
        const height = img.height * scale;

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            resolve(new File([blob], `thumb_${file.name}`, { type: 'image/jpeg' }));
          },
          'image/jpeg',
          0.7
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}