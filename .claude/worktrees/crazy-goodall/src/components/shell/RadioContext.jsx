import React, { createContext, useContext, useState } from 'react';

const RadioContext = createContext();

export function RadioProvider({ children }) {
  const [isRadioOpen, setIsRadioOpen] = useState(false);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);

  const openRadio = () => {
    setIsRadioOpen(true);
    setShouldAutoPlay(true);
  };

  const closeRadio = () => {
    setIsRadioOpen(false);
    setShouldAutoPlay(false);
  };

  const toggleRadio = () => {
    setIsRadioOpen(prev => !prev);
  };

  return (
    <RadioContext.Provider value={{ isRadioOpen, shouldAutoPlay, openRadio, closeRadio, toggleRadio, setIsRadioOpen }}>
      {children}
    </RadioContext.Provider>
  );
}

export function useRadio() {
  const context = useContext(RadioContext);
  if (!context) {
    throw new Error('useRadio must be used within RadioProvider');
  }
  return context;
}