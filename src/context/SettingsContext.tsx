
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SettingsContextType {
  publicationFrequency: number; // Days between posts
  setPublicationFrequency: (days: number) => void;
  writingStyle: string;
  setWritingStyle: (style: string) => void;
  subjectMatters: string[];
  setSubjectMatters: (subjects: string[]) => void;
  isLoading: boolean;
}

const defaultSettings: Omit<SettingsContextType, 'setPublicationFrequency' | 'setWritingStyle' | 'setSubjectMatters' | 'isLoading'> = {
  publicationFrequency: 7, // Default to weekly
  writingStyle: 'Informative', // Default writing style
  subjectMatters: ['Technology', 'Business'], // Default subjects
};

const SettingsContext = createContext<SettingsContextType>({
  ...defaultSettings,
  setPublicationFrequency: () => {},
  setWritingStyle: () => {},
  setSubjectMatters: () => {},
  isLoading: false,
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [publicationFrequency, setPublicationFrequency] = useState<number>(defaultSettings.publicationFrequency);
  const [writingStyle, setWritingStyle] = useState<string>(defaultSettings.writingStyle);
  const [subjectMatters, setSubjectMatters] = useState<string[]>(defaultSettings.subjectMatters);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  // Fetch settings from Supabase on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        
        // For now, we'll fetch the first settings record since we don't have authentication yet
        // Later this will be filtered by company_id based on the authenticated user
        const { data, error } = await supabase
          .from('publication_settings')
          .select('*')
          .limit(1);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          const settings = data[0];
          setSettingsId(settings.id);
          setPublicationFrequency(settings.publication_frequency);
          setWritingStyle(settings.writing_style);
          
          // Convert subject_matters to string[] ensuring type safety
          if (settings.subject_matters) {
            const subjects = settings.subject_matters as unknown;
            // Ensure we're dealing with an array and all elements are strings
            if (Array.isArray(subjects)) {
              const stringSubjects = subjects.map(item => 
                // Convert any non-string values to strings
                typeof item === 'string' ? item : String(item)
              );
              setSubjectMatters(stringSubjects);
            } else {
              // Fallback to default if subject_matters isn't an array
              setSubjectMatters(defaultSettings.subjectMatters);
            }
          } else {
            setSubjectMatters(defaultSettings.subjectMatters);
          }
        } else {
          // If no settings exist, create a default record
          const { data: newSettings, error: insertError } = await supabase
            .from('publication_settings')
            .insert({
              publication_frequency: defaultSettings.publicationFrequency,
              writing_style: defaultSettings.writingStyle,
              subject_matters: defaultSettings.subjectMatters
            })
            .select()
            .single();
            
          if (insertError) throw insertError;
          
          if (newSettings) {
            setSettingsId(newSettings.id);
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        // Fall back to localStorage if database fetch fails
        const savedFrequency = localStorage.getItem('publicationFrequency');
        const savedStyle = localStorage.getItem('writingStyle');
        const savedSubjects = localStorage.getItem('subjectMatters');
        
        if (savedFrequency) setPublicationFrequency(parseInt(savedFrequency, 10));
        if (savedStyle) setWritingStyle(savedStyle);
        if (savedSubjects) setSubjectMatters(JSON.parse(savedSubjects));
        
        toast.error('Failed to load settings from database, using local storage instead.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Update settings in Supabase when they change
  const updateSettingsInDatabase = async (
    frequency: number, 
    style: string, 
    subjects: string[]
  ) => {
    if (!settingsId) return;
    
    try {
      const { error } = await supabase
        .from('publication_settings')
        .update({
          publication_frequency: frequency,
          writing_style: style,
          subject_matters: subjects,
          updated_at: new Date().toISOString()
        })
        .eq('id', settingsId);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error updating settings in database:', error);
      toast.error('Failed to save settings to database. Changes will only be stored locally.');
      
      // Save to localStorage as fallback
      localStorage.setItem('publicationFrequency', frequency.toString());
      localStorage.setItem('writingStyle', style);
      localStorage.setItem('subjectMatters', JSON.stringify(subjects));
    }
  };

  // Handle publication frequency changes
  const handleSetPublicationFrequency = (days: number) => {
    setPublicationFrequency(days);
    updateSettingsInDatabase(days, writingStyle, subjectMatters);
  };

  // Handle writing style changes
  const handleSetWritingStyle = (style: string) => {
    setWritingStyle(style);
    updateSettingsInDatabase(publicationFrequency, style, subjectMatters);
  };

  // Handle subject matters changes
  const handleSetSubjectMatters = (subjects: string[]) => {
    setSubjectMatters(subjects);
    updateSettingsInDatabase(publicationFrequency, writingStyle, subjects);
  };

  return (
    <SettingsContext.Provider 
      value={{ 
        publicationFrequency, 
        setPublicationFrequency: handleSetPublicationFrequency, 
        writingStyle, 
        setWritingStyle: handleSetWritingStyle, 
        subjectMatters, 
        setSubjectMatters: handleSetSubjectMatters,
        isLoading
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
