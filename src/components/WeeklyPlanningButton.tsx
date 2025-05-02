import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';
import { useWebsites } from '@/context/WebsitesContext';
import { usePostThemes } from '@/context/PostThemesContext';

const WeeklyPlanningButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isScheduleFilled, setIsScheduleFilled] = useState(false);
  const { currentWebsite } = useWebsites();
  const { checkWeeklySchedule } = usePostThemes();

  // Check schedule status on mount and when website changes
  useEffect(() => {
    const checkSchedule = async () => {
      if (currentWebsite?.id) {
        const { isFilled } = await checkWeeklySchedule();
        setIsScheduleFilled(isFilled);
      }
    };
    
    checkSchedule();
  }, [currentWebsite?.id, checkWeeklySchedule]);

  const handleWeeklyPlanning = async () => {
    try {
      // Check schedule first
      const { isFilled, missingSlots } = await checkWeeklySchedule();
      
      if (isFilled) {
        toast("Schedule Complete - No more posts required for the next week");
        return;
      }

      setIsLoading(true);
      
      // Check if we have a current website
      if (!currentWebsite?.id) {
        throw new Error('No website selected');
      }

      // Create Supabase client
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );

      // Get the current user's session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Get the publication settings to check posting frequency
      const { data: settings } = await supabase
        .from('publication_settings')
        .select('posting_frequency')
        .eq('website_id', currentWebsite.id)
        .single();

      const postingFrequency = settings?.posting_frequency || 3; // Default to 3 if not set

      // Call the weekly planning function with required posts count
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/weekly-planning-actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          day: new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase(),
          website_id: currentWebsite.id,
          required_posts: postingFrequency
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Weekly planning error:', errorText);
        throw new Error('Failed to trigger weekly planning');
      }

      const result = await response.json();
      console.log('Weekly planning result:', result);

      toast.success('Weekly planning started', {
        description: `Content planning started for ${currentWebsite.name}. You will receive an email with the results.`
      });

      // Recheck schedule after planning
      const newScheduleStatus = await checkWeeklySchedule();
      setIsScheduleFilled(newScheduleStatus.isFilled);

    } catch (error) {
      console.error('Error triggering weekly planning:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start weekly planning. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      className={`w-full justify-start transition-colors ${
        isScheduleFilled 
          ? 'border-green-500/20 hover:bg-green-500/5 hover:border-green-500/30 text-green-700'
          : 'border-primary/20 hover:bg-primary/5 hover:border-primary/30'
      }`}
      onClick={handleWeeklyPlanning}
      disabled={isLoading || !currentWebsite?.id}
    >
      {isScheduleFilled ? (
        <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
      ) : (
        <Calendar className="mr-2 h-4 w-4 text-primary" />
      )}
      {isLoading 
        ? 'Planning Weekly Content...' 
        : isScheduleFilled 
          ? 'Weekly Content Complete' 
          : 'Plan Weekly Content'
      }
    </Button>
  );
};

export default WeeklyPlanningButton; 