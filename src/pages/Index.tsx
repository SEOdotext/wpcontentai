
import React from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import Header from '@/components/Header';
import AppSidebar from '@/components/Sidebar';
import ContentStructureView from '@/components/ContentStructureView';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import ContentCard, { Keyword } from '@/components/ContentCard';
import { FileText, Lightbulb, PlusCircle, BarChart3 } from 'lucide-react';

// Mock data for the dashboard
const recentContent = [
  {
    title: 'How to Optimize Your WordPress Site for Speed',
    description: 'Learn the best practices for improving your WordPress site loading times.',
    dateCreated: 'Oct 15, 2023',
    status: 'published',
    keywords: [
      { text: 'wordpress', difficulty: 'medium' },
      { text: 'speed', difficulty: 'easy' },
      { text: 'optimization', difficulty: 'medium' },
    ],
    isFavorite: true,
  },
  {
    title: 'The Ultimate Guide to On-Page SEO',
    description: 'Discover everything you need to know about optimizing your content for search engines.',
    dateCreated: 'Oct 10, 2023',
    status: 'draft',
    keywords: [
      { text: 'seo', difficulty: 'hard' },
      { text: 'on-page', difficulty: 'medium' },
      { text: 'content', difficulty: 'easy' },
    ],
    isFavorite: false,
  },
  {
    title: 'WordPress Plugins Every Content Creator Needs',
    description: 'Essential plugins to enhance your WordPress content creation workflow.',
    dateCreated: 'Oct 8, 2023',
    status: 'scheduled',
    keywords: [
      { text: 'wordpress', difficulty: 'medium' },
      { text: 'plugins', difficulty: 'easy' },
      { text: 'content', difficulty: 'easy' },
    ],
    isFavorite: false,
  },
];

const Index = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 px-4 md:px-6 py-6 overflow-y-auto">
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Content Structure</h1>
                <p className="text-muted-foreground mt-1">Create and optimize your content structure for maximum SEO impact.</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                <Card className="animate-slide-in animation-delay-100">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      Title Suggestions
                    </CardTitle>
                    <CardDescription>Generate SEO-friendly titles</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">26</div>
                    <p className="text-xs text-muted-foreground mt-1">+12 in the last week</p>
                  </CardContent>
                </Card>
                
                <Card className="animate-slide-in animation-delay-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Content Pieces
                    </CardTitle>
                    <CardDescription>Total content created</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">48</div>
                    <p className="text-xs text-muted-foreground mt-1">15 published, 33 drafts</p>
                  </CardContent>
                </Card>
                
                <Card className="animate-slide-in animation-delay-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Keyword Performance
                    </CardTitle>
                    <CardDescription>Overall keyword usage</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">76%</div>
                    <p className="text-xs text-muted-foreground mt-1">+8% from last month</p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Recent Content</h2>
                  
                  <div className="grid gap-4">
                    {recentContent.map((content, index) => (
                      <ContentCard
                        key={index}
                        title={content.title}
                        description={content.description}
                        keywords={content.keywords as Keyword[]}
                        dateCreated={content.dateCreated}
                        status={content.status as 'draft' | 'published' | 'scheduled'}
                        isFavorite={content.isFavorite}
                        className={`animation-delay-${(index + 1) * 100}`}
                      />
                    ))}
                    
                    <div className="flex justify-center p-4">
                      <a href="#" className="text-primary flex items-center gap-1 text-sm font-medium hover:underline">
                        <PlusCircle className="h-4 w-4" />
                        Create New Content
                      </a>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold">Title Generator</h2>
                  <Card>
                    <CardContent className="p-6">
                      <ContentStructureView />
                    </CardContent>
                  </Card>
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
