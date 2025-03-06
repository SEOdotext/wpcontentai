import { useState } from 'react';
import { useWebsites } from '@/context/WebsitesContext';
import Header from '@/components/Header';
import AppSidebar from '@/components/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { FileText, ExternalLink, GanttChart, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/EmptyState';

interface PageItem {
  id: string;
  title: string;
  url: string;
  children?: PageItem[];
}

const mockSitemapData: PageItem[] = [
  {
    id: '1',
    title: 'Home',
    url: '/',
    children: []
  },
  {
    id: '2',
    title: 'About Us',
    url: '/about',
    children: [
      {
        id: '2-1',
        title: 'Our Team',
        url: '/about/team',
        children: []
      },
      {
        id: '2-2',
        title: 'Our History',
        url: '/about/history',
        children: []
      }
    ]
  },
  {
    id: '3',
    title: 'Services',
    url: '/services',
    children: [
      {
        id: '3-1',
        title: 'Consulting',
        url: '/services/consulting',
        children: []
      },
      {
        id: '3-2',
        title: 'Development',
        url: '/services/development',
        children: []
      }
    ]
  },
  {
    id: '4',
    title: 'Blog',
    url: '/blog',
    children: [
      {
        id: '4-1',
        title: 'Latest News',
        url: '/blog/news',
        children: []
      },
      {
        id: '4-2',
        title: 'Tutorials',
        url: '/blog/tutorials',
        children: []
      }
    ]
  },
  {
    id: '5',
    title: 'Contact',
    url: '/contact',
    children: []
  }
];

const PageItem = ({ page, level = 0 }: { page: PageItem; level?: number }) => {
  const [expanded, setExpanded] = useState(level < 1);
  const hasChildren = page.children && page.children.length > 0;
  
  return (
    <div className="mb-1">
      <div 
        className={`flex items-center p-2 ${level > 0 ? 'ml-' + (level * 4) : ''} hover:bg-muted rounded-md group`}
      >
        {hasChildren ? (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-5 w-5 mr-2" 
            onClick={() => setExpanded(!expanded)}
          >
            <GanttChart className="h-4 w-4" />
          </Button>
        ) : (
          <FileText className="h-4 w-4 mr-2 ml-1" />
        )}
        
        <span className="flex-grow font-medium">{page.title}</span>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          asChild
        >
          <a href={page.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
      
      {expanded && hasChildren && (
        <div className="mt-1">
          {page.children!.map(child => (
            <PageItem key={child.id} page={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const WebsiteSitemap = () => {
  const { currentWebsite } = useWebsites();

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1">
        <Header />
        
        <main className="container mx-auto py-6 px-4 md:px-6 lg:px-8">
          {!currentWebsite ? (
            <EmptyState 
              title="No Website Selected"
              description="Please select a website from the dropdown in the sidebar to view its content structure."
              icon={<Map className="h-6 w-6" />}
              onAction={() => {}}
              actionLabel="Select Website"
            />
          ) : (
            <Tabs defaultValue="sitemap">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold tracking-tight">
                  {currentWebsite.name} Content
                </h1>
                <TabsList>
                  <TabsTrigger value="sitemap">Sitemap View</TabsTrigger>
                  <TabsTrigger value="list">List View</TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="sitemap" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Website Structure</CardTitle>
                    <CardDescription>
                      Overview of your website pages and structure
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px] pr-4">
                      {mockSitemapData.map(page => (
                        <PageItem key={page.id} page={page} />
                      ))}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="list" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>All Pages</CardTitle>
                    <CardDescription>
                      Complete list of pages on your website
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-1">
                        {mockSitemapData.flatMap(page => [
                          page,
                          ...(page.children || [])
                        ]).map((page, i) => (
                          <div key={page.id}>
                            {i > 0 && <Separator className="my-2" />}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <FileText className="h-4 w-4 mr-2" />
                                <span>{page.title}</span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                asChild
                              >
                                <a href={page.url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>
    </div>
  );
};

export default WebsiteSitemap;
