/**
 * HOTMESS Ticket AI Anomaly Detection
 */

const THRESHOLDS = {
  PRICE_SPIKE_PERCENT: 150,
  RAPID_RESALE_HOURS: 24,
  SELLER_FLAG_HISTORY: 2,
  CAPACITY_BUFFER: 1.1,
};

export const RISK_LEVELS = {
  LOW: { level: 'low', action: 'proceed', delay: 0 },
  MEDIUM: { level: 'medium', action: 'delay_warning', delay: 300 },
  HIGH: { level: 'high', action: 'escrow_review', delay: null },
};

export function detectAnomalies(ticket, context) {
  const anomalies = [];
  let riskScore = 0;

  // Price spike
  if (context.baselinePrice > 0) {
    const priceRatio = (ticket.price / context.baselinePrice) * 100;
    if (priceRatio > THRESHOLDS.PRICE_SPIKE_PERCENT) {
      anomalies.push({ type: 'price_spike', score: Math.min((priceRatio - 100) / 50, 40) });
      riskScore += anomalies[anomalies.length - 1].score;
    }
  }

  // Rapid resale
  const recentPurchase = context.purchaseHistory?.find(p => 
    p.ticket_id === ticket.id && p.buyer_id === ticket.seller_id
  );
  if (recentPurchase) {
    const hours = (Date.now() - new Date(recentPurchase.purchased_at).getTime()) / 3600000;
    if (hours < THRESHOLDS.RAPID_RESALE_HOURS) {
      anomalies.push({ type: 'rapid_resale', score: 25 });
      riskScore += 25;
    }
  }

  // Seller history
  const flagCount = context.sellerFlags?.[ticket.seller_id] || 0;
  if (flagCount >= THRESHOLDS.SELLER_FLAG_HISTORY) {
    anomalies.push({ type: 'seller_history', score: 15 + flagCount * 5 });
    riskScore += 15 + flagCount * 5;
  }

  // Capacity
  if (context.eventCapacity && context.ticketsSold / context.eventCapacity > THRESHOLDS.CAPACITY_BUFFER) {
    anomalies.push({ type: 'capacity_exceeded', score: 35 });
    riskScore += 35;
  }

  const riskLevel = riskScore >= 50 ? RISK_LEVELS.HIGH : riskScore >= 25 ? RISK_LEVELS.MEDIUM : RISK_LEVELS.LOW;

  return { ticketId: ticket.id, riskScore, ...riskLevel, anomalies };
}

export function applyRiskAction(assessment, ticket) {
  switch (assessment.action) {
    case 'proceed': return { ...ticket, status: 'active', risk_assessed: true };
    case 'delay_warning': return { ...ticket, status: 'pending_review', warning_shown: true };
    case 'escrow_review': return { ...ticket, status: 'escrow_hold', requires_manual_review: true };
    default: return ticket;
  }
}
