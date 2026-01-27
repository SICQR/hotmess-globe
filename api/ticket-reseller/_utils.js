/**
 * Ticket Reseller Platform - Shared Utilities
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Platform fee configuration
export const PLATFORM_FEE_PERCENTAGE = 10; // 10% platform fee
export const BUYER_PROTECTION_FEE_PERCENTAGE = 2.5; // 2.5% buyer protection
export const MAX_MARKUP_PERCENTAGE = 50; // Maximum allowed markup over original price
export const ESCROW_AUTO_RELEASE_HOURS = 48; // Auto-release escrow after buyer confirmation window
export const TRANSFER_DEADLINE_HOURS = 24; // Seller must transfer within 24 hours
export const CONFIRMATION_DEADLINE_HOURS = 48; // Buyer must confirm within 48 hours

// Ticket types
export const TICKET_TYPES = [
  'general_admission',
  'vip',
  'early_bird',
  'table',
  'backstage',
  'premium',
  'other',
];

// Ticket sources (where the ticket was originally purchased)
export const TICKET_SOURCES = [
  'resident_advisor',
  'dice',
  'eventbrite',
  'skiddle',
  'fatsoma',
  'venue_direct',
  'promoter',
  'other',
];

// Transfer methods
export const TRANSFER_METHODS = [
  'email_transfer', // Ticket provider allows email transfer
  'app_transfer', // Transfer via ticketing app
  'name_change', // Change name on ticket
  'pdf_send', // Send PDF ticket directly
  'physical_handover', // Meet in person (lowest trust)
];

/**
 * Get service role Supabase client for admin operations
 */
export function getServiceClient() {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Get authenticated Supabase client from request
 */
export function getAuthClient(token) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/**
 * Extract bearer token from request
 */
export function getAuthToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
}

/**
 * Validate and get user from request
 */
export async function validateUser(req) {
  const token = getAuthToken(req);
  if (!token) {
    return { error: 'Unauthorized - No token provided' };
  }

  const supabase = getAuthClient(token);
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { error: 'Unauthorized - Invalid token' };
  }

  return { user, supabase, token };
}

/**
 * Calculate pricing breakdown for a ticket purchase
 */
export function calculatePricing(unitPrice, quantity = 1) {
  const subtotal = unitPrice * quantity;
  const platformFee = Math.round(subtotal * (PLATFORM_FEE_PERCENTAGE / 100) * 100) / 100;
  const buyerProtectionFee = Math.round(subtotal * (BUYER_PROTECTION_FEE_PERCENTAGE / 100) * 100) / 100;
  const total = Math.round((subtotal + platformFee + buyerProtectionFee) * 100) / 100;
  const sellerReceives = Math.round((subtotal - platformFee) * 100) / 100;

  return {
    unitPrice,
    quantity,
    subtotal,
    platformFee,
    buyerProtectionFee,
    total,
    sellerReceives,
  };
}

/**
 * Validate listing price against markup limits
 */
export function validatePricing(originalPrice, askingPrice) {
  if (originalPrice <= 0 || askingPrice <= 0) {
    return { valid: false, error: 'Prices must be greater than 0' };
  }

  const markup = ((askingPrice - originalPrice) / originalPrice) * 100;
  
  if (markup > MAX_MARKUP_PERCENTAGE) {
    return {
      valid: false,
      error: `Price markup exceeds ${MAX_MARKUP_PERCENTAGE}%. Maximum allowed price: £${(originalPrice * (1 + MAX_MARKUP_PERCENTAGE / 100)).toFixed(2)}`,
      markup,
      maxAllowedPrice: originalPrice * (1 + MAX_MARKUP_PERCENTAGE / 100),
    };
  }

  return { valid: true, markup };
}

/**
 * Calculate fraud score for a listing
 * Higher score = more suspicious
 */
