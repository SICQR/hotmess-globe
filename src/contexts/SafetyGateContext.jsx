import { createContext, useContext, useState, useCallback } from 'react';

/**
 * Safety Gate Context
 * Enforces consent gates before sensitive actions
 * 
 * Gates:
 * - age: 18+ verification (hard block)
 * - consent: platform terms (persistent)
 * - sexual: adult content warning
 * - commerce: purchase confirmation
 * - distress: AI-triggered check-in
 */

const SafetyGateContext = createContext(null);

export const GATE_TYPES = {
  AGE: 'age',
  CONSENT: 'consent',
  SEXUAL: 'sexual',
  COMMERCE: 'commerce',
  DISTRESS: 'distress',
};

export function SafetyGateProvider({ children }) {
  const [activeGate, setActiveGate] = useState(null);
  const [gateHistory, setGateHistory] = useState({});
  const [pendingAction, setPendingAction] = useState(null);

  const requireGate = useCallback((gateType, action) => {
    // Check if already passed
    if (gateHistory[gateType]) {
      action?.();
      return true;
    }
    
    setPendingAction(() => action);
    setActiveGate(gateType);
    return false;
  }, [gateHistory]);

  const passGate = useCallback((gateType) => {
    setGateHistory(prev => ({ ...prev, [gateType]: Date.now() }));
    setActiveGate(null);
    
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [pendingAction]);

  const dismissGate = useCallback(() => {
    setActiveGate(null);
    setPendingAction(null);
  }, []);

  const hasPassedGate = useCallback((gateType) => {
    return !!gateHistory[gateType];
  }, [gateHistory]);

  const value = {
    activeGate,
    requireGate,
    passGate,
    dismissGate,
    hasPassedGate,
    GATE_TYPES,
  };

  return (
    <SafetyGateContext.Provider value={value}>
      {children}
    </SafetyGateContext.Provider>
  );
}

export function useSafetyGate() {
  const ctx = useContext(SafetyGateContext);
  if (!ctx) throw new Error('useSafetyGate must be used within SafetyGateProvider');
  return ctx;
}

export default SafetyGateContext;
