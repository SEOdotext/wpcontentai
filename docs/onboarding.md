OK. Let's edit the flow a bit for the user signup

Every part of the onboarding flow get's handled in localhost until auth, at auth where we create a user, we transfer the data (all data from the onboarding)
Ignore the onboarding table, we handle things in the frontend.

Front page: Enter the website domain. (in the current input field)
As User enters url we turn that into website and organisation - created in localhost (from url without TLD), but with the same id's as in db + anonymous user is created.

- Make sure not to change the backend - auth, app, contexts. Keep everything localhost!

User sees: "Loader part" that does "operations" for the user:
Setup 1. (Loading page with a ton of operations!)
UI/UX: Activity Stream with animations and horisontal progress (Onboarding checklist completed on a horisontal line as steps)

- Account created
"No account? No problem! We made a quick site and organisation for you."
✅ You’re now set up with a private workspace based on your website url: xxx.xx. Everything is local, just for you.

---

- Reading website 
(Use the "get-sitemap-pages" and store the up to 200 urls in website_content localstorage)
"We’ve just read your website — exciting! 😄 We can always do some more reading later."
🧠 Up to 200 pages have been loaded from your sitemap. (show the actual number instead of "Up to 200")

(if no sitemap is found, fallback to "crawl-website-pages")

---

- Learning Tone-of-voice
(Use "suggest-key-content" and select 4-5 pages for key content. Make sure to save these in localhost, normally we prompt user to accept which ones, skip that, just select the 4-5 in this flow - without changing the function, let me know if this is an issue). 

"🗣️ Learning Tone-of-Voice

We’re learning how you sound so we can write like you.
🔍 Selected and prioritised these key pages to understand your tone and style:
/about-us
/services/branding
/blog/why-authenticity-matters
(...and so on)
(Don’t worry, you can adjust this later.)"

---

Language, understanding website language. (NOT SHOWN TO USER)

{
  "success": true,
  "language": "en",
  "website_id": "123e4567-e89b-12d3-a456-426614174000",
  "url": "https://example.com"
}
... AI, Guess you can just ignore the website_id and url"

---

📚 Reading Key Content
(Using scrape-content functions)
"We’re digging deeper into your key content to fully understand your voice and topics."

Your most important pages are now being read — this helps us learn how to write like you.

---


💡 Suggesting Relevant Content Ideas
(Using generate-post-ideas)
"Your content garden is blooming! 🌱"
We’ve generated 5 unique content ideas based on your tone and themes.
🧠 You’ll now see them and get to pick your favorites.


- Suggesting relevant content ideas
Use "generate-post-ideas" to show the 5 ideas to the user

---

⚡ Setup 2: Content Idea Selection
(Simple page like contentgardener.ai/create – no sidebar, just ideas)
✨ Which of these ideas do you like?
👍 Like what you see? Thumbs up.
👎 Not your style? Thumbs down ... more can be generated!

If 0 ideas are liked, auto-generate 5 new ones.
When a post is rated, hide it from the view — keep it clean and snappy.


Comms frontend. (Maybe simpler) Choose Your Content Seeds
✨ Which ideas do you want to grow?
We’ve planted five fresh content ideas based on your website’s tone and style.
👍 Like what you see? Give it a thumbs up.
👎 Not your style? Thumbs down — we’ll replace it with something new.
🪴 Your garden, your rules:
If none of the ideas take root (0 liked), we’ll automatically plant 5 new ones.
Each idea disappears after rating — keeping your garden neat and tidy.
Let’s grow something great 🌱


---

📝 Setup 3: Generating Your First Piece of Content
This builds on the user’s choices and moves them into actual content creation.

🛠️ Generating First Draft
"We’re putting your favorite idea into words..."
✍️ Based on your first selected content idea and your website’s tone of voice, we’re drafting your first piece of content. 

(Using generate-content-v3 – pulling from tone + selected idea)

---

Once the content is generated, you could show:
📄 Your First Draft Is Ready!
"Here’s your AI-generated content — tailored to your tone and style."
Options:

📤 Publish
♻️ Regenerate

---


The backend steps are linked with the frontend, the frontend gets notified about the updates. 

Setup 2. Content Idea
- Thumbs up and thumbs down for the 5 content ideas generated
This is a page in the signup quite similar to https://contentgardener.ai/create, reuse the functions if you can. But no sidebar and minimal information. Focus on the generated content ideas. No categories are added here
If 0 posts are liked, genereate 5 new suggestions
As the posts are thumbed up and down, "remove them" from the list, similar to frontend

Setup 3. 

- Creating blog format


Page: Display 

https://contentgardener.ai/setup (Make sure that there are changes to urls for the steps for tracking)




IGNORE DB FOR:

Database table for onboarding 
website_id relation
website_indexing
keyword_suggestions
post_ideas
client_thumbs

errors
