import { useCallback } from 'react';
import { useSafetyGate, GATE_TYPES } from '@/contexts/SafetyGateContext';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

/**
 * Commerce Gate
 * Enforces commerce safety check before purchase
 * 
 * Blocks:
 * - Sexual services
 * - Escort advertising
 * - Pay-per-meet sexual access
 */

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
            HOTMESS allows physical goods, digital items, and community access. 
            Sexual services are not permitted.
          </p>
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
 * Server-side validation hook for product listings
 */
export function useCommerceValidator() {
  const BLOCKED_KEYWORDS = [
    'escort', 'outcall', 'incall', 'per hour', 'hourly rate',
    'services', 'companionship', 'gfe', 'pse', 'full service',
    'meet up fee', 'donation', 'roses', 'generous'
  ];

  const validate = useCallback((title, description) => {
    const text = `${title} ${description}`.toLowerCase();
    
    for (const keyword of BLOCKED_KEYWORDS) {
      if (text.includes(keyword)) {
        return {
          valid: false,
          reason: 'Listing appears to advertise services, not items.',
          blocked_keyword: keyword,
        };
      }
    }

    return { valid: true };
  }, []);

  return { validate };
}

export default CommerceGate;
