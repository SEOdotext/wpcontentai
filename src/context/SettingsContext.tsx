
import React, { createContext, useContext, useState, useEffect } from 'react';

interface SettingsContextType {
  publicationFrequency: number; // Days between posts
  setPublicationFrequency: (days: number) => void;
  writingStyle: string;
  setWritingStyle: (style: string) => void;
  subjectMatters: string[];
  setSubjectMatters: (subjects: string[]) => void;
}

const defaultSettings: Omit<SettingsContextType, 'setPublicationFrequency' | 'setWritingStyle' | 'setSubjectMatters'> = {
  publicationFrequency: 7, // Default to weekly
  writingStyle: 'Informative', // Default writing style
  subjectMatters: ['Technology', 'Business'], // Default subjects
};

const SettingsContext = createContext<SettingsContextType>({
  ...defaultSettings,
  setPublicationFrequency: () => {},
  setWritingStyle: () => {},
  setSubjectMatters: () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [publicationFrequency, setPublicationFrequency] = useState<number>(() => {
    const saved = localStorage.getItem('publicationFrequency');
    return saved ? parseInt(saved, 10) : defaultSettings.publicationFrequency;
  });

  const [writingStyle, setWritingStyle] = useState<string>(() => {
    const saved = localStorage.getItem('writingStyle');
    return saved || defaultSettings.writingStyle;
  });

  const [subjectMatters, setSubjectMatters] = useState<string[]>(() => {
    const saved = localStorage.getItem('subjectMatters');
    return saved ? JSON.parse(saved) : defaultSettings.subjectMatters;
  });

  useEffect(() => {
    localStorage.setItem('publicationFrequency', publicationFrequency.toString());
  }, [publicationFrequency]);

  useEffect(() => {
    localStorage.setItem('writingStyle', writingStyle);
  }, [writingStyle]);

  useEffect(() => {
    localStorage.setItem('subjectMatters', JSON.stringify(subjectMatters));
  }, [subjectMatters]);

  return (
    <SettingsContext.Provider 
      value={{ 
        publicationFrequency, 
        setPublicationFrequency, 
        writingStyle, 
        setWritingStyle, 
        subjectMatters, 
        setSubjectMatters 
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
