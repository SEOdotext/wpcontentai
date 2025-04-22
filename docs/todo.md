Scheduling:
Weekly cron.
1. Generate the required number of posts. (Uses the generate-post-ideas)
2. Inserts the posts to the content calendar. (changes status to approved and uses post)
3. Writes the posts. 
4. Updates the user in an email

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


---

Finish the onboarding / Dash
- Add payment (w. 14 day free trial and 5 credits) - cc required?
- Add integration with optional platform in the onboarding suggestions (- Login start WordPress integration if the user has set in the localstorage that the website:)
- MAYBE: Adjust the onboarding first step to have a continouos loading bar

- MAYBE: Export til docx
Integrations: docx (Google Drive), Squarespace, Wix, Shopify, Squarespace
Other integrations: API, Zapier, Git

---

Test: Reset password feature


---

Update the default content formatting - make it great for LLM + SEO!

---


---

GTM / Analytics
Trigger + tag pr. step 

---

Integration with contentful, strappy and node etc. - json
Integration with Shopify, Wix etc.
Request Lovable?

---

Integration with search console
- Tracking value of pages

Conversion tracking / 
Rank tracking
Keyword suggestions

---

Organisations
Have multiple organisations for user

Transfer website between organisations
- Show the organisation id in the /organization page
- Create a button in the bottom of the website settings for "transfer website" 

Make the logo clickable to the /dashboard if logged in and to the front page if not logged in. 

---

---

Free plan ?
1 Article per month

---

Competitors
blaze.ai
seo.ai
textbuilder.ai

---

Keywords
Campaign
AI SEO
SEO optimering med AI (100kr ,-)

Hjælp til SEO / SEO hjælp

Content creation (16,-)

Wordpress Copywriting
Content writer
Tekstforfatter

ai content creator
marketing with ai
ai for content creation

ai for marketing

tekstforfatter hjemmeside

wordpress seo
seo optimering wordpress


---


https://contentgardener.ai/organisation?canceled=true


On the callback from the Stripe integration, update the credit package 
Your current garden
Seeds in your pocket
5 credits


---
DASHBOARD COMMUNICATION UPDATE

Instead of the current: Recommendations & Opportunities
Content Creation
Add New Article
Generate New Article Ideas
Content Opportunities
Seasonal Content
Create content around upcoming seasonal events and holidays


Content Gaps
Fill gaps in your content calendar with relevant topics


Trending Topics
Create content around trending topics in your industry

We will replace it with a communication like:
Relax, you don’t have to do anything.

Next friday we’ll send you an email… 

Go surfing, you’re already ahead! - If you want to prepare for next week, here is a link.