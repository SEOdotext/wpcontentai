On the /create

Date settings

These dates should just be the same and only set in the frontend with the logic from the file! 

All dates shown in the frontend should be the furthest in the future + settings amount of dates.

The dates in the frontend can be updated by the user.

When the user likes the post, the date is unchanged for that post as it changes status.

All other post dates are updated to the furthest in the future + settings amount of dates.

---

With no content in Content calendar. Make sure that it takes the content calendar added posts. If none are added. Defaults back to todays date 

getFurthestFutureDate should look at published and generated


Make sure that multiple posts can be added 1 by 1 without reloading by making sure that all other posts also have updated date, when approving a post.

In the create: http://localhost:8080/create we are not including the correct statuses
we should use all except pending and declined for pushing the latest date forward

status = ANY (ARRAY['pending'::text, 'approved'::text, 'generated'::text, 'published'::text, 'declined'::text, 'generatingidea'::text, 'textgenerated'::text])