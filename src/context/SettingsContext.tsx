import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useWebsites } from '@/context/WebsitesContext';

// Define Json type since @/schema is not found
type Json = string[] | number[] | boolean[] | {[key: string]: any} | string | number | boolean | null;

// Add type definition for the publication settings table
interface PublicationSettings {
  id: string;
  organisation_id: string;
  posting_frequency: number;
  writing_style: string;
  subject_matters: Json;
  wordpress_template?: string;
  website_id: string;
  created_at: string;
  updated_at: string;
  image_prompt?: string;
  image_model?: string;
  negative_prompt?: string;
}

interface SettingsContextType {
  postingFrequency: number; // Days between posts
  setPostingFrequency: (days: number) => void;
  writingStyle: string;
  setWritingStyle: (style: string) => void;
  restoreDefaultWritingStyle: () => void;
  subjectMatters: string[];
  setSubjectMatters: (subjects: string[]) => void;
  wordpressTemplate: string;
  setWordpressTemplate: (template: string) => void;
  imagePrompt: string;
  setImagePrompt: (prompt: string) => void;
  imageModel: string;
  setImageModel: (model: string) => void;
  negativePrompt: string;
  setNegativePrompt: (prompt: string) => void;
  isLoading: boolean;
  updateSettingsInDatabase: (
    frequency: number,
    style: string,
    subjects: string[],
    template?: string,
    prompt?: string,
    model?: string,
    negPrompt?: string
  ) => Promise<void>;
}

