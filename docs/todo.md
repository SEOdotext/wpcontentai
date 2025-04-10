http://localhost:8080/auth


https://vehcghewfnjkwlwmmrix.supabase.co/auth/v1/verify?token=42c6c7dad6c8ad6be54413c2c2ced46ee42172d5964c693072e35f04&type=signup&redirect_to=https://contentgardener.ai

Should redirect to dashboard

---

On onboarding the creating post takes around 15 seconds turn around
the loader gets to 95 in 7. Make the loading approx. 15.


---

Make sure not to use article casing for all headers in the onboarding. Use a normal case for the headers etc. - Only "newsletter casing" when really relevant

---


Sending invitation for: peter@advenue.dk
index-DP3qBJAv.js:464 Invitation response: {status: 'success', message: 'Existing user added to organization', user_id: '8b1dc36e-029f-4b7f-b7c0-48f2faa5b90c', is_new_user: false}
index-DP3qBJAv.js:464 Refreshing team data...
index-DP3qBJAv.js:464 Fetching team members for organisation: 9266f562-2a17-4d73-9915-958cf2cf65a5

If a user is member, still send an email with a link to the application. 
Confirm your account membership. 
If a user has not confirmed their email, make sure that we can send the user a new mail for access. 

---

Email Information
Details
To	laustskrudland@live.dk
From	info@contentgardener.ai
Subject	Confirm Your Signup
More Details

Event History
SendGrid LogoReceived by SendGrid

 Processed

2025/04/07 8:07am UTC+00:00

live.dkReceived by eur.olc.protection.outlook.com

 Blocked
2025/04/07 8:07am UTC+00:00

---

Finish the onboarding
- Add integration with WordPress
- Add payment (w. 14 day free trial) - cc required?
- Adjust the onboarding first step with activity log in the streaming mode
- Onboarding, make sure links are being written into the text
- make sure that the jwt for user add member gets refreshed

Should we have the steps in the URL, something like this (written with correct url formatting)
http://localhost:8080/onboarding=seeds
http://localhost:8080/onboarding=draft

---

---

Remove the use of title case from most places. Just use normal casing, only generated article headers can use title case.

Integration with contentful and node etc. - json

---

Let's make sure that we are rendering the content in a proper way 5 måder at optimere din webshop for bedre konverteringsrater
<p><p>At optimere din webshop for bedre konverteringsrater er afgørende for at sikre, at din online forretning er succesfuld. I en verden, hvor forbrugere har adgang til utallige muligheder med et enkelt klik, er det vigtigt at gøre en ekstra indsats for at tiltrække og fastholde kunder. I denne artikel vil vi udforske fem effektive måder at forbedre din webshop på, så du kan maksimere dine konverteringer og skabe en mere tilfredsstillende shoppingoplevelse for dine besøgende.</p>

<p>

<h2><ol><li>Forbedre brugeroplevelsen (UX)</h2></li><li><p>Brugeroplevelsen er en af de mest afgørende faktorer for konverteringsrater. En webshop, der er svær at navigere i, vil hurtigt skræmme potentielle kunder væk. Her er nogle t...

---

Integration with search console
- Tracking value of pages

Conversion tracking / 

Rank tracking

Keyword suggestions

Transfer website between organisations
- show the organisation id in the /organization page
- create a button in the bottom of the website settings for "transfer website" 

Delete website option

Make the logo clickable to the /dashboard if logged in and to the front page if not logged in. 

---


---

When the article is created with v3, we need to ensure that the data is matching how it's expected in the v3 function. The v3 function works when the data is grabbed from the db, but the function does not work with the localstorage from the onboarding. 
We need to ensure that the format of the data in the data sent to the v3 model and we need to check the v3 is using the data correctly when from localstorage. 
The data format of the links and cornerstone should be similar to the content in the database. @DBMASTERINFO.md @Onboarding.tsx @index.ts 

---

hook.js:608 You're attempting to animate multiple children within AnimatePresence, but its mode is set to "wait". This will lead to odd visual behaviour. Error Component Stack
    at Onboarding (Onboarding.tsx:400:29)
