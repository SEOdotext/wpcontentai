OK. Let's edit the flow a bit for the user signup

Every part of the onboarding flow get's handled in localhost until auth, at auth where we create a user, we transfer the data (all data from the onboarding)
Ignore the onboarding table, we handle things in the frontend.

Front page: Enter the website domain. (in the current input field)
As User enters url we turn that into website and organisation - created in localhost (from url without TLD), but with the same id's as in db + anonymous user is created.

- Make sure not to change the backend - auth, app, contexts. Keep everything localhost!

User sees: "Loader part" that does "operations" for the user:
Setup 1. (Loading page with a ton of operations!)
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

V2: Language, understanding your website language. No function for this yet...

🌍 Language Detection (Coming soon)

🧪 Understanding your site's primary language...
(This part is still in the lab – we’ll add it soon!)

{
  "success": true,
  "language": "en",
  "website_id": "123e4567-e89b-12d3-a456-426614174000",
  "url": "https://example.com"
}
Guess you can just ignore the website_id and url

---

- Reading key content
Crawling the "scrape-content" functions 
"We’re learning how you sound so we can write like you."

---

- Suggesting relevant content ideas
Use "generate-post-ideas" to show the 5 ideas to the user



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
