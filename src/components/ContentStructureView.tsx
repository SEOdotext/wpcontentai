
import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TitleSuggestion, { Keyword } from './TitleSuggestion';
import EmptyState from './EmptyState';
import { cn } from '@/lib/utils';
import { addDays } from 'date-fns';
import { useSettings } from '@/context/SettingsContext';

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

const ContentStructureView: React.FC<ContentStructureViewProps> = ({ className }) => {
  const [selectedTitleId, setSelectedTitleId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [titles, setTitles] = useState<Array<{
    id: number;
    title: string;
    keywords: Keyword[];
    date: Date;
  }>>([]);
  const [nextPostDate, setNextPostDate] = useState<Date>(new Date());
  const { publicationFrequency } = useSettings();

  // Calculate the next post date based on content in the calendar
  useEffect(() => {
    try {
      // Get content from localStorage
      const existingContent = JSON.parse(localStorage.getItem('calendarContent') || '[]');
      
      if (existingContent.length === 0) {
        // If no content, start with today
        setNextPostDate(new Date());
        return;
      }
      
      // Find the latest date in the calendar
      let latestDate = new Date();
      
      existingContent.forEach(item => {
        if (item.date) {
          try {
            const itemDate = new Date(item.date);
            if (!isNaN(itemDate.getTime()) && itemDate > latestDate) {
              latestDate = itemDate;
            }
          } catch (err) {
            console.error('Error parsing date:', item.date, err);
          }
        }
      });
      
      // Set next post date to latest date + publication frequency
      const calculatedNextDate = addDays(latestDate, publicationFrequency);
      console.log('Next post date calculated:', calculatedNextDate);
      setNextPostDate(calculatedNextDate);
      
    } catch (error) {
      console.error('Error calculating next post date:', error);
      setNextPostDate(new Date());
    }
  }, [publicationFrequency]);

  // Load initial mock data with ALL the same future date
  useEffect(() => {
    if (!nextPostDate) return;
    
    const initialMockTitles = [
      {
        id: 1,
        title: '10 Proven WordPress SEO Strategies for Higher Rankings in 2023',
        keywords: mockKeywords.slice(0, 3),
        date: nextPostDate,
      },
      {
        id: 2,
        title: 'How to Optimize Your WordPress Content for Maximum SEO Impact',
        keywords: mockKeywords.slice(1, 4),
        date: nextPostDate,
      },
      {
        id: 3,
        title: 'The Ultimate Guide to WordPress Content Strategy for Beginners',
        keywords: [mockKeywords[0], mockKeywords[2], mockKeywords[3]],
        date: nextPostDate,
      },
      {
        id: 4,
        title: "WordPress SEO in 2023: What's Changed and How to Adapt",
        keywords: mockKeywords.slice(0, 2),
        date: nextPostDate,
      },
      {
        id: 5,
        title: 'Creating SEO-Friendly Blog Posts in WordPress: A Step-by-Step Guide',
        keywords: mockKeywords,
        date: nextPostDate,
      },
    ];
    
    setTitles(initialMockTitles);
  }, [nextPostDate]);

  // Update all dates when a post is added to the calendar
  const updateAllDates = () => {
    try {
      // Get the current content in the calendar
      const existingContent = JSON.parse(localStorage.getItem('calendarContent') || '[]');
      
      // Find the latest date
      let latestDate = new Date();
      
      existingContent.forEach(item => {
        if (item.date) {
          try {
            const itemDate = new Date(item.date);
            if (!isNaN(itemDate.getTime()) && itemDate > latestDate) {
              latestDate = itemDate;
            }
          } catch (err) {
            console.error('Error parsing date:', item.date, err);
          }
        }
      });
      
      // Calculate the new date for all titles
      const newDate = addDays(latestDate, publicationFrequency);
      console.log('Updating all post dates to:', newDate);
      
      // Update all titles with the new date
      setTitles(prevTitles => 
        prevTitles.map(title => ({
          ...title,
          date: newDate
        }))
      );
      
      // Update the nextPostDate state
      setNextPostDate(newDate);
      
    } catch (error) {
      console.error('Error updating dates:', error);
    }
  };

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

  const handleTitleLiked = () => {
    // Update all dates after a post has been liked and added to calendar
    updateAllDates();
  };

  return (
    <div className={className}>
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
              onLiked={handleTitleLiked}
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
