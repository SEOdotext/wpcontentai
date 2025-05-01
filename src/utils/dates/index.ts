import { addDays, format, startOfDay, endOfDay, isSameDay } from 'date-fns';
import { PostTheme } from '@/context/PostThemesContext';

export interface PostingDay {
  day: string;
  count: number;
}

/**
 * Creates a map of day names to their allowed post counts
 */
export function createDayCountMap(postingDays: PostingDay[]): { [key: string]: number } {
  return postingDays.reduce((acc: { [key: string]: number }, day: PostingDay) => {
    acc[day.day.toLowerCase()] = day.count;
    return acc;
  }, {});
}

/**
 * Creates a map of dates that already have posts scheduled
 */
export function createExistingPostsMap(posts: PostTheme[]): Map<string, PostTheme> {
  return new Map(
    posts
      .filter(p => p.scheduled_date && p.status !== 'declined' && p.status !== 'pending')
      .map(p => [p.scheduled_date.split('T')[0], p])
  );
}

/**
 * Counts how many active posts exist for a specific date
 */
export function countPostsForDate(posts: PostTheme[], dateStr: string): number {
  return posts.filter(p => {
    if (!p.scheduled_date || p.status === 'declined' || p.status === 'pending') return false;
    const postDate = new Date(p.scheduled_date);
    return format(postDate, 'yyyy-MM-dd') === dateStr;
  }).length;
}

/**
 * Finds the latest scheduled date from active posts
 */
export function findLatestScheduledDate(posts: PostTheme[]): Date {
  const latestDate = posts
    .filter(p => p.scheduled_date && p.status !== 'declined' && p.status !== 'pending')
    .reduce((latest, post) => {
      const postDate = new Date(post.scheduled_date!);
      return postDate > latest ? postDate : latest;
    }, new Date());

  latestDate.setHours(0, 0, 0, 0);
  return latestDate;
}

/**
 * Finds the next available publication date based on posting configuration
 */
export function findNextAvailableDate(
  dayCountMap: { [key: string]: number },
  posts: PostTheme[],
  existingPostsByDate: Map<string, PostTheme>
): Date {
  // First check content calendar for any active posts
  const calendarPosts = posts.filter(p => 
    p.scheduled_date && 
    p.status !== 'declined' && 
    p.status !== 'pending'
  );

  // If we have calendar posts, use them to determine next date
  if (calendarPosts.length > 0) {
    const latestScheduled = findLatestScheduledDate(calendarPosts);
    let currentDate = latestScheduled;
    let maxAttempts = 28; // 4 weeks safety limit

    while (maxAttempts > 0) {
      const dayName = format(currentDate, 'EEEE').toLowerCase();
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const existingPostsForDay = countPostsForDate(posts, dateStr);

      console.log('Checking date:', {
        date: dateStr,
        dayName,
        isPostingDay: !!dayCountMap[dayName],
        existingPostsForDay,
        maxPostsForDay: dayCountMap[dayName],
        activeStatuses: posts
          .filter(p => p.scheduled_date && format(new Date(p.scheduled_date), 'yyyy-MM-dd') === dateStr)
          .map(p => p.status)
      });

      if (dayCountMap[dayName] && existingPostsForDay < dayCountMap[dayName]) {
        console.log(`Found available slot on ${dayName}, ${dateStr}`);
        return currentDate;
      }

      currentDate = addDays(currentDate, 1);
      maxAttempts--;
    }
  }

  // FALLBACK: No posts in calendar or no suitable date found
  // Default to today as specified in documentation
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Formats a date consistently for the application
 */
export function formatScheduledDate(date: Date | string | null): string | null {
  if (!date) return null;
  const dateObj = new Date(date);
  dateObj.setHours(0, 0, 0, 0);
  return dateObj.toISOString();
}

/**
 * Checks if all required posts for the next week are already scheduled
 */
export function isWeeklyScheduleFilled(
  dayCountMap: { [key: string]: number },
  posts: PostTheme[],
  startDate: Date = new Date()
): { isFilled: boolean; missingSlots: { date: Date; count: number }[] } {
  const start = startOfDay(startDate);
  const missingSlots: { date: Date; count: number }[] = [];
  let totalRequired = 0;
  let totalScheduled = 0;

  // Check next 7 days
  for (let i = 0; i < 7; i++) {
    const currentDate = addDays(start, i);
    const dayName = format(currentDate, 'EEEE').toLowerCase();
    const requiredPosts = dayCountMap[dayName] || 0;
    totalRequired += requiredPosts;

    // Count scheduled posts for this day
    const scheduledPosts = posts.filter(p => {
      if (!p.scheduled_date || p.status === 'declined' || p.status === 'pending') return false;
      const postDate = new Date(p.scheduled_date);
      return isSameDay(postDate, currentDate);
    }).length;

    totalScheduled += scheduledPosts;

    // If we have fewer posts than required for this day, record it
    if (scheduledPosts < requiredPosts) {
      missingSlots.push({
        date: currentDate,
        count: requiredPosts - scheduledPosts
      });
    }
  }

  return {
    isFilled: totalScheduled >= totalRequired && missingSlots.length === 0,
    missingSlots
  };
} 