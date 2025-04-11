import React, { useEffect } from 'react';

// GTM ID
const GTM_ID = 'GTM-5NV58KFC';

// Extend Window interface to include dataLayer
declare global {
  interface Window {
    dataLayer: any[];
  }
}

// Google Tag Manager component
const GoogleTagManager: React.FC = () => {
  useEffect(() => {
    // Check if user has consented to analytics cookies
    const checkConsent = () => {
      const consentData = localStorage.getItem('gdpr-consent');
      if (consentData) {
        try {
          const consent = JSON.parse(consentData);
          return consent.analytics === true;
        } catch (e) {
          console.error('Error parsing consent data:', e);
          return false;
        }
      }
      return false; // Default to not loading GTM if no consent
    };

    // Only load GTM if user has consented
    if (checkConsent()) {
      // Add GTM script to the document
      const script = document.createElement('script');
      script.innerHTML = `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${GTM_ID}');
      `;
      document.head.appendChild(script);

      // Add noscript iframe for GTM
      const noscript = document.createElement('noscript');
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.googletagmanager.com/ns.html?id=${GTM_ID}`;
      iframe.height = '0';
      iframe.width = '0';
      iframe.style.display = 'none';
      iframe.style.visibility = 'hidden';
      noscript.appendChild(iframe);
      document.body.insertBefore(noscript, document.body.firstChild);

      // Initialize dataLayer
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        'event': 'consent_update',
        'analytics_storage': 'granted',
        'ad_storage': 'denied', // Default to denied, will be updated by GDPR banner if marketing is accepted
      });

      // Cleanup function
      return () => {
        document.head.removeChild(script);
        document.body.removeChild(noscript);
      };
    }
  }, []);

  return null; // This component doesn't render anything
};

export default GoogleTagManager; 