# Content Creation Date Logic

## Overview
The date setting in content creation follows a specific pattern to ensure consistent content scheduling:

1. When new content is generated:
   - The first post gets the next available publication date
   - Each subsequent post is scheduled one day after the previous post
   - This ensures even distribution of content

2. When a post is approved (liked):
   - The approved post keeps its scheduled date
   - All other pending posts are shifted one day forward
   - This maintains the one-day spacing between posts

## Implementation Details

### Initial Generation
```typescript
// When generating new content
const firstPostDate = getNextPublicationDate(); // Gets next available date
const subsequentPosts = titles.slice(1).map((title, index) => {
  const date = addDays(firstPostDate, index + 1); // Each post is one day after the previous
  return {
    ...title,
    scheduled_date: date.toISOString()
  };
});
```

### Post Approval
```typescript
// When a post is approved
const likedPost = postThemes.find(theme => theme.id === id);
if (likedPost) {
  // Keep the approved post's date
  updatePostTheme(id, { status: 'generated' });
  
  // Shift all other pending posts forward
  const otherPendingPosts = postThemes.filter(theme => 
    theme.status === 'pending' && theme.id !== id
  );
  
  otherPendingPosts.forEach(post => {
    const currentDate = new Date(post.scheduled_date);
    const nextDate = addDays(currentDate, 1);
    updatePostTheme(post.id, { scheduled_date: nextDate.toISOString() });
  });
}
```

## Important Rules

1. **Date Spacing**: Always maintain at least one day between posts
2. **Approval Impact**: When a post is approved, shift all pending posts forward
3. **Manual Updates**: When manually updating a post's date, ensure it doesn't conflict with other posts
4. **Publication Frequency**: Respect the website's publication frequency settings

## Common Pitfalls

1. Don't set multiple posts to the same date
2. Don't set posts to dates in the past
3. Don't set posts to dates too far in the future
4. Always maintain the one-day spacing rule

## Best Practices

1. Use `getNextPublicationDate()` to get the next available date
2. Use `addDays()` for consistent date manipulation
3. Always convert dates to ISO strings when storing in the database
4. Validate dates before saving to ensure they follow the rules 