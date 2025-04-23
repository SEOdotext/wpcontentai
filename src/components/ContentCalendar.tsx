import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useWebsiteContext } from '@/context/website-context';
import { useSupabase } from '@/context/auth-context';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabaseClient';

interface Post {
  id: string;
  title: string;
  status: string;
  scheduled_date: string;
  website_id: string;
}

interface Website {
  id: string;
  name: string;
}

export function ContentCalendar() {
  const { toast } = useToast();
  const { supabase } = useSupabase();
  const { selectedWebsite } = useWebsiteContext();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchPosts = useCallback(async () => {
    if (!selectedWebsite.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('website_id', selectedWebsite.id)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch posts. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedWebsite.id, toast]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'published':
        return 'bg-green-500';
      case 'scheduled':
        return 'bg-blue-500';
      case 'draft':
        return 'bg-gray-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <Card className="flex-1">
          <CardContent className="pt-6">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>
        
        <Card className="flex-1">
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-4">Scheduled Posts</h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : posts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No posts scheduled
              </p>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="flex flex-col space-y-2 p-4 border rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{post.title}</h4>
                        <Badge className={getStatusColor(post.status)}>
                          {post.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Scheduled for: {format(new Date(post.scheduled_date), 'PPP')}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const handleGenerateAndPublish = async (postThemeId: string) => {
  try {
    if (!currentWebsite) {
      toast.error("Please select a website first");
      return;
    }
    setGeneratingAndPublishingIds(prev => new Set(prev).add(postThemeId));
    const response = await generateAndPublishContent(postThemeId, currentWebsite.id);
    if (response.success) {
      toast.success('Content generated and published successfully');
      await fetchPostThemes();
    } else {
      throw new Error('Failed to generate and publish content');
    }
  } catch (error) {
    console.error('Error generating and publishing content:', error);
    toast.error('Failed to generate and publish content');
  } finally {
    setGeneratingAndPublishingIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(postThemeId);
      return newSet;
    });
  }
};

// ... existing code ...
} 