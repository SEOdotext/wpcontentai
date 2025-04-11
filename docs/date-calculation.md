# Date Calculation in Content Calendar

## Overview

This document explains the centralized approach to date calculation in the Content Calendar.

## Key Guidelines

1. **Use the central function**: Always use `getNextPublicationDate()` from `PostThemesContext.tsx` for all date calculations. This function handles all the logic for determining the next publication date.

2. **Status consideration**: The `getNextPublicationDate()` function considers all post statuses except 'pending' and 'declined' when determining the furthest future date. This includes 'approved', 'generated', 'published', 'generatingidea', and 'textgenerated'.

3. **Date updates on post approval**: When a post is approved (liked), the approved post keeps its date, and all other pending posts are scheduled to maintain the correct posting frequency.

4. **No custom date calculation**: Components should not implement their own date calculation logic or maintain separate state for future dates.

## Implementation

The centralized date logic was implemented to fix issues where competing functions were calculating dates in different ways. The changes:

1. Removed standalone `furthestFutureDate` state from ContentStructureView.tsx
2. Updated all direct database calls to use the context's update functions
3. Ensured all components consistently use `getNextPublicationDate()`

## Troubleshooting

If you encounter date calculation issues:

1. Check that no component is implementing custom date logic
2. Verify that statuses are being properly considered in date calculations
3. Ensure that `getNextPublicationDate()` is being called at appropriate times

## Further Improvements

Future improvements might include:

1. Adding more robust date validation
2. Implementing a more sophisticated scheduling algorithm
3. Adding user-configurable options for date calculation 