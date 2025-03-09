import { useState } from 'react';
import { useWebsites } from '@/context/WebsitesContext';
import Header from '@/components/Header';
import AppSidebar from '@/components/Sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, ExternalLink, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/EmptyState';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface PageItem {
  id: string;
  title: string;
  url: string;
  keywords: string[];
  visitors: number;
  conversions: number;
}

// Mock data with new fields
const mockSitemapData: PageItem[] = [
  {
    id: '1',
    title: 'Home',
    url: '/',
    keywords: ['wordpress', 'cms'],
    visitors: 1200,
    conversions: 45
  },
  {
    id: '2',
    title: 'About Us',
    url: '/about',
    keywords: ['company', 'team'],
    visitors: 800,
    conversions: 20
  },
  {
    id: '3',
    title: 'Services',
    url: '/services',
    keywords: ['web development', 'consulting'],
    visitors: 1500,
    conversions: 75
  },
  {
    id: '4',
    title: 'Blog',
    url: '/blog',
    keywords: ['tutorials', 'tips'],
    visitors: 2500,
    conversions: 120
  },
  {
    id: '5',
    title: 'Contact',
    url: '/contact',
    keywords: ['support', 'help'],
    visitors: 600,
    conversions: 30
  }
];

const WebsiteSitemap = () => {
  const { currentWebsite } = useWebsites();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 px-4 py-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-8">
              {!currentWebsite ? (
                <EmptyState 
                  title="No Website Selected"
                  description="Please select a website from the dropdown in the sidebar to view its content structure."
                  icon={<Map className="h-6 w-6" />}
                  onAction={() => {}}
                  actionLabel="Select Website"
                />
              ) : (
                <div className="flex flex-col gap-4">
                  <Card className="border-0 shadow-elevation">
                    <CardContent>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Page Name</TableHead>
                              <TableHead>URL</TableHead>
                              <TableHead>Targeted Keywords</TableHead>
                              <TableHead className="text-right">Visitors</TableHead>
                              <TableHead className="text-right">Conversions</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {mockSitemapData.map((page) => (
                              <TableRow key={page.id}>
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    {page.title}
                                  </div>
                                </TableCell>
                                <TableCell>{page.url}</TableCell>
                                <TableCell>
                                  <div className="flex gap-1 flex-wrap">
                                    {page.keywords.map((keyword, i) => (
                                      <Badge key={i} variant="secondary">
                                        {keyword}
                                      </Badge>
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">{page.visitors.toLocaleString()}</TableCell>
                                <TableCell className="text-right">{page.conversions.toLocaleString()}</TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    asChild
                                  >
                                    <a href={page.url} target="_blank" rel="noopener noreferrer">
                                      <ExternalLink className="h-4 w-4" />
                                    </a>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default WebsiteSitemap;
