

some_settings
Stores per-website / per-website settings for content generation and publication.
id (uuid, PK)
website_id (uuid, FK → websites.id)
platform (USER-DEFINED enum) – e.g. "twitter", "facebook"
tone (text) – rich text, not "professional", but a full description for the prompt
format_preference (jsonb) – structure depends on per-platform formatting options
other_settings (jsonb) – catch-all for future flags or preferences
is_active (boolean) – whether this settings row is currently in use
created_at (timestamp with time zone)
updated_at (timestamp with time zone)
Indexes & Constraints
Unique on (website_id, platform) to prevent duplicate settings rows.
hashtags (text)
mentions (text)
image_prompt (text)
image_formats (text)

some_posts
Holds individual social posts to be scheduled or published.
id (uuid, PK)
post_theme_id (uuid, FK → post_themes.id) – links back to the "idea" or theme metadata
website_id (uuid, FK → websites.id)
title (text)
content (text)
platform (USER-DEFINED enum)
scheduled_time (timestamp with time zone) – when it's queued
published_time (timestamp with time zone) – when it actually went live
status (USER-DEFINED enum) – 'pending', 'approved', 'published', 'textgenerated', 'generated', 'declined', 'generatingidea'
media_urls (text[], nullable) – attached images/videos links
platform_post_id (text, nullable) – ID returned by the platform API once posted
error_message (text, nullable) – any failure detail from the API
metadata (jsonb, nullable) – extra data (e.g. analytics hooks, draft flags)
created_at (timestamp with time zone)
updated_at (timestamp with time zone)
Foreign Keys & Behavior
post_theme_id → post_themes.id
website_id → websites.id

---

Feature flag: Activate SoMe 
websites enable_some: True/False 
Add this feature in the 

---

Settings
For each: Toggle platform: Enable / Disable
For each: Tone, format, 

---

Generate SoMe content edge function

---

 Will use the same buttons that we have for the website, but when the social version of the article is selected, we generate for that post

---

Integration, coming soon

---

Platforms:
LinkedIn
Instagram
Tik-Tok
Facebook
X.com 

---

Editing experience, each have: 
User can switch from website post to each of these
Editing with the AI chat


---

Let's make the frontend drawer show the social media options - so the user can switch between them in the frontend and use the entire editing experience in the drawer. When the user switches they will then be able to generate a social media post for the channel, but first we create the frontend and then we will setup the functions. 
@https://contentgardener.ai/calendar?content=9c116032-6cb4-496a-a97b-f51c0a094aa9 