export async function calculateFraudScore(supabase, listingData, sellerData) {
  let score = 0;
  const flags = [];

  // New seller with no history
  if (!sellerData || sellerData.total_sales === 0) {
    score += 15;
    flags.push('new_seller');
  }

  // Seller has previous disputes
  if (sellerData?.disputed_sales > 0) {
    const disputeRate = sellerData.disputed_sales / Math.max(sellerData.total_sales, 1);
    if (disputeRate > 0.1) {
      score += 25;
      flags.push('high_dispute_rate');
    } else if (disputeRate > 0.05) {
      score += 10;
      flags.push('some_disputes');
    }
  }

  // Seller has strikes
  if (sellerData?.strike_count > 0) {
    score += sellerData.strike_count * 15;
    flags.push('has_strikes');
  }

  // Low trust score
  if (sellerData?.trust_score < 30) {
    score += 20;
    flags.push('low_trust');
  }

  // Price significantly below market (could be scam)
  if (listingData.asking_price_gbp < listingData.original_price_gbp * 0.5) {
    score += 20;
    flags.push('suspiciously_low_price');
  }

  // No ticket proof provided
  if (!listingData.ticket_proof_url) {
    score += 15;
    flags.push('no_proof');
  }

  // Physical handover method (riskiest)
  if (listingData.transfer_method === 'physical_handover') {
    score += 10;
    flags.push('physical_handover');
  }

  // Event very soon (less than 24 hours)
  const eventDate = new Date(listingData.event_date);
  const hoursUntilEvent = (eventDate - new Date()) / (1000 * 60 * 60);
  if (hoursUntilEvent < 24) {
    score += 10;
    flags.push('event_imminent');
  }

  // Multiple active listings for same event
  const { count: duplicateCount } = await supabase
    .from('ticket_listings')
    .select('id', { count: 'exact', head: true })
    .eq('seller_id', listingData.seller_id)
    .eq('event_name', listingData.event_name)
    .eq('status', 'active');

  if (duplicateCount > 3) {
    score += 15;
    flags.push('multiple_listings_same_event');
  }

  return {
    score: Math.min(score, 100),
    flags,
    isSuspicious: score >= 50,
  };
}

/**
 * Get seller verification status and limits
 */
export async function getSellerVerification(supabase, userId) {
  const { data: verification } = await supabase
    .from('seller_ticket_verification')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!verification) {
    return {
      verified: false,
      status: 'unverified',
      canList: true, // Anyone can list initially
      maxActiveListings: 3,
      maxTicketValue: 200,
      trustScore: 50,
      badges: [],
    };
  }

  const canList = verification.status !== 'suspended' && verification.status !== 'banned';

  return {
    verified: verification.status === 'verified',
    status: verification.status,
    canList,
    maxActiveListings: verification.max_active_listings,
    maxTicketValue: verification.max_ticket_value_gbp,
    trustScore: verification.trust_score,
    badges: verification.badges || [],
    idVerified: verification.id_verified,
    phoneVerified: verification.phone_verified,
    stripeConnected: verification.stripe_connect_verified,
    totalSales: verification.total_sales,
    avgRating: verification.average_rating,
  };
}

/**
 * Add escrow event to audit trail
 */
export async function logEscrowEvent(supabase, escrowId, event, details = {}) {
  const { data: escrow } = await supabase
    .from('ticket_escrow')
    .select('events')
    .eq('id', escrowId)
    .single();

  const events = escrow?.events || [];
  events.push({
    event,
    timestamp: new Date().toISOString(),
    ...details,
  });

  await supabase
    .from('ticket_escrow')
    .update({ events, updated_at: new Date().toISOString() })
    .eq('id', escrowId);
}

/**
 * Log potential fraud for investigation
 */
export async function logFraudAlert(supabase, entityType, entityId, userId, fraudType, description, evidence = {}) {
  await supabase
    .from('ticket_fraud_logs')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      user_id: userId,
      fraud_type: fraudType,
      description,
      evidence,
      severity: evidence.severity || 'medium',
      confidence_score: evidence.confidence || 50,
    });
}

/**
 * Send notification helper
 */
export async function sendNotification(supabase, userEmail, type, title, message, link = null) {
  await supabase.from('notifications').insert({
    user_email: userEmail,
    type,
    title,
    message,
    link,
    created_at: new Date().toISOString(),
  });
}

/**
 * Check if event is too close to allow new listings
 */
export function validateEventDate(eventDate) {
  const event = new Date(eventDate);
  const now = new Date();
  const hoursUntilEvent = (event - now) / (1000 * 60 * 60);

  if (hoursUntilEvent < 2) {
    return { valid: false, error: 'Cannot list tickets for events starting within 2 hours' };
  }

  if (event < now) {
    return { valid: false, error: 'Cannot list tickets for past events' };
  }

  return { valid: true, hoursUntilEvent };
}
