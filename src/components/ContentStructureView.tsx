
import React, { useState } from 'react';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TitleSuggestion, { Keyword } from './TitleSuggestion';
import EmptyState from './EmptyState';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

const initialMockTitles = [
  {
    id: 1,
    title: '10 Proven WordPress SEO Strategies for Higher Rankings in 2023',
    keywords: mockKeywords.slice(0, 3),
    date: new Date(),
  },
  {
    id: 2,
    title: 'How to Optimize Your WordPress Content for Maximum SEO Impact',
    keywords: mockKeywords.slice(1, 4),
    date: new Date(),
  },
  {
    id: 3,
    title: 'The Ultimate Guide to WordPress Content Strategy for Beginners',
    keywords: [mockKeywords[0], mockKeywords[2], mockKeywords[3]],
    date: new Date(),
  },
  {
    id: 4,
    title: "WordPress SEO in 2023: What's Changed and How to Adapt",
    keywords: mockKeywords.slice(0, 2),
    date: new Date(),
  },
  {
    id: 5,
    title: 'Creating SEO-Friendly Blog Posts in WordPress: A Step-by-Step Guide',
    keywords: mockKeywords,
    date: new Date(),
  },
];

const ContentStructureView: React.FC<ContentStructureViewProps> = ({ className }) => {
  const [selectedTitleId, setSelectedTitleId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [titles, setTitles] = useState(initialMockTitles);
  const [date, setDate] = useState<Date>(new Date());

  const handleSelectTitle = (id: number) => {
    setSelectedTitleId(id === selectedTitleId ? null : id);
  };

  const handleRemoveTitle = (id: number) => {
    setTitles(titles.filter(title => title.id !== id));
    if (selectedTitleId === id) {
      setSelectedTitleId(null);
    }
  };

  const handleUpdateTitleDate = (id: number, newDate: Date) => {
    setTitles(titles.map(title => 
      title.id === id ? { ...title, date: newDate } : title
    ));
  };

  return (
    <div className={className}>
      <Card className="border-0 shadow-elevation mb-8">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg font-medium">Content Overview</CardTitle>
            <div className="flex items-center space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, 'MMMM yyyy') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(newDate) => newDate && setDate(newDate)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
      </Card>

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
      
      {titles.length > 0 ? (
        <div className="grid gap-4">
          {titles.map((title) => (
            <TitleSuggestion
              key={title.id}
              title={title.title}
              keywords={title.keywords}
              selected={selectedTitleId === title.id}
              onSelect={() => handleSelectTitle(title.id)}
              onRemove={() => handleRemoveTitle(title.id)}
              date={title.date}
              onUpdateDate={(newDate) => handleUpdateTitleDate(title.id, newDate)}
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
    </div>
  );
};

export default ContentStructureView;
