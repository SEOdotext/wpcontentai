Customer portal stripe

https://billing.stripe.com/p/login/7sI8Ax5iL9rw2OY4gg

We run on credits. 

Every month they are reset to the amount of credits available, when the payment is handled. 

Payment is handled for the organisation. 


---

Buttons
One for managing plans/subscriptions and another for managing payment methods. Since we can't control the specific page in the Stripe Customer Portal directly through the API, we should handle this in the frontend by having two distinct buttons that provide clear actions for users.
Let me help you implement this in your frontend. First, let's look at the current implementation and then add the two buttons:
View Plans & Credits button - This will use the existing portal endpoint
Manage Payment Methods button - This will also use the portal endpoint (since both actions are handled within Stripe's Customer Portal)

Use the Customer Portal for the account and subscription management
Use the stripe checkout for selecting a plan.