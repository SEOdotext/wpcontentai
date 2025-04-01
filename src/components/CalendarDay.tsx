// Find and update any status-related interface
interface CalendarContent {
  id: string;
  title: string;
  description: string;
  dateCreated: string;
  date: string;
  contentStatus: 'draft' | 'published' | 'scheduled' | 'content-ready';
  // ... other properties
} 