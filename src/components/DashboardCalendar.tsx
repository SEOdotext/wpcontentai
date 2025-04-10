import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { usePostThemes } from '@/context/PostThemesContext';

interface PostTheme {
  id: string;
  subject_matter: string;
  post_content: string | null;
  scheduled_date: string;
  status: string;
  keywords: string[];
}

const DashboardCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [hoveredPost, setHoveredPost] = useState<PostTheme | null>(null);
  const { postThemes, isLoading } = usePostThemes();
  
  // Get the first and last day of the current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  // Get all days in the current month
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get the day of the week for the first day of the month (0 = Sunday, 6 = Saturday)
  const firstDayOfMonth = monthStart.getDay();
  
  // Create an array of empty cells for days before the first day of the month
  const emptyCells = Array(firstDayOfMonth).fill(null);
  
  // Group posts by date
  const postsByDate = postThemes.reduce((acc, post) => {
    try {
      const date = new Date(post.scheduled_date);
      const dateKey = format(date, 'yyyy-MM-dd');
      
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      
      acc[dateKey].push(post);
      return acc;
    } catch (e) {
      console.error('Error processing post date:', e);
      return acc;
    }
  }, {} as Record<string, PostTheme[]>);
  
  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };
  
  // Get status color based on post status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-500';
      case 'scheduled':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'approved':
        return 'bg-purple-500';
      case 'textgenerated':
        return 'bg-indigo-500';
      case 'generated':
        return 'bg-pink-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  // Render the calendar
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Content Calendar</h3>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={goToPreviousMonth}
              title="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {format(currentDate, 'MMMM yyyy')}
            </span>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={goToNextMonth}
              title="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-1">{day}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before the first day of the month */}
          {emptyCells.map((_, index) => (
            <div key={`empty-${index}`} className="h-20 border rounded-md bg-gray-50"></div>
          ))}
          
          {/* Days of the month */}
          {daysInMonth.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayPosts = postsByDate[dateKey] || [];
            const isToday = isSameDay(day, new Date());
            
            return (
              <TooltipProvider key={dateKey}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className={cn(
                        "h-20 border rounded-md p-1 overflow-hidden",
                        isToday ? "bg-blue-50 border-blue-200" : "bg-white",
                        dayPosts.length > 0 ? "cursor-pointer" : ""
                      )}
                      onMouseEnter={() => dayPosts.length > 0 ? setHoveredPost(dayPosts[0]) : null}
                      onMouseLeave={() => setHoveredPost(null)}
                    >
                      <div className="flex justify-between">
                        <span className={cn(
                          "text-sm font-medium",
                          isToday ? "text-blue-600" : "text-gray-700"
                        )}>
                          {format(day, 'd')}
                        </span>
                        {dayPosts.length > 0 && (
                          <span className="text-xs bg-gray-100 rounded-full px-1.5">
                            {dayPosts.length}
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-1 flex flex-wrap gap-1">
                        {dayPosts.slice(0, 3).map(post => (
                          <div 
                            key={post.id} 
                            className={cn(
                              "w-2 h-2 rounded-full",
                              getStatusColor(post.status)
                            )}
                            title={post.subject_matter}
                          />
                        ))}
                        {dayPosts.length > 3 && (
                          <div className="text-xs text-gray-500">+{dayPosts.length - 3}</div>
                        )}
                      </div>
                    </div>
                  </TooltipTrigger>
                  {dayPosts.length > 0 && (
                    <TooltipContent side="bottom" className="w-64 p-2">
                      <div className="space-y-2">
                        <h4 className="font-medium">{format(day, 'MMMM d, yyyy')}</h4>
                        <div className="space-y-1">
                          {dayPosts.map(post => (
                            <div 
                              key={post.id} 
                              className="text-sm p-1 rounded hover:bg-gray-100"
                            >
                              <div className="flex items-center gap-1">
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  getStatusColor(post.status)
                                )} />
                                <span className="font-medium truncate">{post.subject_matter}</span>
                              </div>
                              {post.post_content && (
                                <p className="text-xs text-gray-500 truncate mt-1">
                                  {post.post_content}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Published</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Scheduled</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span>Approved</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
            <span>Text Generated</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-pink-500"></div>
            <span>Generated</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardCalendar; 