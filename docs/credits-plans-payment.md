Customer portal stripe

https://billing.stripe.com/p/login/7sI8Ax5iL9rw2OY4gg

We run on credits. 


Add organisation: (w. 14 day free trial and 5 credits) - cc required?
Add a credits column to the organisations table if it doesn't exist, with a default value of 5
Update any existing organizations that don't have credits to have 5 credits
Create a trigger that ensures any new organizations get 5 credits by default if not explicitly specified

---

Monthly credit reset
Every month we "reset" the plans so that the user has the amount of credits in their package. Handled when the payment is completed. 

Notice: Payment is handled for the organisation. 

If no payment plan, set the new credit to 1 (our free plan generates 1 article pr. month, without marketing for it...)

---

Buttons
DONE: 
One for managing plans/subscriptions and another for managing payment methods. Since we can't control the specific page in the Stripe Customer Portal directly through the API, we should handle this in the frontend by having two distinct buttons that provide clear actions for users.
Let me help you implement this in your frontend. First, let's look at the current implementation and then add the two buttons:
View Plans & Credits button - This will use the existing portal endpoint
Manage Payment Methods button - This will also use the portal endpoint (since both actions are handled within Stripe's Customer Portal)

Use the Customer Portal for the account and subscription management
Use the stripe checkout for selecting a plan.

---

Users buying 


🌱
Hobby
€15
/month
✓
5 Articles per Month

✓
1 Website

✓
100 Pages Max Indexing

✓
Standard AI Models

Select Hobby
🌿
Pro
€49
/month
✓
15 Articles per Month

✓
1 Website (+€20 per extra)

✓
500 Pages Max Indexing

✓
Advanced AI Models

→
Buy Extra Articles: 10 for €20

Select Pro
🌳
Agency / Enterprise
€149
/month
✓
50 Articles per Month

✓
Unlimited Websites

✓
Unlimited Pages Indexing

✓
Advanced AI Models

→
Buy Extra Articles: 50 for €100

Select Agency