import React, { createContext, useContext, useState } from 'react';

interface SOSContextValue {
  sosActive: boolean;
  triggerSOS: () => void;
  clearSOS: () => void;
}

const SOSContext = createContext<SOSContextValue>({
  sosActive: false,
  triggerSOS: () => {},
  clearSOS: () => {},
});

export function SOSProvider({ children }: { children: React.ReactNode }) {
  const [sosActive, setSosActive] = useState(false);
  const triggerSOS = () => setSosActive(true);
  const clearSOS = () => setSosActive(false); // never auto-resumes sharing
  return (
    <SOSContext.Provider value={{ sosActive, triggerSOS, clearSOS }}>
      {children}
    </SOSContext.Provider>
  );
}

export function useSOSContext() {
  return useContext(SOSContext);
}

export default SOSContext;
