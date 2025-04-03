import React, { useEffect, useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import Header from '@/components/Header';
import AppSidebar from '@/components/Sidebar';
import ContentStructureView from '@/components/ContentStructureView';
import { Card, CardContent } from '@/components/ui/card';
import ContentCard, { Keyword } from '@/components/ContentCard';
import { usePostThemes } from '@/context/PostThemesContext';
import { useWordPress } from '@/context/WordPressContext';
import { X, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { postThemes, isLoading: isLoadingPostThemes } = usePostThemes();
  const { settings: wpSettings, isLoading: isLoadingWP } = useWordPress();
  const navigate = useNavigate();
  const [recentContent, setRecentContent] = useState<any[]>([]);

  useEffect(() => {
    // Show upcoming content from the calendar
    if (postThemes && postThemes.length > 0) {
      // Filter for upcoming scheduled content
      const now = new Date();
      const upcomingContent = [...postThemes]
        .filter(theme => {
          try {
            const scheduleDate = new Date(theme.scheduled_date);
            return scheduleDate >= now;
          } catch (e) {
            return false;
          }
        })
        .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
        .slice(0, 2)
        .map(theme => ({
          title: theme.subject_matter,
          description: theme.post_content || '',
          dateCreated: new Date(theme.scheduled_date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          }),
          contentStatus: theme.status === 'published' ? 'published' : 'scheduled',
          keywords: theme.keywords.map(k => ({ text: k })),
        }));
      
      // If no upcoming content, use the most recent
      if (upcomingContent.length === 0) {
        const recentContent = [...postThemes]
          .sort((a, b) => new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime())
          .slice(0, 2)
          .map(theme => ({
            title: theme.subject_matter,
            description: theme.post_content || '',
            dateCreated: new Date(theme.scheduled_date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            }),
            contentStatus: theme.status,
            keywords: theme.keywords.map(k => ({ text: k })),
          }));
        
        setRecentContent(recentContent);
      } else {
        setRecentContent(upcomingContent);
      }
    } else if (wpSettings && wpSettings.is_connected) {
      // If no post themes but WordPress is connected, show WordPress integration message
      setRecentContent([
        {
          title: "WordPress Integration Active",
          description: "Your WordPress site is connected and ready to receive content.",
          dateCreated: new Date().toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          }),
          contentStatus: 'published',
          keywords: [{ text: 'wordpress' }],
        }
      ]);
    } else {
      // Default state - no content calendar or WordPress integration
      setRecentContent([
        {
          title: "Get Started with Content Calendar",
          description: "Create your first content piece by visiting the Content Calendar page.",
          dateCreated: new Date().toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          }),
          contentStatus: 'draft',
          keywords: [{ text: 'calendar' }],
        }
      ]);
    }
  }, [postThemes, wpSettings]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 px-4 py-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-lg font-medium mb-4">Title Generator</h2>
                  <Card>
                    <CardContent className="p-4">
                      <ContentStructureView />
                    </CardContent>
                  </Card>
                </div>
                
                <div>
                  <h2 className="text-lg font-medium mb-4">Upcoming Content</h2>
                  <div className="grid gap-4">
                    {isLoadingPostThemes || isLoadingWP ? (
                      <div className="p-4 border rounded-md animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ) : recentContent.length > 0 ? (
                      <>
                        {recentContent.map((content, index) => (
                          <ContentCard
                            key={index}
                            title={content.title}
                            description={content.description}
                            keywords={content.keywords as Keyword[]}
                            dateCreated={content.dateCreated}
                            contentStatus={content.contentStatus as 'draft' | 'published' | 'scheduled'}
                          />
                        ))}
                        <Button 
                          className="mt-2 w-full" 
                          variant="outline"
                          onClick={() => navigate('/calendar')}
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          View Content Calendar
                        </Button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="border rounded-md p-4 flex items-center justify-center text-muted-foreground w-full mb-4">
                          <X className="w-4 h-4 mr-2" />
                          <span>No upcoming content found</span>
                        </div>
                        <Button 
                          onClick={() => navigate('/calendar')} 
                          variant="outline"
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Go to Content Calendar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
