The key points being:
Only the edge function creates themes (with 'generatingidea' status)
Edge function updates them to 'pending' when content is ready
Frontend only reads and displays themes based on their status
No duplicate creation because the frontend never creates themes

---

The valid status transitions for a theme are:
'generatingidea' - Initial state when theme is first created
'pending' - When ideas have been generated but not yet approved
'generated' - When a theme has been approved/liked
'published' - When the post has been published to WordPress