# Data Layer Tracking Implementation

## Overview
This document outlines the data layer tracking implementation for the organization page and Stripe conversion data, aligned with Google Analytics 4 (GA4) ecommerce tracking requirements.

## Organization Page Tracking

### Page View Tracking
When a user views the organization page, we track the following data:

```javascript
window.dataLayer.push({
  event: 'organisation_page_view',
  organisation_id: organisation.id,
  organisation_name: organisation.name,
  current_plan: organisation.current_plan,
  credits: organisation.credits,
  next_payment_date: organisation.next_payment_date
});
```

### Stripe Conversion Tracking
We track both successful and abandoned Stripe conversions:

#### Successful Conversion
When a user successfully completes a Stripe checkout (indicated by `?success=true` in the URL):

```javascript
window.dataLayer.push({
  event: 'purchase',
  transaction_id: `T_${organisation?.id}_${Date.now()}`,
  value: organisation?.current_plan === 'hobby' ? 15 : 
         organisation?.current_plan === 'pro' ? 49 : 149,
  currency: 'EUR',
  tax: 0,
  shipping: 0,
  items: [{
    item_id: organisation?.current_plan,
    item_name: `${organisation?.current_plan?.charAt(0).toUpperCase()}${organisation?.current_plan?.slice(1)} Plan`,
    price: organisation?.current_plan === 'hobby' ? 15 : 
           organisation?.current_plan === 'pro' ? 49 : 149,
    quantity: 1,
    item_category: 'Subscription'
  }]
});
```

#### Abandoned Conversion
When a user abandons a Stripe checkout (indicated by `?canceled=true` in the URL):

```javascript
window.dataLayer.push({
  event: 'subscription_abandoned',
  currency: 'EUR',
  value: 0,
  items: [{
    item_id: 'subscription',
    item_name: 'Subscription Plan',
    price: 0,
    quantity: 1,
    item_category: 'Subscription'
  }]
});
```

## Pricing Plans Component Tracking

### Plan Selection Tracking
When a user selects a subscription plan:

```javascript
window.dataLayer.push({
  event: 'select_item',
  item_list_id: 'subscription_plans',
  item_list_name: 'Subscription Plans',
  items: [{
    item_id: plan,
    item_name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
    price: plan === 'hobby' ? 15 : plan === 'pro' ? 49 : 149,
    item_category: 'Subscription',
    quantity: 1
  }]
});
```

### Redirect to Checkout Tracking
When a user is redirected to the Stripe checkout:

```javascript
window.dataLayer.push({
  event: 'redirect_to_checkout',
  currency: 'EUR',
  value: plan === 'hobby' ? 15 : plan === 'pro' ? 49 : 149,
  items: [{
    item_id: plan,
    item_name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
    price: plan === 'hobby' ? 15 : plan === 'pro' ? 49 : 149,
    item_category: 'Subscription',
    quantity: 1
  }]
});
```

### Credit Package Selection Tracking
When a user selects a credit package:

```javascript
window.dataLayer.push({
  event: 'select_item',
  item_list_id: 'credit_packages',
  item_list_name: 'Credit Packages',
  items: [{
    item_id: creditPackage.priceId,
    item_name: `${creditPackage.credits} Article Package`,
    price: creditPackage.price,
    item_category: 'Credits',
    quantity: 1
  }]
});
```

## Onboarding URL Parameters

The onboarding process uses URL parameters to track and control the user's progress through different steps. These parameters are used for both navigation and analytics tracking.

### Step Parameters
The following URL parameters are used to control the onboarding flow:

```javascript
// Map of step parameters to step numbers
const stepMap = {
  'ideas': 2,      // Content idea selection
  'post-draft': 3, // Post draft generation
  'scheduling': 4, // Content scheduling
  'auth': 5,       // Authentication
  'integration': 6 // WordPress integration
};
```

### Implementation Details

1. **URL Parameter Updates**
```javascript
// Helper function to update URL parameters
const updateUrlParams = (params: Record<string, string>) => {
  const searchParams = new URLSearchParams(window.location.search);
  
  // Update each parameter
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    } else {
      searchParams.delete(key);
    }
  });
  
  // Update URL without reloading the page
  window.history.replaceState({}, '', `${window.location.pathname}?${searchParams.toString()}`);
};
```

2. **Step Navigation**
- When a user moves between steps, the URL is updated with the corresponding step parameter
- The application reads these parameters on mount to determine which step to show
- Steps beyond step 4 (scheduling) are marked as "coming soon"

3. **Safety Considerations**
- URL parameters are validated before use
- Invalid or unsupported step parameters default to step 1
- Progress is preserved when navigating between steps
- Previous steps are marked as completed when skipping to a later step

### Example URLs
- Initial onboarding: `/onboarding`
- Content ideas: `/onboarding?step=ideas`
- Post draft: `/onboarding?step=post-draft`
- Scheduling: `/onboarding?step=scheduling`
- Authentication: `/onboarding?step=auth`
- Integration: `/onboarding?step=integration`

### Analytics Integration
These URL parameters can be used in conjunction with the data layer to track:
- Step completion rates
- Drop-off points in the onboarding flow
- Time spent on each step
- User progression through the onboarding process

## Implementation Notes

### Safety Considerations
- All data layer pushes are wrapped in conditional checks (`if (window.dataLayer)`) to prevent errors
- No changes to actual functionality or business logic
- No impact on user experience or application performance

### GA4 Compatibility
- Follows GA4 ecommerce event specifications for compatibility
- Uses standard GA4 events where applicable (`select_item`, `purchase`)
- Uses custom events where needed (`redirect_to_checkout`, `subscription_abandoned`)

### Testing
- Verify data layer events are firing correctly in browser console
- Check GA4 debug view to confirm events are being received
- Ensure no errors in console when data layer is accessed

## Files Modified
- `src/pages/Organisation.tsx`
- `src/components/PricingPlans.tsx` 