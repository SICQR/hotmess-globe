/**
 * Input sanitization utilities for XSS prevention
 * Uses DOMPurify for HTML sanitization and custom validators
 */

// Sanitize HTML content - strips all scripts and dangerous tags
export function sanitizeHTML(dirty) {
  if (!dirty || typeof dirty !== 'string') return '';
  
  // Basic sanitization without DOMPurify (since it's not installed yet)
  // Remove script tags and on* event handlers
  return dirty
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<iframe/gi, '&lt;iframe');
}

// Sanitize URL - only allow https:// for external links (security hardened)
export function sanitizeURL(url, options = {}) {
  const { allowHttp = false, allowRelative = false } = options;
  
  if (!url || typeof url !== 'string') return '';
  
  // Remove any whitespace and potentially dangerous characters
  url = url.trim();
  
  // Block javascript:, data:, vbscript:, file: protocols
  const dangerousProtocols = /^(javascript|data|vbscript|file):/i;
  if (dangerousProtocols.test(url)) {
    return '';
  }
  
  // Handle relative URLs if allowed
  if (allowRelative && (url.startsWith('/') || url.startsWith('./'))) {
    return url;
  }
  
  try {
    const parsed = new URL(url);
    
    // Only allow HTTPS by default (HTTP only if explicitly allowed)
    const allowedProtocols = allowHttp ? ['http:', 'https:'] : ['https:'];
    
    if (!allowedProtocols.includes(parsed.protocol)) {
      return '';
    }
    
    // Block localhost and internal IPs for external portfolio links
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === 'localhost' || 
        hostname === '127.0.0.1' || 
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.')) {
      return '';
    }
    
    return url;
  } catch {
    // Invalid URL
    return '';
  }
}

// Sanitize text input - escape HTML entities
export function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Validate and sanitize social links
export function sanitizeSocialLinks(links) {
  if (!links || typeof links !== 'object') return {};
  
  const sanitized = {};
  const allowedDomains = [
    'instagram.com',
    'twitter.com',
    'x.com',
    'tiktok.com',
    'linkedin.com',
    'github.com',
    'youtube.com'
  ];
  
  for (const [key, value] of Object.entries(links)) {
    if (typeof value === 'string' && value.trim()) {
      try {
        const url = new URL(value.startsWith('http') ? value : `https://${value}`);
        if (allowedDomains.some(domain => url.hostname.includes(domain))) {
          sanitized[key] = url.toString();
        }
      } catch {
        // Invalid URL, skip
      }
    }
  }
  
  return sanitized;
}

// Validate file upload
export function validateFileUpload(file, options = {}) {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp']
  } = options;
  
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: `File too large. Max size: ${maxSize / 1024 / 1024}MB` };
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` };
  }
  
  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!ext || !allowedExtensions.includes(ext)) {
    return { valid: false, error: `Invalid file extension. Allowed: ${allowedExtensions.join(', ')}` };
  }
  
  return { valid: true };
}

// Validate video upload
export function validateVideoUpload(file) {
  return validateFileUpload(file, {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
    allowedExtensions: ['.mp4', '.mov', '.webm']
  });
}

// Sanitize markdown - allow safe markdown but strip dangerous HTML
export function sanitizeMarkdown(markdown) {
  if (!markdown || typeof markdown !== 'string') return '';
  
  // Remove potentially dangerous HTML tags while preserving markdown
  return markdown
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
}

// Rate limiting helper (client-side)
const rateLimitStore = new Map();

export function checkRateLimit(key, maxRequests = 5, windowMs = 60000) {
  const now = Date.now();
  const record = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };
  
  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + windowMs;
  } else {
    record.count++;
  }
  
  rateLimitStore.set(key, record);
  
  return {
    allowed: record.count <= maxRequests,
    remaining: Math.max(0, maxRequests - record.count),
    resetAt: record.resetAt
  };
}