const defaultSettings = {
  postingFrequency: 7, // Default to weekly
  writingStyle: 'SEO friendly content that captures the reader. Use simple, clear language with a genuine tone. Write directly to your reader using natural language, as if having a conversation. Keep sentences concise and avoid filler words. Add personal touches like anecdotes or light humor when appropriate. Explain complex ideas in a friendly, approachable way. Stay direct and let your authentic voice come through. Structure your content to grab attention with a strong hook, provide context that connects with your reader, deliver clear value, back it up with proof, and end with a clear action step. This natural flow helps both readers and AI understand your message better.',
  subjectMatters: [], // Empty array for default subjects
  wordpressTemplate: `<!-- WordPress Post HTML Structure Example -->
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
};

const SettingsContext = createContext<SettingsContextType>({
  ...defaultSettings,
  setPostingFrequency: () => {},
  setWritingStyle: () => {},
  restoreDefaultWritingStyle: () => {},
  setSubjectMatters: () => {},
  setWordpressTemplate: () => {},
  setImagePrompt: () => {},
  setImageModel: () => {},
  setNegativePrompt: () => {},
  isLoading: false,
  updateSettingsInDatabase: async () => {},
});

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [postingFrequency, setPostingFrequency] = useState<number>(defaultSettings.postingFrequency);
  const [writingStyle, setWritingStyle] = useState<string>(defaultSettings.writingStyle);
  const [subjectMatters, setSubjectMatters] = useState<string[]>(defaultSettings.subjectMatters);
  const [wordpressTemplate, setWordpressTemplate] = useState<string>(defaultSettings.wordpressTemplate);
  const [imagePrompt, setImagePrompt] = useState<string>(defaultSettings.imagePrompt);
  const [imageModel, setImageModel] = useState<string>(defaultSettings.imageModel);
  const [negativePrompt, setNegativePrompt] = useState<string>(defaultSettings.negativePrompt);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const { currentWebsite } = useWebsites();

  // Fetch settings from Supabase whenever the current website changes
  useEffect(() => {
    const fetchSettings = async () => {
      if (!currentWebsite) {
        console.log("No website selected, using default settings");
        setPostingFrequency(defaultSettings.postingFrequency);
        setWritingStyle(defaultSettings.writingStyle);
        setSubjectMatters(defaultSettings.subjectMatters);
        setWordpressTemplate(defaultSettings.wordpressTemplate);
        setImagePrompt(defaultSettings.imagePrompt);
        setImageModel(defaultSettings.imageModel);
        setNegativePrompt(defaultSettings.negativePrompt);
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
          const settings = data[0] as PublicationSettings; // Cast to our interface type
          setSettingsId(settings.id);
          setPostingFrequency(settings.posting_frequency);
          setWritingStyle(settings.writing_style);
          
          // Set WordPress template if it exists
          if (settings.wordpress_template) {
            console.log("Found WordPress template:", settings.wordpress_template);
            setWordpressTemplate(settings.wordpress_template);
          } else {
            console.log("No WordPress template found, using default");
            setWordpressTemplate(defaultSettings.wordpressTemplate);
          }
          
          // Set image prompt if it exists
          if (settings.image_prompt) {
            console.log("Found image prompt:", settings.image_prompt);
            setImagePrompt(settings.image_prompt);
          } else if (currentWebsite.image_prompt) {
            // Fallback to website settings if publication settings don't have it
            console.log("Using image prompt from website settings:", currentWebsite.image_prompt);
            setImagePrompt(currentWebsite.image_prompt);
          } else {
            console.log("No image prompt found, using default");
            setImagePrompt(defaultSettings.imagePrompt);
          }
          
          // Set image model if it exists
          if (settings.image_model) {
            console.log("Found image model:", settings.image_model);
            setImageModel(settings.image_model);
          } else {
            console.log("No image model found, using default");
            setImageModel(defaultSettings.imageModel);
          }
          
          // Set negative prompt if it exists
          if (settings.negative_prompt) {
            console.log("Found negative prompt:", settings.negative_prompt);
            setNegativePrompt(settings.negative_prompt);
          } else {
            console.log("No negative prompt found, using default");
            setNegativePrompt(defaultSettings.negativePrompt);
          }
          
          // Convert subject_matters to string[] ensuring type safety
          if (settings.subject_matters) {
            console.log("Retrieved subject_matters:", settings.subject_matters, "Type:", typeof settings.subject_matters);
            
            try {
              // Handle different possible formats of subject_matters from the database
              let subjectsArray: string[] = [];
              
              if (Array.isArray(settings.subject_matters)) {
                // If it's already an array, map to strings
                subjectsArray = settings.subject_matters.map(item => 
                  typeof item === 'string' ? item : String(item)
                );
              } else if (typeof settings.subject_matters === 'string') {
                // If it's a JSON string, parse it
                try {
                  const parsed = JSON.parse(settings.subject_matters);
                  subjectsArray = Array.isArray(parsed) ? 
                    parsed.map(item => typeof item === 'string' ? item : String(item)) : 
                    [settings.subject_matters];
                } catch {
                  // If not valid JSON, treat as a single string
                  subjectsArray = [settings.subject_matters];
                }
              } else if (typeof settings.subject_matters === 'object') {
                // If it's an object but not an array, get values
                subjectsArray = Object.values(settings.subject_matters)
                  .map(item => typeof item === 'string' ? item : String(item));
              }
              
              console.log("Parsed subject matters:", subjectsArray);
              setSubjectMatters(subjectsArray);
            } catch (error) {
              console.error("Error parsing subject_matters:", error);
              setSubjectMatters(defaultSettings.subjectMatters);
            }
          } else {
            console.log("No subject_matters found, using defaults");
            setSubjectMatters(defaultSettings.subjectMatters);
          }
        } else {
          console.log("Creating default settings for website:", currentWebsite.id);
          // If no settings exist for this website, create default settings
          const { data: newSettings, error: insertError } = await supabase
            .from('publication_settings')
            .insert({
              posting_frequency: defaultSettings.postingFrequency,
              writing_style: defaultSettings.writingStyle,
              subject_matters: defaultSettings.subjectMatters,
              wordpress_template: defaultSettings.wordpressTemplate,
              image_prompt: currentWebsite.image_prompt || defaultSettings.imagePrompt, // Use website's image prompt if available
              image_model: defaultSettings.imageModel,
              negative_prompt: defaultSettings.negativePrompt,
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
            setPostingFrequency(defaultSettings.postingFrequency);
            setWritingStyle(defaultSettings.writingStyle);
            setSubjectMatters(defaultSettings.subjectMatters);
            setWordpressTemplate(defaultSettings.wordpressTemplate);
            setImagePrompt(defaultSettings.imagePrompt);
            setImageModel(defaultSettings.imageModel);
            setNegativePrompt(defaultSettings.negativePrompt);
          }
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings from database, using defaults instead.');
        setPostingFrequency(defaultSettings.postingFrequency);
        setWritingStyle(defaultSettings.writingStyle);
        setSubjectMatters(defaultSettings.subjectMatters);
        setWordpressTemplate(defaultSettings.wordpressTemplate);
        setImagePrompt(defaultSettings.imagePrompt);
        setImageModel(defaultSettings.imageModel);
        setNegativePrompt(defaultSettings.negativePrompt);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettings();
  }, [currentWebsite]);

  // Update settings in Supabase when they change
  const updateSettingsInDatabase = useCallback(async (
    frequency: number, 
    style: string, 
    subjects: string[],
    template?: string,
    prompt?: string,
    model?: string,
    negPrompt?: string
  ) => {
    if (!currentWebsite) return;
    
    // Skip update if subjects haven't changed
    const currentSubjects = JSON.stringify(subjectMatters);
    const newSubjects = JSON.stringify(subjects);
    if (currentSubjects === newSubjects) {
      console.log('SettingsContext: Skipping update - subjects unchanged');
      return;
    }

    console.log('SettingsContext: Saving subject matters to database:', subjects);
    try {
      // Check if user is authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error('You must be logged in to save settings');
        return;
      }
      
      // Use current values if not provided
      const templateToUpdate = template || wordpressTemplate;
      const promptToUpdate = prompt || imagePrompt;
      const modelToUpdate = model || imageModel;
      const negPromptToUpdate = negPrompt || negativePrompt;
      
      // Ensure subjects is a clean array of strings
      const cleanSubjects = subjects.filter(s => s && s.trim().length > 0);
      console.log("Saving subject matters to database:", cleanSubjects);
      
      // If we don't have a settingsId, we need to create new settings
      if (!settingsId) {
        console.log("Creating new settings with subjects:", cleanSubjects);
        const { data: newSettings, error: insertError } = await supabase
          .from('publication_settings')
          .insert({
            posting_frequency: frequency,
            writing_style: style,
            subject_matters: cleanSubjects, // Store directly as an array - Supabase will handle the JSON conversion
            wordpress_template: templateToUpdate,
            image_prompt: promptToUpdate,
            image_model: modelToUpdate,
            negative_prompt: negPromptToUpdate,
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
          toast.success("Settings created successfully");
        }
      } else {
        // Update existing settings
        console.log("Updating settings with subjects:", cleanSubjects);
        const { error: updateError } = await supabase
          .from('publication_settings')
          .update({
            posting_frequency: frequency,
            writing_style: style,
            subject_matters: cleanSubjects, // Store directly as an array - Supabase will handle the JSON conversion
            wordpress_template: templateToUpdate,
            image_prompt: promptToUpdate,
            image_model: modelToUpdate,
            negative_prompt: negPromptToUpdate,
            updated_at: new Date().toISOString()
          })
          .eq('id', settingsId);
          
        if (updateError) {
          console.error("Error updating settings:", updateError);
          throw updateError;
        }
        
        console.log("Settings updated successfully with subjects:", cleanSubjects);
        toast.success("Settings updated successfully");
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings. Please try again.');
    }
  }, [currentWebsite, settingsId, subjectMatters, wordpressTemplate, imagePrompt, imageModel, negativePrompt]);

  // Handle publication frequency changes
  const handleSetPostingFrequency = (days: number) => {
    setPostingFrequency(days);
    updateSettingsInDatabase(days, writingStyle, subjectMatters);
  };

  // Handle writing style changes
  const handleSetWritingStyle = (style: string) => {
    setWritingStyle(style);
    updateSettingsInDatabase(postingFrequency, style, subjectMatters);
  };

  // Handle subject matters changes
  const handleSetSubjectMatters = (subjects: string[]) => {
    console.log("Setting subject matters:", subjects);
    setSubjectMatters(subjects);
    // Add a small delay to ensure state is updated before saving to database
    setTimeout(() => {
      console.log("Updating database with subject matters:", subjects);
      updateSettingsInDatabase(postingFrequency, writingStyle, subjects);
    }, 100);
  };

  // Add handler for WordPress template
  const handleSetWordpressTemplate = (template: string) => {
    setWordpressTemplate(template);
    updateSettingsInDatabase(postingFrequency, writingStyle, subjectMatters, template);
  };

  // Add handler for image prompt
  const handleSetImagePrompt = (prompt: string) => {
    setImagePrompt(prompt);
    updateSettingsInDatabase(postingFrequency, writingStyle, subjectMatters, wordpressTemplate, prompt);
  };

  // Add handler for image model
  const handleSetImageModel = (model: string) => {
    setImageModel(model);
    updateSettingsInDatabase(postingFrequency, writingStyle, subjectMatters, wordpressTemplate, imagePrompt, model);
  };

  // Add handler for negative prompt
  const handleSetNegativePrompt = (prompt: string) => {
    setNegativePrompt(prompt);
    updateSettingsInDatabase(postingFrequency, writingStyle, subjectMatters, wordpressTemplate, imagePrompt, imageModel, prompt);
  };

  // Add handler for restoring default writing style
  const handleRestoreDefaultWritingStyle = () => {
    setWritingStyle(defaultSettings.writingStyle);
    updateSettingsInDatabase(postingFrequency, defaultSettings.writingStyle, subjectMatters);
  };

  return (
    <SettingsContext.Provider 
      value={{ 
        postingFrequency, 
        setPostingFrequency: handleSetPostingFrequency, 
        writingStyle, 
        setWritingStyle: handleSetWritingStyle,
        restoreDefaultWritingStyle: handleRestoreDefaultWritingStyle,
        subjectMatters, 
        setSubjectMatters: handleSetSubjectMatters,
        wordpressTemplate,
        setWordpressTemplate: handleSetWordpressTemplate,
        imagePrompt,
        setImagePrompt: handleSetImagePrompt,
        imageModel,
        setImageModel: handleSetImageModel,
        negativePrompt,
        setNegativePrompt: handleSetNegativePrompt,
        isLoading,
        updateSettingsInDatabase
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};
