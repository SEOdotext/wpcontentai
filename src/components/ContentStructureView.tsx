
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
        <TabsList className="mb-4">
          <TabsTrigger value="titles">Title Suggestions</TabsTrigger>
          <TabsTrigger value="outlines">Outlines</TabsTrigger>
        </TabsList>
        
        <div className="mb-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter keywords (e.g., wordpress, seo)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1"
            />
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Generate
            </Button>
          </div>
        </div>
        
        <TabsContent value="titles">
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
            </div>
          ) : (
            <EmptyState
              icon={<Plus className="h-6 w-6" />}
              title="No Title Suggestions Yet"
              description="Enter keywords and generate title suggestions."
              actionLabel="Generate Titles"
              onAction={() => {}}
              className="py-6"
            />
          )}
        </TabsContent>
        
        <TabsContent value="outlines">
          <EmptyState
            icon={<Plus className="h-6 w-6" />}
            title="No Outlines Generated"
            description="Select a title first to generate an outline."
            actionLabel="Generate Outline"
            onAction={() => {}}
            className="py-6"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentStructureView;
