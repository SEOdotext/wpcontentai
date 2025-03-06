
import React, { createContext, useContext, useState, useEffect } from 'react';

interface SettingsContextType {
  publicationFrequency: number; // Days between posts
  setPublicationFrequency: (days: number) => void;
}

const defaultSettings: SettingsContextType = {
  publicationFrequency: 7, // Default to weekly
  setPublicationFrequency: () => {},
};

const SettingsContext = createContext<SettingsContextType>(defaultSettings);

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [publicationFrequency, setPublicationFrequency] = useState<number>(() => {
    const saved = localStorage.getItem('publicationFrequency');
    return saved ? parseInt(saved, 10) : defaultSettings.publicationFrequency;
  });

  useEffect(() => {
    localStorage.setItem('publicationFrequency', publicationFrequency.toString());
  }, [publicationFrequency]);

  return (
    <SettingsContext.Provider value={{ publicationFrequency, setPublicationFrequency }}>
      {children}
    </SettingsContext.Provider>
  );
};
