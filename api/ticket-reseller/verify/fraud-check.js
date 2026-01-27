import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/ticket-reseller/verify/fraud-check
 * Run comprehensive fraud checks on a ticket listing
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { listing_id, proofs, confirmation_details } = req.body;

    if (!listing_id) {
      return res.status(400).json({ error: 'listing_id is required' });
    }

    // Get listing details
    const { data: listing, error: listingError } = await supabase
      .from('ticket_listings')
      .select('*, seller:seller_email(*)')
      .eq('id', listing_id)
      .single();

    if (listingError || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const checks = [];
    const warnings = [];
    let riskScore = 0;

    // ============================================
    // CHECK 1: Seller History & Trust Score
    // ============================================
    const sellerCheck = await checkSellerHistory(listing.seller_email, supabase);
    checks.push({
      name: 'Seller Trust Score',
      passed: sellerCheck.passed,
      details: sellerCheck.details
    });
    if (!sellerCheck.passed) {
      riskScore += 20;
      warnings.push(sellerCheck.warning);
    }

    // ============================================
    // CHECK 2: Duplicate Listing Detection
    // ============================================
    const duplicateCheck = await checkDuplicateListings(
      listing,
      confirmation_details?.order_reference,
      supabase
    );
    checks.push({
      name: 'Duplicate Detection',
      passed: duplicateCheck.passed,
      details: duplicateCheck.details
    });
    if (!duplicateCheck.passed) {
      riskScore += 40;
      warnings.push(duplicateCheck.warning);
    }

    // ============================================
    // CHECK 3: Price Analysis
    // ============================================
    const priceCheck = checkPriceAnomaly(listing);
    checks.push({
      name: 'Price Analysis',
      passed: priceCheck.passed,
      details: priceCheck.details
    });
    if (!priceCheck.passed) {
      riskScore += 15;
      warnings.push(priceCheck.warning);
    }

    // ============================================
    // CHECK 4: Event Date Validity
    // ============================================
    const dateCheck = checkEventDate(listing.event_date);
    checks.push({
      name: 'Event Date Valid',
      passed: dateCheck.passed,
      details: dateCheck.details
    });
    if (!dateCheck.passed) {
      riskScore += 30;
      warnings.push(dateCheck.warning);
    }

    // ============================================
    // CHECK 5: Proof Quality Assessment
    // ============================================
    const proofCheck = assessProofQuality(proofs);
    checks.push({
      name: 'Proof Quality',
      passed: proofCheck.passed,
      details: proofCheck.details
    });
    if (!proofCheck.passed) {
      riskScore += 25;
      warnings.push(proofCheck.warning);
    }

    // ============================================
    // CHECK 6: Velocity Check (too many listings)
    // ============================================
    const velocityCheck = await checkListingVelocity(listing.seller_email, supabase);
    checks.push({
      name: 'Listing Velocity',
      passed: velocityCheck.passed,
      details: velocityCheck.details
    });
    if (!velocityCheck.passed) {
      riskScore += 20;
      warnings.push(velocityCheck.warning);
    }

    // ============================================
    // CHECK 7: Order Reference Validation
    // ============================================
    const orderCheck = validateOrderReference(
      confirmation_details?.order_reference,
      confirmation_details?.ticketing_platform
    );
    checks.push({
      name: 'Order Reference Format',
      passed: orderCheck.passed,
      details: orderCheck.details
    });
    if (!orderCheck.passed) {
      riskScore += 10;
      warnings.push(orderCheck.warning);
    }

    // ============================================
    // CHECK 8: Email Domain Check
    // ============================================
    const emailCheck = checkEmailDomain(confirmation_details?.original_purchaser_email);
    checks.push({
      name: 'Email Domain',
      passed: emailCheck.passed,
      details: emailCheck.details
    });
    if (!emailCheck.passed) {
      riskScore += 10;
      warnings.push(emailCheck.warning);
    }

    // ============================================
    // CHECK 9: Known Fraud Patterns
    // ============================================
    const patternCheck = await checkKnownFraudPatterns(listing, confirmation_details, supabase);
    checks.push({
      name: 'Fraud Pattern Detection',
      passed: patternCheck.passed,
      details: patternCheck.details
    });
    if (!patternCheck.passed) {
      riskScore += 50;
      warnings.push(patternCheck.warning);
    }

    // Determine overall result
    const passed = riskScore < 50;
    const requiresManualReview = riskScore >= 30 && riskScore < 50;

    // Store fraud check result
    const fraudCheckId = crypto.randomUUID();
    await supabase
      .from('ticket_fraud_checks')
      .insert({
        id: fraudCheckId,
        listing_id,
        risk_score: riskScore,
        passed,
        requires_manual_review: requiresManualReview,
        checks: JSON.stringify(checks),
        warnings,
        checked_at: new Date().toISOString()
      });

    // Update listing with fraud check status
    await supabase
      .from('ticket_listings')
      .update({
        fraud_check_id: fraudCheckId,
        fraud_check_status: passed ? (requiresManualReview ? 'review' : 'passed') : 'failed',
        fraud_risk_score: riskScore
      })
      .eq('id', listing_id);

    return res.status(200).json({
      passed,
      requires_manual_review: requiresManualReview,
      risk_score: riskScore,
      message: passed
        ? requiresManualReview
          ? 'Passed with minor concerns - will be reviewed'
          : 'All verification checks passed'
        : 'Verification failed - please review the warnings',
      checks,
      warnings: warnings.filter(Boolean),
      fraud_check_id: fraudCheckId
    });

  } catch (error) {
    console.error('Fraud check error:', error);
    return res.status(500).json({ error: 'Fraud check failed' });
  }
}

