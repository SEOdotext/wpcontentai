# Onboarding Code Cleanup

## Overview
The onboarding data transfer logic has been moved to a shared function in `src/api/onboardingImport.ts`. The redundant implementation in `src/pages/Onboarding.tsx` needs to be removed.

## Changes Required

### 1. Code to Remove
Remove the entire `transferDataToDatabase` function implementation in `src/pages/Onboarding.tsx` (approximately lines 1820-1950). This function starts with:

```typescript
// Transfer data to database after successful auth
const transferDataToDatabase = async (userId: string) => {
```

and ends with:

```typescript
  };
```

### 2. Code to Keep
Keep the following code that uses the imported function:

```typescript
// Complete onboarding and go to dashboard
const handleComplete = () => {
  const userId = localStorage.getItem('pending_user_id');
  if (userId) {
    console.log('Transferring data for user:', userId);
    transferDataToDatabase(userId)
      .then(() => {
        sonnerToast("Setup Complete!", {
          description: "You're ready to start creating content."
        });
        navigate('/dashboard');
      })
      .catch(error => {
        console.error('Error transferring data:', error);
        sonnerToast.error("Error completing setup", {
          description: error.message || "Failed to complete setup. Please try again."
        });
      });
  } else {
    console.error('No user ID found for data transfer');
    sonnerToast.error("Setup Error", {
      description: "User ID not found. Please try signing up again."
    });
  }
};
```

### 3. Required Import
Ensure this import remains at the top of the file:
```typescript
import { transferDataToDatabase } from '@/api/onboardingImport';
```

## Why These Changes?
1. Removes code duplication
2. Centralizes data transfer logic in one location
3. Makes maintenance easier
4. Ensures consistent behavior across different parts of the application

## Verification
After making these changes:
1. The onboarding process should still work as before
2. Data transfer should happen when completing onboarding
3. No functionality should be lost
4. The code should be more maintainable

## Note
The shared implementation in `src/api/onboardingImport.ts` handles:
- Getting data from localStorage
- Formatting data for the edge function
- Making the API call
- Handling success/failure
- Clearing localStorage after success
- Showing appropriate toasts 