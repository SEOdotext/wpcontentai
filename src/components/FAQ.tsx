import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FAQItemProps {
  question: string;
  answer: React.ReactNode;
  emoji?: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, emoji }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-border/10 py-4">
      <button
        className="flex justify-between items-center w-full text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-medium flex items-center gap-2">
          {emoji && <span className="text-xl">{emoji}</span>}
          <span>{question}</span>
        </h3>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pt-4 text-muted-foreground">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface FAQProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

const FAQ: React.FC<FAQProps> = ({ 
  title = "🌿 ContentGardener — FAQ", 
  subtitle = "Where AI meets green thumbs and good vibes.",
  className = ""
}) => {
  return (
    <div className={`max-w-3xl mx-auto ${className}`}>
      {title && <h2 className="text-3xl font-bold text-center mb-4">{title}</h2>}
      {subtitle && <p className="text-xl text-muted-foreground text-center mb-12">{subtitle}</p>}
      
      <div className="space-y-1">
        <FAQItem 
          emoji="🧠"
          question="How does ContentGardener know what to write?"
          answer={
            <p>
              It surfs your site the second you plug it in — no setup, no uploads, no prep. It reads the flow, the tone, the words between the words. Like a plant pulling CO₂ from the air, it thrives on signals you didn't even know you were sending.
            </p>
          }
        />
        
        <FAQItem 
          emoji="🌬️"
          question="What does it use from my site?"
          answer={
            <div>
              <p className="mb-2">Everything that's already live.</p>
              <p className="mb-2">
                From headers to CTAs, from dusty footers to overlooked pages — if it's out there, ContentGardener turns it into compost for your next great piece of content. It's low-key genius. High-key useful.
              </p>
            </div>
          }
        />
        
        <FAQItem 
          emoji="🛠️"
          question="Do I need to upload anything?"
          answer={
            <p>
              Nope. No files, no product feeds, no brand manuals. You just breathe — ContentGardener pulls it from the air and starts planting. (But hey, if you want to feed it a sitemap or some tone examples, it'll love you even more.)
            </p>
          }
        />
        
        <FAQItem 
          emoji="🗣️"
          question="How will the content match our brand tone?"
          answer={
            <p>
              It learns your voice like a good ghostwriter. Serious or cheeky, premium or punchy — it picks it up, locks it in, and mirrors it across every word. You'll swear someone from your team wrote it.
            </p>
          }
        />
        
        <FAQItem 
          emoji="🌱"
          question="Does it just reword what's already there?"
          answer={
            <p>
              Nah, it doesn't just regurgitate. It grows new stuff. Fresh intros, clean blurbs, clever CTAs, new angles, and smart page suggestions — all rooted in what your brand already stands for.
            </p>
          }
        />
        
        <FAQItem 
          emoji="✍️"
          question="What kind of content does it actually create?"
          answer={
            <div>
              <ul className="list-none space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Landing pages that sound like humans wrote them</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Campaign-ready intros and hooks</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>On-brand CTAs and microcopy</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Suggestions for pages you should have</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Modular sections you can plant anywhere</span>
                </li>
              </ul>
              <p className="mt-2">
                All fully LLM-O-ready — built for search that understands meaning, not just keywords.
              </p>
            </div>
          }
        />
        
        <FAQItem 
          emoji="🚀"
          question="What happens during onboarding?"
          answer={
            <div>
              <p>
                You'll get first drafts in minutes. They're lightweight seedlings — fast, scrappy, and shockingly on-point.
              </p>
              <p className="mt-2">
                Then, as you guide it with edits or a sitemap, it deepens its roots and blooms into something actually publishable.
              </p>
            </div>
          }
        />
        
        <FAQItem 
          emoji="🧠"
          question="Does it think — or just write?"
          answer={
            <p>
              It thinks. It maps your site, sees your content gaps, and surfaces ideas you've probably missed. It's not just a writer. It's a gardener with opinions.
            </p>
          }
        />
        
        <FAQItem 
          emoji="📈"
          question="Will it help with SEO?"
          answer={
            <div>
              <p className="mb-2">
                Yes — but not in the "10 best shoes for Q4" way. It's built for real relevance:
              </p>
              <ul className="list-none space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Semantic structure</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>LLM-O (Large Language Model Optimization)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>STS (Search-to-Serve) readiness</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Natural readability for both bots and humans</span>
                </li>
              </ul>
              <p className="mt-2">
                No stuffing. No spam. Just content that makes sense — and performs.
              </p>
            </div>
          }
        />
        
        <FAQItem 
          emoji="🔍"
          question="Will it tell me what to write next?"
          answer={
            <div>
              <p>
                Yup. It spots what's missing in your content garden — underused categories, thin sections, unloved pages — and suggests what to plant next. Then writes it.
              </p>
            </div>
          }
        />
        
        <FAQItem 
          emoji="📜"
          question="Who owns the content?"
          answer={
            <p>
              You do. Full stop. We don't use it, reuse it, or train on it. Your garden, your rules.
            </p>
          }
        />
        
        <FAQItem 
          emoji="🌊"
          question="Who's behind this thing?"
          answer={
            <div>
              <p className="mb-2">
                A small, salty team with deep roots in SaaS, scraping, and scaling.
              </p>
              <ul className="list-none space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Lasse launched Mouseflow — a multi-million-dollar analytics platform used worldwide</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Phil has built 10+ startups and hundreds of custom tools — from automation to growth machines</span>
                </li>
              </ul>
              <p className="mt-2">
                We've scaled tools to 100,000+ users, scraped half the web, and now we're turning all that energy into one beautiful thing: content that grows.
              </p>
            </div>
          }
        />
      </div>
    </div>
  );
};

export default FAQ; 