// Helper Functions

async function checkSellerHistory(sellerEmail, supabase) {
  const { data: seller } = await supabase
    .from('ticket_sellers')
    .select('trust_score, total_sales, disputes_lost, id_verified, joined_at')
    .eq('email', sellerEmail)
    .single();

  if (!seller) {
    return {
      passed: true,
      details: 'New seller - no history',
      warning: 'New seller with no transaction history'
    };
  }

  const daysSinceJoined = (Date.now() - new Date(seller.joined_at).getTime()) / (1000 * 60 * 60 * 24);
  const hasGoodHistory = seller.trust_score >= 60 && seller.disputes_lost < 2;
  const isNewAccount = daysSinceJoined < 7;

  return {
    passed: hasGoodHistory && !isNewAccount,
    details: `Trust: ${seller.trust_score}%, Sales: ${seller.total_sales}, Disputes lost: ${seller.disputes_lost}`,
    warning: isNewAccount 
      ? 'Account less than 7 days old' 
      : hasGoodHistory 
        ? null 
        : 'Low trust score or dispute history'
  };
}

async function checkDuplicateListings(listing, orderRef, supabase) {
  // Check for same event + similar tickets from different sellers
  const { data: duplicates } = await supabase
    .from('ticket_listings')
    .select('id, seller_email, order_reference')
    .eq('event_name', listing.event_name)
    .eq('event_date', listing.event_date)
    .eq('ticket_type', listing.ticket_type)
    .neq('id', listing.id)
    .neq('status', 'sold')
    .neq('status', 'cancelled');

  // Check if same order reference used elsewhere
  if (orderRef) {
    const { data: sameOrder } = await supabase
      .from('ticket_verification_requests')
      .select('listing_id')
      .eq('order_reference', orderRef)
      .neq('listing_id', listing.id);

    if (sameOrder?.length > 0) {
      return {
        passed: false,
        details: 'Order reference used in another listing',
        warning: 'This order reference has been used before - possible duplicate'
      };
    }
  }

  return {
    passed: true,
    details: duplicates?.length > 0 
      ? `${duplicates.length} similar listings found (different sellers)` 
      : 'No duplicates found',
    warning: null
  };
}

function checkPriceAnomaly(listing) {
  const markup = ((listing.asking_price_gbp - listing.original_price_gbp) / listing.original_price_gbp) * 100;
  
  if (markup > 100) {
    return {
      passed: false,
      details: `${markup.toFixed(0)}% markup is excessive`,
      warning: 'Price markup exceeds 100% - potential scalping'
    };
  }

  if (listing.asking_price_gbp < listing.original_price_gbp * 0.3) {
    return {
      passed: false,
      details: 'Price suspiciously low',
      warning: 'Price is less than 30% of original - possible scam'
    };
  }

  return {
    passed: true,
    details: `${markup.toFixed(0)}% markup`,
    warning: null
  };
}

