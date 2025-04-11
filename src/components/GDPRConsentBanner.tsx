import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';

// Extend Window interface to include dataLayer
declare global {
  interface Window {
    dataLayer: any[];
  }
}

// Cookie consent types
interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

const GDPRConsentBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true, // Always true and disabled
    analytics: false,
    marketing: false,
  });

  // Check if user has already consented
  useEffect(() => {
    const hasConsented = localStorage.getItem('gdpr-consent');
    if (!hasConsented) {
      setShowBanner(true);
    }
  }, []);

  // Handle accepting all cookies
  const handleAcceptAll = () => {
    setPreferences({
      necessary: true,
      analytics: true,
      marketing: true,
    });
    saveConsent({
      necessary: true,
      analytics: true,
      marketing: true,
    });
    setShowBanner(false);
  };

  // Handle saving preferences
  const handleSavePreferences = () => {
    saveConsent(preferences);
    setShowPreferences(false);
    setShowBanner(false);
  };

  // Save consent to localStorage
  const saveConsent = (consent: CookiePreferences) => {
    localStorage.setItem('gdpr-consent', JSON.stringify(consent));
    
    // If analytics is accepted, ensure GTM is enabled
    if (consent.analytics) {
      // Enable GTM
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        'event': 'consent_update',
        'analytics_storage': 'granted',
        'ad_storage': consent.marketing ? 'granted' : 'denied',
      });
    } else {
      // Disable GTM
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        'event': 'consent_update',
        'analytics_storage': 'denied',
        'ad_storage': 'denied',
      });
    }
  };

  // Handle preference change
  const handlePreferenceChange = (key: keyof CookiePreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Main banner */}
      <AnimatePresence>
        {showBanner && !showPreferences && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border p-4 shadow-lg"
          >
            <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                <p>
                  We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. 
                  By clicking "Accept All", you consent to our use of cookies.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setShowPreferences(true)}>
                  Customize
                </Button>
                <Button onClick={handleAcceptAll}>
                  Accept All
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preferences dialog */}
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cookie Preferences</DialogTitle>
            <DialogDescription>
              Manage your cookie preferences below. You can change these settings at any time.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="necessary" 
                checked={preferences.necessary} 
                disabled 
              />
              <div className="space-y-1">
                <Label htmlFor="necessary" className="font-medium">Necessary Cookies</Label>
                <p className="text-sm text-muted-foreground">
                  These cookies are essential for the website to function properly. They cannot be disabled.
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="analytics" 
                checked={preferences.analytics} 
                onCheckedChange={() => handlePreferenceChange('analytics')}
              />
              <div className="space-y-1">
                <Label htmlFor="analytics" className="font-medium">Analytics Cookies</Label>
                <p className="text-sm text-muted-foreground">
                  These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="marketing" 
                checked={preferences.marketing} 
                onCheckedChange={() => handlePreferenceChange('marketing')}
              />
              <div className="space-y-1">
                <Label htmlFor="marketing" className="font-medium">Marketing Cookies</Label>
                <p className="text-sm text-muted-foreground">
                  These cookies are used to track visitors across websites. The intention is to display ads that are relevant and engaging.
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreferences(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreferences}>
              Save Preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GDPRConsentBanner; 