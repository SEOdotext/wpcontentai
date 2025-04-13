import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/Logo';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, Sparkles, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { SiWordpress } from 'react-icons/si';

const LogoAnimation = () => (
  <motion.svg 
    width="80"
    height="80"
    viewBox="0 0 40 40" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    <motion.path
      d="M8 20C8 13.3726 13.3726 8 20 8C26.6274 8 32 13.3726 32 20C32 26.6274 26.6274 32 20 32C16.6863 32 14 29.3137 14 26C14 22.6863 16.6863 20 20 20"
      stroke="url(#gradient1)"
      strokeWidth="3"
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ 
        pathLength: { duration: 1.2, ease: "easeOut", delay: 0.2 },
        opacity: { duration: 0.01 }
      }}
    />
    <defs>
      <linearGradient id="gradient1" x1="8" y1="8" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#60A5FA" />
        <stop offset="0.5" stopColor="#C084FC" />
        <stop offset="1" stopColor="#F472B6" />
      </linearGradient>
    </defs>
  </motion.svg>
);

const LandingPage = () => {
  const [website, setWebsite] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  const isValidDomain = (domain: string) => {
    // Remove http:// or https:// if present for validation
    const cleanDomain = domain.replace(/^https?:\/\//i, '');
    
    // Basic domain validation regex
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    return domainRegex.test(cleanDomain);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!website) {
      setError('Please enter a website domain');
      return;
    }

    if (!isValidDomain(website)) {
      setError('Please enter a valid website domain (e.g., example.com)');
      return;
    }

    // Format website URL - add https:// if missing
    let formattedUrl = website;
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }
    
    // Store the formatted website URL
    localStorage.setItem('onboardingWebsite', formattedUrl);
    navigate('/onboarding');
  };

  // Apply styles to override any sidebar or parent container styles
  React.useEffect(() => {
    // Find the sidebar wrapper parent element and set its max-width to 100%
    const sidebarWrappers = document.querySelectorAll('.group\\/sidebar-wrapper');
    if (sidebarWrappers.length > 0) {
      sidebarWrappers.forEach(wrapper => {
        const element = wrapper as HTMLElement;
        element.style.maxWidth = '100%';
        element.style.width = '100%';
        element.style.paddingLeft = '0';
        element.style.marginLeft = '0';
        element.style.display = 'block';
      });
    }
    
    return () => {
      // Clean up when component unmounts
      const sidebarWrappers = document.querySelectorAll('.group\\/sidebar-wrapper');
      if (sidebarWrappers.length > 0) {
        sidebarWrappers.forEach(wrapper => {
          const element = wrapper as HTMLElement;
          element.style.maxWidth = '';
          element.style.width = '';
          element.style.paddingLeft = '';
          element.style.marginLeft = '';
          element.style.display = '';
        });
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background" style={{ width: "100vw", maxWidth: "100vw", margin: 0, padding: 0 }}>
      {/* Header */}
      <header className="w-full py-4 px-6 border-b border-border/10 bg-background/98 backdrop-blur-lg">
        <div className="w-full max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo className="scale-110" />
          </div>
          <div className="flex items-center gap-4">
            <Link to="/pricing">
              <Button variant="ghost" className="font-medium">Pricing</Button>
            </Link>
            <Link to="/auth">
              <Button variant="ghost" className="font-medium">Login</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center py-16 px-4 relative overflow-hidden w-full" style={{ maxWidth: "100vw" }}>
        {/* Background elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-1/3 h-1/3 bg-primary/5 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-1/3 h-1/3 bg-primary/5 rounded-full blur-[120px]"></div>
        </div>

        <div className="max-w-4xl w-full mx-auto flex flex-col items-center justify-center">
          <div className="flex flex-col items-center justify-center text-center w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-10 flex justify-center"
            >
              <LogoAnimation />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex justify-center w-full"
            >
              <div className="inline-flex items-center py-1 px-3 mb-4 border border-primary/20 rounded-full bg-primary/5">
                <Sparkles className="h-4 w-4 text-primary mr-2" />
                <span className="text-sm font-medium text-primary">The best content manager you never hired</span>
              </div>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight"
            >
              Fresh posts. <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">No fuss!</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12"
            >
              Finds your voice. Lets your brand flourish.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="mt-12"
            >
              <p className="text-lg font-medium mb-3">Plant your URL. Content grows.</p>
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="yourdomain.com"
                    className={`h-14 text-lg flex-1 ${error ? 'border-red-500' : ''}`}
                    value={website}
                    onChange={(e) => {
                      setWebsite(e.target.value);
                      setError('');
                    }}
                    required
                  />
                  {error && (
                    <p className="text-sm text-red-500 mt-1">{error}</p>
                  )}
                </div>
              </form>
              <div className="mt-6 flex flex-col items-center gap-4">
                <div className="flex items-center justify-center gap-3">
                  <div className="flex items-center gap-1 text-primary/70">
                    <SiWordpress className="h-4 w-4" />
                    <span className="text-xs font-medium">WordPress Ready</span>
                  </div>
                  <div className="flex items-center gap-1 text-primary/70">
                    <Shield className="h-4 w-4" />
                    <span className="text-xs font-medium">GDPR Compliant</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Testimonials */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mt-24 grid md:grid-cols-3 gap-4 bg-muted/30 p-6 rounded-2xl backdrop-blur-sm border border-border/10 w-full"
          >
            {/* Testimonial 1 - Lasse from PageVitals */}
            <div className="flex">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center mr-3">
                <span className="text-primary font-medium">LS</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground italic mb-1">
                  "The AI somehow understands our brand voice perfectly. It generates massive traffic for our site."
                </p>
                <p className="text-xs font-semibold">Lasse Schou, <a href="https://pagevitals.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary">PageVitals</a></p>
              </div>
            </div>

            {/* Testimonial 2 - Theis*/}
            <div className="flex">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center mr-3">
                <span className="text-primary font-medium">TH</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground italic mb-1">
                  "In just 1 week our primary keywords are hitting first page. The content matches our site perfectly."
                </p>
                <p className="text-xs font-semibold">Theis Hofdal, <a href="https://workforceeu.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary">WorkForceEU</a></p>
              </div>
            </div>

            {/* Testimonial 3 - Philip from PredictHire */}
            <div className="flex">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center mr-3">
                <span className="text-primary font-medium">PL</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground italic mb-1">
                  "The seamless WordPress integration and smart scheduling have completely transformed our content workflow. It's like having an extra team member."
                </p>
                <p className="text-xs font-semibold">Philip Leth, <a href="https://predicthire.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary">PredictHire</a></p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-border/10">
        <div className="w-full max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground mb-4 md:mb-0">
              © {new Date().getFullYear()} ContentGardener.ai. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link to="/privacy-policy" className="text-xs text-muted-foreground hover:text-foreground">Privacy Policy</Link>
              <Link to="/terms-of-service" className="text-xs text-muted-foreground hover:text-foreground">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 