function checkEventDate(eventDate) {
  const date = new Date(eventDate);
  const now = new Date();
  const hoursUntil = (date - now) / (1000 * 60 * 60);

  if (hoursUntil < 0) {
    return {
      passed: false,
      details: 'Event has already passed',
      warning: 'Cannot sell tickets for past events'
    };
  }

  if (hoursUntil < 6) {
    return {
      passed: false,
      details: 'Event is less than 6 hours away',
      warning: 'Too close to event time for safe transfer'
    };
  }

  return {
    passed: true,
    details: `Event in ${Math.floor(hoursUntil / 24)} days`,
    warning: null
  };
}

function assessProofQuality(proofs) {
  if (!proofs || proofs.length === 0) {
    return {
      passed: false,
      details: 'No proofs uploaded',
      warning: 'No proof documents provided'
    };
  }

  const hasConfirmation = proofs.some(p => p.proof_type === 'confirmation_email');
  const hasTicket = proofs.some(p => p.proof_type === 'ticket_screenshot');

  if (!hasConfirmation || !hasTicket) {
    return {
      passed: false,
      details: 'Missing required proofs',
      warning: 'Confirmation email and ticket screenshot are required'
    };
  }

  return {
    passed: true,
    details: `${proofs.length} proof documents uploaded`,
    warning: null
  };
}

async function checkListingVelocity(sellerEmail, supabase) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { data: recentListings } = await supabase
    .from('ticket_listings')
    .select('id')
    .eq('seller_email', sellerEmail)
    .gte('created_at', oneDayAgo);

  const count = recentListings?.length || 0;

  if (count > 10) {
    return {
      passed: false,
      details: `${count} listings in last 24h`,
      warning: 'Unusually high listing volume - potential bulk fraud'
    };
  }

  if (count > 5) {
    return {
      passed: true,
      details: `${count} listings in last 24h (elevated)`,
      warning: 'Higher than average listing activity'
    };
  }

  return {
    passed: true,
    details: `${count} listings in last 24h`,
    warning: null
  };
}

function validateOrderReference(orderRef, platform) {
  if (!orderRef) {
    return {
      passed: false,
      details: 'No order reference provided',
      warning: 'Order reference is required for verification'
    };
  }

  // Platform-specific validation patterns
  const patterns = {
    resident_advisor: /^(RA-)?[A-Z0-9]{6,12}$/i,
    dice: /^[A-Z0-9]{8,16}$/i,
    eventbrite: /^[0-9]{10,14}$/,
    skiddle: /^[A-Z0-9]{8,12}$/i,
    ticketmaster: /^[0-9]{12,16}-[0-9]+$/,
  };

  const pattern = patterns[platform];
  if (pattern && !pattern.test(orderRef)) {
    return {
      passed: false,
      details: 'Order reference format doesn\'t match platform',
      warning: 'Order reference format is suspicious for this platform'
    };
  }

  return {
    passed: true,
    details: 'Order reference format valid',
    warning: null
  };
}

function checkEmailDomain(email) {
  if (!email) {
    return {
      passed: false,
      details: 'No email provided',
      warning: 'Purchaser email is required'
    };
  }

  const disposableDomains = [
    'tempmail', 'guerrillamail', '10minutemail', 'mailinator',
    'throwaway', 'fakeinbox', 'temp-mail', 'disposable'
  ];

  const domain = email.split('@')[1]?.toLowerCase() || '';
  const isDisposable = disposableDomains.some(d => domain.includes(d));

  if (isDisposable) {
    return {
      passed: false,
      details: 'Disposable email detected',
      warning: 'Temporary/disposable email addresses are not allowed'
    };
  }

  return {
    passed: true,
    details: 'Email domain valid',
    warning: null
  };
}

async function checkKnownFraudPatterns(listing, confirmationDetails, supabase) {
  // Check blacklisted order references
  const { data: blacklist } = await supabase
    .from('fraud_blacklist')
    .select('pattern, type')
    .eq('active', true);

  if (blacklist) {
    for (const item of blacklist) {
      if (item.type === 'order_reference' && confirmationDetails?.order_reference?.includes(item.pattern)) {
        return {
          passed: false,
          details: 'Matches known fraud pattern',
          warning: 'This order reference matches a known fraudulent pattern'
        };
      }
      if (item.type === 'email_domain' && confirmationDetails?.original_purchaser_email?.includes(item.pattern)) {
        return {
          passed: false,
          details: 'Email domain blacklisted',
          warning: 'This email domain has been associated with fraud'
        };
      }
    }
  }

  return {
    passed: true,
    details: 'No known fraud patterns detected',
    warning: null
  };
}
