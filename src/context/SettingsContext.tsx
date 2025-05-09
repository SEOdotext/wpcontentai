import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWebsites } from '@/context/WebsitesContext';
import { debounce } from 'lodash';

// Define Json type since @/schema is not found
type Json = string[] | number[] | boolean[] | {[key: string]: any} | string | number | boolean | null;

// Add type definition for the publication settings table
interface PublicationSettings {
  id: string;
  organisation_id: string;
  posting_frequency: number;
  writing_style: string;
  subject_matters: Json;
  format_template?: string;
  website_id: string;
  created_at: string;
  updated_at: string;
  image_prompt?: string;
  image_model?: string;
  negative_prompt?: string;
  weekly_planning_day?: string;
}

interface SettingsContextType {
  settingsId: string | null;
  postingFrequency: number; // Days between posts
  setPostingFrequency: (days: number) => void;
  writingStyle: string;
  setWritingStyle: (style: string) => void;
  restoreDefaultWritingStyle: () => void;
  subjectMatters: string[];
  setSubjectMatters: (subjects: string[]) => void;
  addSubject: (subject: string) => void;
  removeSubject: (subject: string) => void;
  formattemplate: string;
  setformattemplate: (template: string) => void;
  imagePrompt: string;
  setImagePrompt: (prompt: string) => void;
  imageModel: string;
  setImageModel: (model: string) => void;
  negativePrompt: string;
  setNegativePrompt: (prompt: string) => void;
  weeklyPlanningDay: string;
  setWeeklyPlanningDay: (day: string) => void;
  isLoading: boolean;
  updateSettingsInDatabase: (
    frequency: number,
    style: string,
    subjects: string[],
    template?: string,
    prompt?: string,
    model?: string,
    negPrompt?: string,
    weeklyPlanningDay?: string
  ) => Promise<void>;
}

export const defaultSettings = {
  postingFrequency: 3, // Default to 3 posts per week
  writingStyle: 'SEO friendly content that captures the reader. Use simple, clear language with a genuine tone. Write directly to your reader using natural language, as if having a conversation. Keep sentences concise and avoid filler words. Add personal touches like anecdotes or light humor when appropriate. Explain complex ideas in a friendly, approachable way. Stay direct and let your authentic voice come through. Structure your content to grab attention with a strong hook, provide context that connects with your reader, deliver clear value, back it up with proof, and end with a clear action step. This natural flow helps both readers and AI understand your message better.',
  subjectMatters: [], // Empty array for default subjects
  formattemplate: `<!-- WordPress Post HTML Structure Example -->
<article class="post">

  <div class="entry-content">
    <p>First paragraph of the post with an <a href="#">example link</a> goes here.</p>
    
    <h2>First Subheading</h2>
    <p>Content under the first subheading with <strong>bold text</strong> and <em>italic text</em>.</p>
    
    <h3>Secondary Subheading</h3>
    <p>More detailed content explaining the topic.</p>
    
    <ul>
      <li>First bullet point</li>
      <li>Second bullet point</li>
      <li>Third bullet point with <a href="#">link</a></li>
    </ul>
    
    <h2>Second Main Subheading</h2>
    <p>Opening paragraph for this section introducing the next points.</p>
    
    <ol>
      <li>First numbered item</li>
      <li>Second numbered item</li>
      <li>Third numbered item</li>
    </ol>
    
    <blockquote>
      <p>This is an example of a blockquote that might contain a testimonial or important quote related to the content.</p>
    </blockquote>
    
    <h2>Subheading 3</h2>
    <p>Summary paragraph that wraps up the post and may include a call to action.</p>
  </div>

</article>`,
  imagePrompt: 'Create a modern, professional image that represents: {title}. Context: {content}',
  imageModel: 'dalle', // Default to DALL-E
  negativePrompt: '', // Default empty negative prompt for stable diffusion
  weeklyPlanningDay: 'friday' // Default weekly planning day
};

