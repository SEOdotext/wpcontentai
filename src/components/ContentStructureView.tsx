
import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Filter, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import TitleSuggestion, { Keyword } from './TitleSuggestion';
import EmptyState from './EmptyState';

interface ContentStructureViewProps {
  className?: string;
}

// Mock data for the component
const mockKeywords: Keyword[] = [
  { text: 'wordpress', difficulty: 'hard' },
  { text: 'seo', difficulty: 'medium' },
  { text: 'content marketing', difficulty: 'medium' },
  { text: 'blog post', difficulty: 'easy' },
];

const mockTitles = [
  {
    id: 1,
    title: '10 Proven WordPress SEO Strategies for Higher Rankings in 2023',
    keywords: mockKeywords.slice(0, 3),
    keywordUsage: 85,
  },
  {
    id: 2,
    title: 'How to Optimize Your WordPress Content for Maximum SEO Impact',
    keywords: mockKeywords.slice(1, 4),
    keywordUsage: 72,
  },
  {
    id: 3,
    title: 'The Ultimate Guide to WordPress Content Strategy for Beginners',
    keywords: [mockKeywords[0], mockKeywords[2], mockKeywords[3]],
    keywordUsage: 65,
  },
  {
    id: 4,
    title: "WordPress SEO in 2023: What's Changed and How to Adapt",
    keywords: mockKeywords.slice(0, 2),
    keywordUsage: 58,
  },
  {
    id: 5,
    title: 'Creating SEO-Friendly Blog Posts in WordPress: A Step-by-Step Guide',
    keywords: mockKeywords,
    keywordUsage: 92,
  },
];

const ContentStructureView: React.FC<ContentStructureViewProps> = ({ className }) => {
  const [selectedTitleId, setSelectedTitleId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');

  const handleSelectTitle = (id: number) => {
    setSelectedTitleId(id === selectedTitleId ? null : id);
  };

  return (
    <div className={className}>
      <Tabs defaultValue="titles" className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <TabsList className="h-9">
            <TabsTrigger value="titles" className="text-sm px-3">
              Title Suggestions
            </TabsTrigger>
            <TabsTrigger value="outlines" className="text-sm px-3">
              Outlines
            </TabsTrigger>
            <TabsTrigger value="sections" className="text-sm px-3">
              Sections
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Select defaultValue="recent">
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="keywords">Keyword Usage</SelectItem>
              </SelectContent>
            </Select>
            
            <Button size="icon" variant="outline">
              <Filter className="h-4 w-4" />
              <span className="sr-only">Filter</span>
            </Button>
            
            <Button size="icon" variant="outline">
              <RefreshCw className="h-4 w-4" />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Enter your focus keywords (e.g., wordpress, seo, content)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-full bg-background"
              />
            </div>
            <Button className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Generate Titles
            </Button>
          </div>
        </div>
        
        <TabsContent value="titles" className="mt-0">
          {mockTitles.length > 0 ? (
            <div className="grid gap-4">
              {mockTitles.map((title) => (
                <TitleSuggestion
                  key={title.id}
                  title={title.title}
                  keywords={title.keywords}
                  keywordUsage={title.keywordUsage}
                  selected={selectedTitleId === title.id}
                  onSelect={() => handleSelectTitle(title.id)}
                />
              ))}
              
              <div className="flex items-center justify-between mt-2">
                <Button variant="ghost" size="sm" className="gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm text-muted-foreground">
                  Page 1 of 3
                </div>
                <Button variant="ghost" size="sm" className="gap-1">
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Plus className="h-6 w-6" />}
              title="No Title Suggestions Yet"
              description="Enter your keywords and generate title suggestions for your content."
              actionLabel="Generate Titles"
              onAction={() => {}}
              className="py-12"
            />
          )}
        </TabsContent>
        
        <TabsContent value="outlines" className="mt-0">
          <EmptyState
            icon={<Plus className="h-6 w-6" />}
            title="No Outlines Generated"
            description="Select a title first, then generate an outline for your content."
            actionLabel="Generate Outline"
            onAction={() => {}}
            className="py-12"
          />
        </TabsContent>
        
        <TabsContent value="sections" className="mt-0">
          <EmptyState
            icon={<Plus className="h-6 w-6" />}
            title="No Sections Created"
            description="Generate an outline first, then create detailed sections for your content."
            actionLabel="Create Sections"
            onAction={() => {}}
            className="py-12"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentStructureView;
