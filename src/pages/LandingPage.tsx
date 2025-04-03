import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Logo } from '@/components/Logo';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const navigate = useNavigate();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (website) {
      // Store the website URL in localStorage or state management
      localStorage.setItem('onboardingWebsite', website);
      // Navigate to onboarding flow
      navigate('/onboarding');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="w-full py-4 px-6 border-b border-border/10 bg-background/98 backdrop-blur-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo className="scale-110" />
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" className="font-medium">Login</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center py-16 px-4 relative overflow-hidden">
        {/* Background elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-1/3 h-1/3 bg-primary/5 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-1/3 h-1/3 bg-primary/5 rounded-full blur-[120px]"></div>
        </div>

        <div className="container max-w-5xl mx-auto">
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-10"
            >
              <LogoAnimation />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="inline-flex items-center py-1 px-3 mb-4 border border-primary/20 rounded-full bg-primary/5">
                <Sparkles className="h-4 w-4 text-primary mr-2" />
                <span className="text-sm font-medium text-primary">AI-powered WordPress Content</span>
              </div>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight"
            >
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Tailored content</span> that knows your website
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12"
            >
              Just enter your website URL. Our AI analyzes your existing content, tone, and audience to create perfectly matched posts that feel like you wrote them yourself.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="w-full max-w-lg mx-auto"
            >
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="url"
                  placeholder="Enter your website URL"
                  className="h-14 text-lg flex-1"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  required
                />
                <Button type="submit" size="lg" className="h-14 px-8 text-base font-medium">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </form>
              <p className="mt-3 text-sm text-muted-foreground">
                No credit card required • Free 14-day trial • No code needed
              </p>
            </motion.div>
          </div>

          {/* Testimonials */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mt-24 grid md:grid-cols-3 gap-4 bg-muted/30 p-6 rounded-2xl backdrop-blur-sm border border-border/10"
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
                <p className="text-xs font-semibold">Lasse Schou, PageVitals</p>
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
                <p className="text-xs font-semibold">Theis Hofdal, WorkForceEU</p>
              </div>
            </div>

            {/* Testimonial 3 - Thomas from denimhunters */}
            <div className="flex">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center mr-3">
                <span className="text-primary font-medium">TS</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground italic mb-1">
                  "It's like the AI reads our entire site. The content understanding is truly incredible."
                </p>
                <p className="text-xs font-semibold">Thomas Stege, DenimHunters</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-border/10">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-muted-foreground mb-4 md:mb-0">
              © {new Date().getFullYear()} ContentGardener.ai. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-xs text-muted-foreground hover:text-foreground">Privacy Policy</a>
              <a href="#" className="text-xs text-muted-foreground hover:text-foreground">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 