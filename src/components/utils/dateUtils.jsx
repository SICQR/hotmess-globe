import { format, formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Date utilities for consistent UTC handling
 * CRITICAL: Always store dates as UTC ISO strings in database
 * Format on client side for display
 */

/**
 * Get current UTC timestamp as ISO string
 * Use this when creating new date fields
 */
export function getCurrentUTC() {
  return new Date().toISOString();
}

/**
 * Convert date to UTC ISO string for storage
 * @param {Date|string|number} date - Date to convert
 * @returns {string} UTC ISO string
 */
export function toUTC(date) {
  if (!date) return null;
  return new Date(date).toISOString();
}

/**
 * Parse ISO string to Date object
 * @param {string} isoString - ISO date string from database
 * @returns {Date} Date object in local timezone
 */
export function fromUTC(isoString) {
  if (!isoString) return null;
  return parseISO(isoString);
}

/**
 * Format UTC date for display (local timezone)
 * @param {string} isoString - ISO date string from database
 * @param {string} formatStr - date-fns format string (default: 'MMM d, yyyy HH:mm')
 * @returns {string} Formatted date in local timezone
 */
export function formatUTCDate(isoString, formatStr = 'MMM d, yyyy HH:mm') {
  if (!isoString) return '';
  const date = fromUTC(isoString);
  return format(date, formatStr);
}

/**
 * Format UTC date as relative time (e.g., "2 hours ago")
 * @param {string} isoString - ISO date string from database
 * @returns {string} Relative time string
 */
export function formatRelative(isoString) {
  if (!isoString) return '';
  const date = fromUTC(isoString);
  return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * Check if event is happening soon (within next 24 hours)
 * @param {string} eventDateISO - Event date as ISO string
 * @returns {boolean}
 */
export function isEventSoon(eventDateISO) {
  if (!eventDateISO) return false;
  const eventDate = fromUTC(eventDateISO);
  const now = new Date();
  const hoursUntil = (eventDate - now) / (1000 * 60 * 60);
  return hoursUntil > 0 && hoursUntil <= 24;
}

/**
 * Check if event is happening in 1 hour
 * @param {string} eventDateISO - Event date as ISO string
 * @returns {boolean}
 */
export function isEventInOneHour(eventDateISO) {
  if (!eventDateISO) return false;
  const eventDate = fromUTC(eventDateISO);
  const now = new Date();
  const minutesUntil = (eventDate - now) / (1000 * 60);
  return minutesUntil > 50 && minutesUntil <= 70; // 50-70 min window
}

/**
 * Get user's timezone for display
 * @returns {string} Timezone (e.g., "America/New_York")
 */
export function getUserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Format event date with timezone indicator
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted date with timezone
 */
export function formatEventDate(isoString) {
  if (!isoString) return '';
  const date = fromUTC(isoString);
  const formatted = format(date, 'MMM d, yyyy @ HH:mm');
  const tz = getUserTimezone().split('/').pop().replace('_', ' ');
  return `${formatted} (${tz})`;
}