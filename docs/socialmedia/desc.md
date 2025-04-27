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