const SettingsContext = createContext<SettingsContextType>({
  settingsId: null,
  ...defaultSettings,
  setPostingFrequency: () => {},
  setWritingStyle: () => {},
  restoreDefaultWritingStyle: () => {},
  setSubjectMatters: () => {},
  addSubject: () => {},
  removeSubject: () => {},
  setformattemplate: () => {},
  setImagePrompt: () => {},
  setImageModel: () => {},
  setNegativePrompt: () => {},
  setWeeklyPlanningDay: () => {},
  isLoading: false,
  updateSettingsInDatabase: async () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [postingFrequency, setPostingFrequency] = useState<number>(3);
  const [writingStyle, setWritingStyle] = useState<string>('');
  const [subjectMatters, setSubjectMatters] = useState<string[]>([]);
  const [formattemplate, setformattemplate] = useState<string>('');
  const [imagePrompt, setImagePrompt] = useState<string>('');
  const [imageModel, setImageModel] = useState<string>('');
  const [negativePrompt, setNegativePrompt] = useState<string>('');
  const [weeklyPlanningDay, setWeeklyPlanningDay] = useState<string>('friday');
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [lastSavedValues, setLastSavedValues] = useState<Record<string, any>>({});
  const { currentWebsite } = useWebsites();

  // Add authentication state tracking
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Helper to check if values have actually changed
  const haveValuesChanged = useCallback((
    frequency: number,
    style: string,
    subjects: string[],
    template?: string,
    prompt?: string,
    model?: string,
    negPrompt?: string,
    weeklyPlanningDay?: string
  ) => {
    const newValues = {
      frequency,
      style,
      subjects: JSON.stringify(subjects),
      template,
      prompt,
      model,
      negPrompt,
      weeklyPlanningDay
    };

    const lastSaved = {
      frequency: lastSavedValues.posting_frequency,
      style: lastSavedValues.writing_style,
      subjects: JSON.stringify(lastSavedValues.subject_matters),
      template: lastSavedValues.format_template,
      prompt: lastSavedValues.image_prompt,
      model: lastSavedValues.image_model,
      negPrompt: lastSavedValues.negative_prompt,
      weeklyPlanningDay: lastSavedValues.weekly_planning_day
    };

    return JSON.stringify(newValues) !== JSON.stringify(lastSaved);
  }, [lastSavedValues]);

  // Debounced update function
  const debouncedUpdateSettings = useCallback(
    debounce(async (
      frequency: number,
      style: string,
      subjects: string[],
      template?: string,
      prompt?: string,
      model?: string,
      negPrompt?: string,
      weeklyPlanningDay?: string
    ) => {
      await updateSettingsInDatabase(
        frequency,
        style,
        subjects,
        template,
        prompt,
        model,
        negPrompt,
        weeklyPlanningDay
      );
    }, 500),
    []
  );

  // Update settings in Supabase when they change
  const updateSettingsInDatabase = useCallback(async (
    frequency: number, 
    style: string, 
    subjects: string[],
    template?: string,
    prompt?: string,
    model?: string,
    negPrompt?: string,
    weeklyPlanningDay?: string
  ) => {
    if (!currentWebsite || isInitializing) {
      console.log('SettingsContext: Skipping save during initialization');
      return;
    }

    // Check if values have actually changed
    if (!haveValuesChanged(frequency, style, subjects, template, prompt, model, negPrompt, weeklyPlanningDay)) {
      console.log('SettingsContext: Skipping save - no changes detected');
      return;
    }

    console.log('SettingsContext: Saving settings to database');
    try {
      // Check if user is authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('You must be logged in to save settings');
        return;
      }
      
      // Use current values if not provided
      const templateToUpdate = template || formattemplate;
      const promptToUpdate = prompt || imagePrompt;
      const modelToUpdate = model || imageModel;
      const negPromptToUpdate = negPrompt || negativePrompt;
      
      // Ensure subjects is a clean array of strings
      const cleanSubjects = subjects.filter(s => s && s.trim().length > 0);
      console.log("Saving settings with subjects:", cleanSubjects);

      const settingsData = {
        posting_frequency: frequency,
        writing_style: style,
        subject_matters: cleanSubjects,
        format_template: templateToUpdate,
        image_prompt: promptToUpdate,
        image_model: modelToUpdate,
        negative_prompt: negPromptToUpdate,
        weekly_planning_day: weeklyPlanningDay,
        updated_at: new Date().toISOString()
      };
      
      let updateSuccessful = false;

      if (!settingsId) {
        console.log("Creating new settings with subjects:", cleanSubjects);
        const { data: newSettings, error: insertError } = await supabase
          .from('publication_settings')
          .insert({
            ...settingsData,
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
          console.log("New settings created:", newSettings);
          setSettingsId(newSettings.id);
          setLastSavedValues(settingsData);
          updateSuccessful = true;
        }
      } else {
        // Update existing settings
        console.log("Updating settings with subjects:", cleanSubjects);
        const { error: updateError } = await supabase
          .from('publication_settings')
          .update(settingsData)
          .eq('id', settingsId);
          
        if (updateError) {
          console.error("Error updating settings:", updateError);
          throw updateError;
        }
        
        console.log("Settings updated successfully with subjects:", cleanSubjects);
        setLastSavedValues(settingsData);
        updateSuccessful = true;
      }

      // Only show success toast if the update was successful and we're not in a debounced call
      if (updateSuccessful && !isInitializing) {
        toast.success("Settings updated successfully", {
          id: 'settings-update' // Use a consistent ID to prevent duplicate toasts
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings. Please try again.', {
        id: 'settings-error' // Use a consistent ID for error toasts
      });
    }
  }, [currentWebsite, settingsId, formattemplate, imagePrompt, imageModel, negativePrompt, isInitializing, haveValuesChanged]);

  // Optimize settings fetch
  useEffect(() => {
    let isMounted = true;
    
    const fetchSettings = async () => {
      // Check authentication first
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        console.log('SettingsContext: No authenticated session, skipping fetch');
        if (isMounted) {
          setIsLoading(false);
          setIsInitializing(false);
        }
        return;
      }
      
      setIsAuthenticated(true);

      if (!currentWebsite) {
        console.log("SettingsContext: No website selected, using default settings");
        if (isMounted) {
          setPostingFrequency(defaultSettings.postingFrequency);
          setWritingStyle(defaultSettings.writingStyle);
          setSubjectMatters(defaultSettings.subjectMatters);
          setformattemplate(defaultSettings.formattemplate);
          setImagePrompt(defaultSettings.imagePrompt);
          setImageModel(defaultSettings.imageModel);
          setNegativePrompt(defaultSettings.negativePrompt);
          setWeeklyPlanningDay(defaultSettings.weeklyPlanningDay);
          setIsLoading(false);
          setIsInitializing(false);
        }
        return;
      }
      
      try {
        if (isMounted) setIsLoading(true);
        console.log("SettingsContext: Fetching settings for website:", currentWebsite.id);
        
        // Filter settings by the current website's ID
        const { data, error } = await supabase
          .from('publication_settings')
          .select('*')
          .eq('website_id', currentWebsite.id)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (error) {
          console.error("SettingsContext: Error fetching settings:", error);
          if (isMounted) toast.error("Failed to load settings");
          throw error;
        }
        
        if (data && data.length > 0 && isMounted) {
          console.log("SettingsContext: Found existing settings:", data[0]);
          const settings = data[0] as PublicationSettings;
          
          // Update state in a batch to prevent multiple re-renders
          if (isMounted) {
            setSettingsId(settings.id);
            setPostingFrequency(settings.posting_frequency);
            setWritingStyle(settings.writing_style || defaultSettings.writingStyle);
            setformattemplate(settings.format_template || defaultSettings.formattemplate);
            setImageModel(settings.image_model || defaultSettings.imageModel);
            setImagePrompt(settings.image_prompt || defaultSettings.imagePrompt);
            setNegativePrompt(settings.negative_prompt || defaultSettings.negativePrompt);
            setWeeklyPlanningDay(settings.weekly_planning_day || defaultSettings.weeklyPlanningDay);
            
            // Parse and set subject matters
            try {
              const subjectsArray = Array.isArray(settings.subject_matters) 
                ? settings.subject_matters 
                : typeof settings.subject_matters === 'string' 
                  ? JSON.parse(settings.subject_matters)
                  : defaultSettings.subjectMatters;
              setSubjectMatters(subjectsArray);
            } catch (error) {
              console.error("SettingsContext: Error parsing subject_matters:", error);
              setSubjectMatters(defaultSettings.subjectMatters);
            }

            setLastSavedValues(settings);
          }
        } else if (isMounted) {
          console.log("SettingsContext: Creating default settings");
          // Create default settings
          const defaultSettingsData = {
            posting_frequency: defaultSettings.postingFrequency,
            writing_style: defaultSettings.writingStyle,
            subject_matters: defaultSettings.subjectMatters,
            format_template: defaultSettings.formattemplate,
            image_prompt: defaultSettings.imagePrompt,
            image_model: defaultSettings.imageModel,
            negative_prompt: defaultSettings.negativePrompt,
            weekly_planning_day: defaultSettings.weeklyPlanningDay,
            website_id: currentWebsite.id,
            organisation_id: currentWebsite.organisation_id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { data: newSettings, error: insertError } = await supabase
            .from('publication_settings')
            .insert(defaultSettingsData)
            .select()
            .single();
            
          if (insertError) {
            console.error("SettingsContext: Error creating default settings:", insertError);
            if (isMounted) toast.error("Failed to create default settings");
            throw insertError;
          }
          
          if (newSettings && isMounted) {
            console.log("SettingsContext: Created new settings:", newSettings);
            setSettingsId(newSettings.id);
            setPostingFrequency(defaultSettings.postingFrequency);
            setWritingStyle(defaultSettings.writingStyle);
            setSubjectMatters(defaultSettings.subjectMatters);
            setformattemplate(defaultSettings.formattemplate);
            setImagePrompt(defaultSettings.imagePrompt);
            setImageModel(defaultSettings.imageModel);
            setNegativePrompt(defaultSettings.negativePrompt);
            setWeeklyPlanningDay(defaultSettings.weeklyPlanningDay);
            setLastSavedValues(newSettings);
          }
        }
      } catch (error) {
        console.error("SettingsContext: Error in fetchSettings:", error);
        if (isMounted) {
          toast.error("Failed to load settings");
          setIsLoading(false);
          setIsInitializing(false);
        }
      }
      if (isMounted) {
        setIsLoading(false);
        setIsInitializing(false);
      }
    };

    fetchSettings();
    return () => {
      isMounted = false;
    };
  }, [currentWebsite]);

  // Handle publication frequency changes
  const handleSetPostingFrequency = (days: number) => {
    setPostingFrequency(days);
  };

  // Handle writing style changes
  const handleSetWritingStyle = (style: string) => {
    setWritingStyle(style);
  };

  // Handle subject matters changes
  const handleSetSubjectMatters = useCallback((subjects: string[]) => {
    console.log("Setting subject matters:", subjects);
    setSubjectMatters(subjects);
  }, []);

  // Handle adding a single subject
  const handleAddSubject = useCallback((subject: string) => {
    if (!subject.trim()) return;
    const newSubjects = [...subjectMatters, subject.trim()];
    handleSetSubjectMatters(newSubjects);
  }, [subjectMatters, handleSetSubjectMatters]);

  // Handle removing a single subject
  const handleRemoveSubject = useCallback((subjectToRemove: string) => {
    const newSubjects = subjectMatters.filter(s => s !== subjectToRemove);
    handleSetSubjectMatters(newSubjects);
  }, [subjectMatters, handleSetSubjectMatters]);

  // Add handler for WordPress template
  const handleSetformattemplate = (template: string) => {
    setformattemplate(template);
  };

  // Add handler for image prompt
  const handleSetImagePrompt = (prompt: string) => {
    setImagePrompt(prompt);
  };

  // Add handler for image model
  const handleSetImageModel = (model: string) => {
    setImageModel(model);
  };

  // Add handler for negative prompt
  const handleSetNegativePrompt = (prompt: string) => {
    setNegativePrompt(prompt);
  };

  // Add handler for weekly planning day
  const handleSetWeeklyPlanningDay = (day: string) => {
    setWeeklyPlanningDay(day);
  };

  // Add handler for restoring default writing style
  const handleRestoreDefaultWritingStyle = () => {
    setWritingStyle(defaultSettings.writingStyle);
  };

  return (
    <SettingsContext.Provider 
      value={{ 
        settingsId,
        postingFrequency, 
        setPostingFrequency: handleSetPostingFrequency, 
        writingStyle, 
        setWritingStyle: handleSetWritingStyle,
        restoreDefaultWritingStyle: handleRestoreDefaultWritingStyle,
        subjectMatters, 
        setSubjectMatters: handleSetSubjectMatters,
        addSubject: handleAddSubject,
        removeSubject: handleRemoveSubject,
        formattemplate,
        setformattemplate: handleSetformattemplate,
        imagePrompt,
        setImagePrompt: handleSetImagePrompt,
        imageModel,
        setImageModel: handleSetImageModel,
        negativePrompt,
        setNegativePrompt: handleSetNegativePrompt,
        weeklyPlanningDay,
        setWeeklyPlanningDay: handleSetWeeklyPlanningDay,
        isLoading,
        updateSettingsInDatabase
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
