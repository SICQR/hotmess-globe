/**
 * HOTMESS Radio Booking System
 * 
 * Rules:
 * - No open submissions
 * - All sets are time-boxed
 * - City-context required
 * - Replays expire
 */

import { DJ_ARCHETYPES, canAppear } from './archetypes';

// Booking rules
export const BOOKING_RULES = {
  minLeadTimeDays: 7,
  maxLeadTimeDays: 60,
  minSetDurationMinutes: 30,
  maxSetDurationMinutes: 180,
  replayExpiryDays: 14,
  maxBookingsPerDJ: {
    scene_anchor: 4,
    cult_translator: 2,
    moving_export: 3,
  },
};

// Time slots (UTC)
export const TIME_SLOTS = {
  MORNING: { start: '06:00', end: '12:00', label: 'Morning' },
  AFTERNOON: { start: '12:00', end: '18:00', label: 'Afternoon' },
  EVENING: { start: '18:00', end: '22:00', label: 'Evening' },
  NIGHT: { start: '22:00', end: '02:00', label: 'Night' },
  LATE_NIGHT: { start: '02:00', end: '06:00', label: 'Late Night' },
};

// Archetype → preferred slots
export const ARCHETYPE_SLOTS = {
  scene_anchor: ['EVENING', 'NIGHT'],
  cult_translator: ['LATE_NIGHT', 'NIGHT'],
  moving_export: ['EVENING', 'NIGHT', 'AFTERNOON'],
};

/**
 * Check if booking is valid
 */
export function validateBooking(booking, djProfile, cityHeat) {
  const errors = [];
  const warnings = [];

  // Check archetype
  if (!djProfile.archetype || !DJ_ARCHETYPES[djProfile.archetype]) {
    errors.push('DJ must have valid archetype');
  }

  // Check city context
  if (!booking.city) {
    errors.push('City context required');
  }

  // Check lead time
  const leadDays = (new Date(booking.date) - new Date()) / (1000 * 60 * 60 * 24);
  if (leadDays < BOOKING_RULES.minLeadTimeDays) {
    errors.push(`Minimum ${BOOKING_RULES.minLeadTimeDays} days lead time required`);
  }
  if (leadDays > BOOKING_RULES.maxLeadTimeDays) {
    errors.push(`Maximum ${BOOKING_RULES.maxLeadTimeDays} days advance booking`);
  }

  // Check duration
  if (booking.durationMinutes < BOOKING_RULES.minSetDurationMinutes) {
    errors.push(`Minimum ${BOOKING_RULES.minSetDurationMinutes} minute sets`);
  }
  if (booking.durationMinutes > BOOKING_RULES.maxSetDurationMinutes) {
    errors.push(`Maximum ${BOOKING_RULES.maxSetDurationMinutes} minute sets`);
  }

  // Check DJ can appear
  const appearCheck = canAppear(djProfile, {
    radioAppearancesThisMonth: booking.djMonthlyAppearances || 0,
    activeCities: booking.djActiveCities || [],
    lastAppearance: booking.djLastAppearance,
    consecutiveAppearances: booking.djConsecutiveAppearances || 0,
    lastFeature: booking.djLastFeature,
  });

  if (!appearCheck.allowed) {
    if (appearCheck.reason === 'cooldown') {
      errors.push(`DJ on cooldown. Available in ${appearCheck.availableIn} days`);
    } else {
      errors.push(`DJ cannot appear: ${appearCheck.reason}`);
    }
  }

  // Check time slot matches archetype
  const preferredSlots = ARCHETYPE_SLOTS[djProfile.archetype] || [];
  if (!preferredSlots.includes(booking.timeSlot)) {
    warnings.push(`${booking.timeSlot} is not typical for ${djProfile.archetype}`);
  }

  // Check city heat threshold
  if (cityHeat) {
    if (cityHeat.score < 30 && djProfile.archetype === 'moving_export') {
      warnings.push('City heat low for touring DJ. Consider different timing.');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get available slots for a city/date
 */
export function getAvailableSlots(city, date, existingBookings) {
  const dayBookings = existingBookings.filter(b => 
    b.city === city && 
    new Date(b.date).toDateString() === new Date(date).toDateString()
  );

  const available = [];
  
  for (const [slotId, slot] of Object.entries(TIME_SLOTS)) {
    const isBooked = dayBookings.some(b => b.timeSlot === slotId);
    if (!isBooked) {
      available.push({
        id: slotId,
        ...slot,
        available: true,
      });
    }
  }

  return available;
}

/**
 * Calculate optimal booking time based on city heat
 */
export function suggestBookingTime(djProfile, city, cityHeatData) {
  const archetype = DJ_ARCHETYPES[djProfile.archetype];
  if (!archetype) return null;

  const preferredSlots = ARCHETYPE_SLOTS[djProfile.archetype];
  const suggestions = [];

  // Find peak heat windows
  const peakWindows = cityHeatData?.peakWindows || {};
  
  for (const slot of preferredSlots) {
    const slotInfo = TIME_SLOTS[slot];
    const heatDuring = cityHeatData?.hourlyHeat?.[slot] || 0.5;

    suggestions.push({
      slot,
      slotInfo,
      heatScore: heatDuring,
      recommended: heatDuring > 0.6,
      reason: heatDuring > 0.6 
        ? 'Peak city activity' 
        : 'Standard time slot',
    });
  }

  // Sort by heat score
  suggestions.sort((a, b) => b.heatScore - a.heatScore);

  return {
    suggestions,
    topRecommendation: suggestions[0],
  };
}

/**
 * Create booking request
 */
export function createBookingRequest(djProfile, booking) {
  return {
    id: crypto.randomUUID(),
    status: 'pending',
    dj: {
      id: djProfile.id,
      name: djProfile.name,
      archetype: djProfile.archetype,
    },
    city: booking.city,
    date: booking.date,
    timeSlot: booking.timeSlot,
    durationMinutes: booking.durationMinutes,
    showId: booking.showId, // Link to radio show/persona
    notes: booking.notes,
    createdAt: new Date().toISOString(),
    // Replay settings
    replay: {
      enabled: true,
      expiresAt: new Date(
        new Date(booking.date).getTime() + 
        BOOKING_RULES.replayExpiryDays * 24 * 60 * 60 * 1000
      ).toISOString(),
    },
  };
}

/**
 * Get DJ booking history for limits check
 */
export function getBookingContext(djId, bookings) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const djBookings = bookings.filter(b => b.dj?.id === djId);
  const thisMonth = djBookings.filter(b => new Date(b.date) >= monthStart);
  
  // Sort by date descending
  djBookings.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Count consecutive appearances
  let consecutive = 0;
  for (const booking of djBookings) {
    if (booking.status === 'completed') {
      consecutive++;
      // Check if there was a gap
      const prev = djBookings[djBookings.indexOf(booking) + 1];
      if (prev) {
        const daysBetween = (new Date(booking.date) - new Date(prev.date)) / (1000 * 60 * 60 * 24);
        if (daysBetween > 14) break; // Gap breaks consecutive count
      }
    }
  }

  return {
    radioAppearancesThisMonth: thisMonth.length,
    activeCities: [...new Set(thisMonth.map(b => b.city))],
    lastAppearance: djBookings[0]?.date,
    consecutiveAppearances: consecutive,
    lastFeature: djBookings.find(b => b.isFeatured)?.date,
  };
}
