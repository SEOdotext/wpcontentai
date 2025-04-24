import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@supabase/supabase-js';
import { useWebsites } from '@/context/WebsitesContext';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const WeeklyPlanningButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { currentWebsite } = useWebsites();

  const handleWeeklyPlanning = async () => {
    try {
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
          required_posts: postingFrequency // Pass the required number of posts
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Weekly planning error:', errorText);
        throw new Error('Failed to trigger weekly planning');
      }

      const result = await response.json();
      console.log('Weekly planning result:', result);

      toast({
        title: 'Weekly planning started',
        description: `Content planning started for ${currentWebsite.name}. You will receive an email with the results.`,
      });
    } catch (error) {
      console.error('Error triggering weekly planning:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start weekly planning. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleWeeklyPlanning}
            disabled={isLoading || !currentWebsite?.id}
            className="flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" />
            {isLoading ? 'Planning...' : 'Plan Weekly Content'}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[300px] p-3">
          <p>Generate and schedule content ideas for the upcoming week. You'll receive an email with the planned content for your review.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default WeeklyPlanningButton; 