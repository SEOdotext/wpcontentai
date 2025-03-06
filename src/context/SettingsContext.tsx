
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWebsites } from '@/context/WebsitesContext';

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
  const { currentWebsite } = useWebsites();

  // Fetch settings from Supabase whenever the current website changes
  useEffect(() => {
    const fetchSettings = async () => {
      if (!currentWebsite) return;
      
      try {
        setIsLoading(true);
        
        // Filter settings by the current website's ID
        const { data, error } = await supabase
          .from('publication_settings')
          .select('*')
          .eq('website_id', currentWebsite.id)
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
          // If no settings exist for this website, create default settings
          const { data: newSettings, error: insertError } = await supabase
            .from('publication_settings')
            .insert({
              publication_frequency: defaultSettings.publicationFrequency,
              writing_style: defaultSettings.writingStyle,
              subject_matters: defaultSettings.subjectMatters,
              website_id: currentWebsite.id
            })
            .select()
            .single();
            
          if (insertError) throw insertError;
          
          if (newSettings) {
            setSettingsId(newSettings.id);
            // Reset to default values for the new website
            setPublicationFrequency(defaultSettings.publicationFrequency);
            setWritingStyle(defaultSettings.writingStyle);
            setSubjectMatters(defaultSettings.subjectMatters);
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

    if (currentWebsite) {
      fetchSettings();
    }
  }, [currentWebsite]);

  // Update settings in Supabase when they change
  const updateSettingsInDatabase = async (
    frequency: number, 
    style: string, 
    subjects: string[]
  ) => {
    if (!settingsId || !currentWebsite) return;
    
    try {
      const { error } = await supabase
        .from('publication_settings')
        .update({
          publication_frequency: frequency,
          writing_style: style,
          subject_matters: subjects,
          updated_at: new Date().toISOString(),
          website_id: currentWebsite.id
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
