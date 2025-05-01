# Date Calculation in Content Calendar

## Overview

This document explains the centralized approach to date calculation in the Content Calendar.

## Key Guidelines

1. **Use the central function**: Always use `getNextPublicationDate()` from `PostThemesContext.tsx` for all date calculations. This function handles all the logic for determining the next publication date.

2. **Status consideration**: The `getNextPublicationDate()` function considers all post statuses except 'pending' and 'declined' when determining the furthest future date. This includes 'approved', 'generated', 'published', 'generatingidea', and 'textgenerated'.

3. **Date updates on post approval**: When a post is approved (liked), the approved post keeps its date, and all other pending posts are scheduled to maintain the correct posting frequency. Set to the next relevant date, based on the logic that we also use in the weekly planner. 

4. **No custom date calculation**: Components should not implement their own date calculation logic or maintain separate state for future dates.

5. Make sure that there are 5 dates calculated (with number of posts) so the frontend knows which days the next 5 posts are scheduled for. 

---

Date Handling for Pending Posts:
Pending posts now only show calculated dates in the frontend
These dates are calculated dynamically using getNextPublicationDate()
No dates are stored in the database for pending posts
The frontend updates these display dates whenever the post list changes
Date Handling for Approved Posts:
When a post is approved, it gets a fixed date in the database
This date is calculated using getNextPublicationDate()
Once set, this date remains unchanged unless manually modified
The date is stored in the database


---

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



----


On the /create

Date settings

These dates should just be the same and only set in the frontend with the logic from the file! 

For example, user has 7 posts pr. week. 1 monday, 2 tuesday, 1 wed, 2 thur, 1 friday
Today is tuesday and 1 has been set to today. Then post 1 more today. Then schedule a post on wed and 2 on thur. etc. 

The dates in the frontend can still be updated by the user.

When the user likes the post, the date is unchanged for that post as it changes status. (Given that the database already has the correct date. The post theme entry in the database should have the date with date set as the post is the approved)

getNextPublicationDate is the main function used for the calculation. 

---

FALLBACK
With no content in Content calendar. Make sure that it takes the content calendar added posts. If none are added. Defaults back to todays date 