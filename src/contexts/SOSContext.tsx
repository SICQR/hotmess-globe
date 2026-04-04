import React, { createContext, useContext, useState } from 'react';

interface SOSContextValue {
  sosActive: boolean;
  showRecovery: boolean;
  triggerSOS: () => void;
  clearSOS: () => void;
  dismissRecovery: () => void;
}

const SOSContext = createContext<SOSContextValue>({
  sosActive: false,
  showRecovery: false,
  triggerSOS: () => {},
  clearSOS: () => {},
  dismissRecovery: () => {},
});

export function SOSProvider({ children }: { children: React.ReactNode }) {
  const [sosActive, setSosActive] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const triggerSOS = () => setSosActive(true);
  const clearSOS = () => {
    setSosActive(false);
    setShowRecovery(true); // show recovery screen after SOS dismissed
  };
  const dismissRecovery = () => setShowRecovery(false);
  return (
    <SOSContext.Provider value={{ sosActive, showRecovery, triggerSOS, clearSOS, dismissRecovery }}>
      {children}
    </SOSContext.Provider>
  );
}

export function useSOSContext() {
  return useContext(SOSContext);
}

export default SOSContext;
