import { useCallback, useState } from 'react';
import { useSafetyGate, GATE_TYPES } from '@/contexts/SafetyGateContext';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';

/**
 * Commerce Gate
 * Enforces commerce safety check before purchase
 * 
 * Blocks:
 * - Sexual services
 * - Escort advertising
 * - Pay-per-meet sexual access
 * 
 * "Items are not people. This boundary is enforced."
 */

// Blocked keywords (server also enforces via SQL trigger)
const BLOCKED_KEYWORDS = [
  'escort', 'outcall', 'incall', 'per hour', 'hourly rate',
  'sex work', 'sexual service', 'pay per meet', 'meet for pay',
  'services', 'companionship', 'gfe', 'pse', 'full service',
  'meet up fee', 'donation', 'roses', 'generous', 'party and play',
  'pnp', 'chem friendly for', 'hosting for'
];

// Allowed categories (must match schema enum)
const ALLOWED_CATEGORIES = [
  'clothing',
  'fetish_gear', 
  'worn_items',
  'physical_goods',
  'digital_goods',
  'telegram_access',
  'event_access',
  'custom'
];

export function CommerceGate({ children, onProceed, productType }) {
  const { requireGate, hasPassedGate } = useSafetyGate();

  const handleProceed = useCallback(() => {
    requireGate(GATE_TYPES.COMMERCE, onProceed);
  }, [requireGate, onProceed]);

  // Already passed
  if (hasPassedGate(GATE_TYPES.COMMERCE)) {
    return children;
  }

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
        <div className="text-center p-6 max-w-sm">
          <ShieldCheck className="mx-auto mb-3 text-[#00D9FF]" size={32} />
          <h3 className="text-lg font-bold text-white mb-2">
            Commerce Safety Check
          </h3>
          <p className="text-sm text-white/70 mb-4">
            MessMarket allows physical goods, digital items, worn items, and community access.
            Sexual services are not permitted.
          </p>
          <div className="text-xs text-white/50 mb-4">
            Items are not people. This boundary is enforced.
          </div>
          <Button variant="cyan" onClick={handleProceed}>
            I understand, continue
          </Button>
        </div>
      </div>
      <div className="opacity-30 pointer-events-none">
        {children}
      </div>
    </div>
  );
}

/**
 * Commerce Validator
 * Client-side validation for product listings (server also validates)
 */
export function useCommerceValidator() {
  const [lastError, setLastError] = useState(null);

  const validate = useCallback((title, description, category) => {
    setLastError(null);
    const text = `${title || ''} ${description || ''}`.toLowerCase();
    
    // Check category is allowed
    if (category && !ALLOWED_CATEGORIES.includes(category)) {
      const error = {
        valid: false,
        reason: 'Category not allowed on MessMarket.',
        field: 'category',
      };
      setLastError(error);
      return error;
    }

    // Check for blocked keywords
    for (const keyword of BLOCKED_KEYWORDS) {
      if (text.includes(keyword.toLowerCase())) {
        const error = {
          valid: false,
          reason: 'Listing appears to advertise services, not items. This is not allowed.',
          blocked_keyword: keyword,
          field: 'description',
        };
        setLastError(error);
        return error;
      }
    }

    return { valid: true };
  }, []);

  const validateCategory = useCallback((category) => {
    return ALLOWED_CATEGORIES.includes(category);
  }, []);

  return { validate, validateCategory, lastError, ALLOWED_CATEGORIES };
}

/**
 * Blocked Content Warning
 * Shows when validation fails
 */
export function BlockedContentWarning({ reason, onDismiss }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <div className="font-semibold text-red-400 mb-1">Listing Not Allowed</div>
          <div className="text-sm text-red-300/80">{reason}</div>
          <div className="text-xs text-white/40 mt-2">
            MessMarket is for items only. Sexual services, escorts, and pay-per-meet are prohibited.
          </div>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-white/40 hover:text-white">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

export default CommerceGate;
