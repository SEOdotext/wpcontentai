OK. Let's edit the flow a bit for the user signup

Front page: Enter the website domain. (in the current input field)

Then
DB: First: Create website (url entered) and organisation (from url without TLD), + anonymous user is created.

User sees: "Loader part" that does "operations" for the user:
Setup 1. (Loading page with a ton of operations!)
- Reading website 
(Use the "get-sitemap-pages" and the "crawl-website-pages" functions and store the up to 500 urls in website_content)
- Learning Tone-of-voice
(Use "suggest-key-content" and select 4-5 pages for key content. Make sure to save these, normally we prompt user to accept which ones, skip that, just select the 4-5 in this flow - without changing the function, let me know if this is an issue) 
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

