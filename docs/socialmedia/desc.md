Feature flag: Activate SoMe 

Database Setup for Social Media Posts
Table: some_settings
Stores user settings per platform.
Fields: id, user_id, platform, tone, format_preference, other_settings (json, optional).

Table: some_posts
Stores posts created by users.
Fields: id, user_id, title, content, platform, scheduled_time, status.
Platform formats and options are kept in the app code, not the database.

Integration, coming soon

---

Platforms:
LinkedIn
Instagram
Tik-Tok
Facebook 

---

Each have: 
User can switch from website post to each of these
Editing with the AI chat

---

Let's make the frontend drawer show the social media options - so the user can switch between them in the frontend and use the entire editing experience in the drawer. When the user switches they will then be able to generate a social media post for the channel, but first we create the frontend and then we will setup the functions. 
@https://contentgardener.ai/calendar?content=9c116032-6cb4-496a-a97b-f51c0a094aa9 