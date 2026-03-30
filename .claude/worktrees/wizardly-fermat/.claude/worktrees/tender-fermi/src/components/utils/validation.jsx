/**
 * Input validation utilities
 */

// Validate email
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email) && email.length <= 254;
}

// Validate username
export function isValidUsername(username) {
  if (!username || typeof username !== 'string') return false;
  const regex = /^[a-zA-Z0-9_-]{3,30}$/;
  return regex.test(username);
}

// Validate age (18+)
export function isValidAge(age) {
  const num = parseInt(age, 10);
  return !isNaN(num) && num >= 18 && num <= 120;
}

// Validate coordinates
export function isValidCoordinates(lat, lng) {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  
  return (
    !isNaN(latNum) &&
    !isNaN(lngNum) &&
    latNum >= -90 &&
    latNum <= 90 &&
    lngNum >= -180 &&
    lngNum <= 180
  );
}

// Validate XP amount (prevent negative or excessive values)
export function isValidXP(xp) {
  const num = parseInt(xp, 10);
  return !isNaN(num) && num >= 0 && num <= 1000000000; // 1 billion max
}

// Validate price
export function isValidPrice(price) {
  const num = parseFloat(price);
  return !isNaN(num) && num >= 0 && num <= 1000000; // 1 million max
}

// Validate string length
export function isValidLength(str, min = 0, max = 1000) {
  if (typeof str !== 'string') return false;
  return str.length >= min && str.length <= max;
}

// Validate required fields
export function validateRequired(obj, fields) {
  const errors = {};
  
  for (const field of fields) {
    const value = obj[field];
    if (value === undefined || value === null || value === '') {
      errors[field] = 'This field is required';
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

// Sanitize and validate bio/description
export function validateBio(bio) {
  if (!bio) return { valid: true, sanitized: '' };
  
  if (typeof bio !== 'string') {
    return { valid: false, error: 'Bio must be text' };
  }
  
  if (bio.length > 500) {
    return { valid: false, error: 'Bio too long (max 500 characters)' };
  }
  
  // Basic profanity check (expand as needed)
  const blacklist = ['spam', 'scam']; // Add more as needed
  const lowerBio = bio.toLowerCase();
  
  for (const word of blacklist) {
    if (lowerBio.includes(word)) {
      return { valid: false, error: 'Bio contains prohibited content' };
    }
  }
  
  return { valid: true, sanitized: bio.trim() };
}

// Validate date string
export function isValidDate(dateStr) {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

// Validate future date
export function isValidFutureDate(dateStr) {
  if (!isValidDate(dateStr)) return false;
  return new Date(dateStr) > new Date();
}

// Validate hex color
export function isValidHexColor(color) {
  if (!color || typeof color !== 'string') return false;
  return /^#([0-9A-F]{3}){1,2}$/i.test(color);
}