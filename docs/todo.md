Fold email og pass ind og vis sign up with google som den primære knap

Almost there. When clicking create account you’re ready to start generating content for free

Save and continue" → "You're almost ready to let your growth flourish on autopilot. 🌱🚀

---

Add support for adding new website from the backend with the "onboarding"

---

Create a dashboard to see the users 

Add signup status to the onboarding database

---

User has alread accepted invite and is part of the team, then we get this error:

TeamManagement.tsx:428 Resending invitation to: philipleth+stripe@gmail.com
TeamManagement.tsx:430 
            
            
           POST https://vehcghewfnjkwlwmmrix.supabase.co/functions/v1/invite-user 400 (Bad Request)
handleResendInvite @ TeamManagement.tsx:430
onClick @ TeamManagement.tsx:664
callCallback2 @ chunk-W6L2VRDA.js?v=c0a0cf57:3674
invokeGuardedCallbackDev @ chunk-W6L2VRDA.js?v=c0a0cf57:3699
invokeGuardedCallback @ chunk-W6L2VRDA.js?v=c0a0cf57:3733
invokeGuardedCallbackAndCatchFirstError @ chunk-W6L2VRDA.js?v=c0a0cf57:3736
executeDispatch @ chunk-W6L2VRDA.js?v=c0a0cf57:7014
processDispatchQueueItemsInOrder @ chunk-W6L2VRDA.js?v=c0a0cf57:7034
processDispatchQueue @ chunk-W6L2VRDA.js?v=c0a0cf57:7043
dispatchEventsForPlugins @ chunk-W6L2VRDA.js?v=c0a0cf57:7051
(anonymous) @ chunk-W6L2VRDA.js?v=c0a0cf57:7174
batchedUpdates$1 @ chunk-W6L2VRDA.js?v=c0a0cf57:18913
batchedUpdates @ chunk-W6L2VRDA.js?v=c0a0cf57:3579
dispatchEventForPluginEventSystem @ chunk-W6L2VRDA.js?v=c0a0cf57:7173
dispatchEventWithEnableCapturePhaseSelectiveHydrationWithoutDiscreteEventReplay @ chunk-W6L2VRDA.js?v=c0a0cf57:5478
dispatchEvent @ chunk-W6L2VRDA.js?v=c0a0cf57:5472
dispatchDiscreteEvent @ chunk-W6L2VRDA.js?v=c0a0cf57:5449Understand this error
TeamManagement.tsx:454 Error in handleResendInvite: Error: A user with this email address has already been registered
    at handleResendInvite (TeamManagement.tsx:446:15)

---

If a current user tries to use the signup onboarding input from the front page... Then logs in to the application, the storage contains the organsiation data and it seems to make the user unable to manage the organisation etc. Also the organisation now shows as the new name that the user inputted...

Let's add a feature to log people in, if they try to create a website from the front page while they already have a functional login. 

Also add the function to create a new website for existing account users...

---

Finish the onboarding / Dash
- Options for the platform setting (select publishing platform)
- Add integration with optional platform in the onboarding suggestions (- Login start WordPress integration if the user has set in the localstorage that the website:)

- MAYBE: Export til docx
Integrations: docx (Google Drive), Squarespace, Wix, Shopify, Squarespace
Other integrations: API, Zapier, Git
Integration with contentful, strappy and node etc. - json
Integration with Shopify, Wix etc.
Request Lovable?

---

Test: Reset password feature

---

Resend magic link to user when invites are sent.

---

DONE: Make sure we store all error logs in onboarding

---

Update the default content formatting - make it great for LLM + SEO!
---

GTM / Analytics
Trigger + tag pr. step 

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


---

Integration with search console
- Tracking value of pages

Conversion tracking / 
Rank tracking
Keyword suggestions

---


---

Organisations
Have multiple organisations for user

Transfer website between organisations
- Show the organisation id in the /organization page
- Create a button in the bottom of the website settings for "transfer website" 

Make the logo clickable to the /dashboard if logged in and to the front page if not logged in. 
