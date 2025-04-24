import { addDays, format } from 'date-fns';
import { PostTheme } from '@/context/PostThemesContext';

interface PostingDay {
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
 * Starts looking from either today or the latest scheduled date, whichever is later
 */
export function findNextAvailableDate(
  dayCountMap: { [key: string]: number },
  posts: PostTheme[],
  existingPostsByDate: Map<string, PostTheme>
): Date {
  // Start from either today or the latest scheduled date, whichever is later
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const latestScheduled = findLatestScheduledDate(posts);
  let currentDate = latestScheduled > today ? addDays(latestScheduled, 1) : today;
  let maxAttempts = 28; // 4 weeks safety limit

  while (maxAttempts > 0) {
    const dayName = format(currentDate, 'EEEE').toLowerCase();
    const dateStr = format(currentDate, 'yyyy-MM-dd');

    // Check if we already have a post for this date
    const existingPost = existingPostsByDate.get(dateStr);
    const existingPostsForDay = countPostsForDate(posts, dateStr);

    console.log('Checking date:', {
      date: dateStr,
      dayName,
      isPostingDay: !!dayCountMap[dayName],
      hasExistingPost: !!existingPost,
      existingPostsForDay,
      maxPostsForDay: dayCountMap[dayName],
      activeStatuses: posts
        .filter(p => p.scheduled_date && format(new Date(p.scheduled_date), 'yyyy-MM-dd') === dateStr)
        .map(p => p.status)
    });

    // Only add date if:
    // 1. It's a posting day
    // 2. We haven't reached the max posts for this day
    // 3. We don't already have a post for this exact date
    if (dayCountMap[dayName] && 
        existingPostsForDay < dayCountMap[dayName] && 
        !existingPost) {
      console.log(`Found available slot on ${dayName}, ${dateStr}`);
      return currentDate;
    }

    // Move to next day
    currentDate = addDays(currentDate, 1);
    maxAttempts--;
  }

  // If no date found after 4 weeks, use next available configured day
  console.log('No optimal day found, using next available configured day');
  let nextDate = latestScheduled > today ? addDays(latestScheduled, 1) : today;
  while (!dayCountMap[format(nextDate, 'EEEE').toLowerCase()]) {
    nextDate = addDays(nextDate, 1);
  }
  return nextDate;
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