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

const defaultSettings = {
  publicationFrequency: 7, // Default to weekly
  writingStyle: 'SEO friendly content that captures the reader. Use simple, clear language with a genuine tone. Write directly to your reader using natural language, as if having a conversation. Keep sentences concise and avoid filler words. Add personal touches like anecdotes or light humor when appropriate. Explain complex ideas in a friendly, approachable way. Stay direct and let your authentic voice come through.', // Default writing style
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
      if (!currentWebsite) {
        console.log("No website selected, using default settings");
        setPublicationFrequency(defaultSettings.publicationFrequency);
        setWritingStyle(defaultSettings.writingStyle);
        setSubjectMatters(defaultSettings.subjectMatters);
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Check if user is authenticated
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData.session;
        
        if (!session) {
          console.log("User not authenticated, using default settings");
          return;
        }
        
        console.log("Fetching settings for website:", currentWebsite.id);
        
        // Filter settings by the current website's ID
        const { data, error } = await supabase
          .from('publication_settings')
          .select('*')
          .eq('website_id', currentWebsite.id)
          .limit(1);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          console.log("Found existing settings:", data[0]);
          const settings = data[0];
          setSettingsId(settings.id);
          setPublicationFrequency(settings.publication_frequency);
          setWritingStyle(settings.writing_style);
          
          // Convert subject_matters to string[] ensuring type safety
          if (settings.subject_matters) {
            const subjects = settings.subject_matters as unknown;
            if (Array.isArray(subjects)) {
              const stringSubjects = subjects.map(item => 
                typeof item === 'string' ? item : String(item)
              );
              setSubjectMatters(stringSubjects);
            } else {
              setSubjectMatters(defaultSettings.subjectMatters);
            }
          } else {
            setSubjectMatters(defaultSettings.subjectMatters);
          }
        } else {
          console.log("Creating default settings for website:", currentWebsite.id);
          // If no settings exist for this website, create default settings
          const { data: newSettings, error: insertError } = await supabase
            .from('publication_settings')
            .insert({
              publication_frequency: defaultSettings.publicationFrequency,
              writing_style: defaultSettings.writingStyle,
              subject_matters: defaultSettings.subjectMatters,
              website_id: currentWebsite.id,
              organisation_id: currentWebsite.organisation_id
            })
            .select()
            .single();
            
          if (insertError) {
            console.error("Error creating default settings:", insertError);
            throw insertError;
          }
          
          if (newSettings) {
            console.log("Created new settings:", newSettings);
            setSettingsId(newSettings.id);
            setPublicationFrequency(defaultSettings.publicationFrequency);
            setWritingStyle(defaultSettings.writingStyle);
            setSubjectMatters(defaultSettings.subjectMatters);
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings from database, using defaults instead.');
        setPublicationFrequency(defaultSettings.publicationFrequency);
        setWritingStyle(defaultSettings.writingStyle);
        setSubjectMatters(defaultSettings.subjectMatters);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, [currentWebsite]);

  // Update settings in Supabase when they change
  const updateSettingsInDatabase = async (
    frequency: number, 
    style: string, 
    subjects: string[]
  ) => {
    if (!currentWebsite) {
      console.error("Cannot update settings: No website selected");
      toast.error("Please select a website to save settings");
      return;
    }

    try {
      // Check if user is authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('You must be logged in to save settings');
        return;
      }
      
      // If we don't have a settingsId, we need to create new settings
      if (!settingsId) {
        const { data: newSettings, error: insertError } = await supabase
          .from('publication_settings')
          .insert({
            publication_frequency: frequency,
            writing_style: style,
            subject_matters: subjects,
            website_id: currentWebsite.id,
            organisation_id: currentWebsite.organisation_id
          })
          .select()
          .single();
          
        if (insertError) {
          console.error("Error creating settings:", insertError);
          throw insertError;
        }
        
        if (newSettings) {
          setSettingsId(newSettings.id);
          toast.success("Settings created successfully");
        }
      } else {
        // Update existing settings
        const { error: updateError } = await supabase
          .from('publication_settings')
          .update({
            publication_frequency: frequency,
            writing_style: style,
            subject_matters: subjects,
            updated_at: new Date().toISOString()
          })
          .eq('id', settingsId);
          
        if (updateError) {
          console.error("Error updating settings:", updateError);
          throw updateError;
        }
        
        toast.success("Settings updated successfully");
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings. Please try again.');
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
