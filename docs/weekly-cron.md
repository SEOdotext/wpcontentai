Scheduling:
Weekly cron.
1. Generate the required number of posts. (Uses the generate-post-ideas)
2. Inserts the posts to the content calendar. (changes status to approved and uses post)
3. Updates the user in an email
4. Writes the posts (with generate and publish)

DB: Create "weekly_planning_day" in "publication_settings". 

Every "weekly_planning_day" the "posting_frequency" n amount is used to generate the amount of topics with edge function "generate_post_ideas". 

The weekly planning day is also the day when the client gets the mail for the weekly planned posts. 

The posts are inserted according to the:
On "weekly_planning_day" The "posting_frequency" n amount of posts are generated and added to the weekly email that is sent to the admin users (Status approved). But these might not be the same as the generated posts. The posts that are sent to the user are the posts that are in the content calendar for that week. 
If there are "subject_matters" generated that are in the future, there is a list of these generated post "subject_matters". 
(Aka if the user is ahead with the posts, we still generate the post ideas, but we don't insert in the content calendar. )

Insert the posts into the calendar for the next 7 days (if they already have the content, skip these)...
Required

Make sure content is completed using the generate and publish.

