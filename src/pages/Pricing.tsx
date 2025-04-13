import React from 'react';
import PricingPlans from '@/components/PricingPlans';
import FAQ from '@/components/FAQ';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, AlertTriangle, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicNav from '@/components/PublicNav';

const Pricing: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <div className="container mx-auto px-4 py-16">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center py-1 px-3 mb-4 border border-primary/20 rounded-full bg-primary/5">
            <Sparkles className="h-4 w-4 text-primary mr-2" />
            <span className="text-sm font-medium text-primary">Simple pricing, powerful results</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">Grow your content garden</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan for your content needs. All plans include our AI-powered content generation tools.
          </p>
        </div>

        {/* Pricing Plans */}
        <div className="max-w-6xl mx-auto">
          <PricingPlans isPricingPage={true} />
        </div>

        {/* FAQ Section */}
        <div className="mt-24">
          <FAQ 
            title="🌿 ContentGardener — FAQ" 
            subtitle="Where AI meets green thumbs and good vibes."
          />
        </div>

        {/* Meet the Team Section */}
        <div className="mt-24 max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center py-1 px-3 mb-4 border border-primary/20 rounded-full bg-primary/5">
            <Users className="h-4 w-4 text-primary mr-2" />
            <span className="text-sm font-medium text-primary">Meet the salty crew</span>
          </div>
          <h2 className="text-3xl font-bold mb-6">The brains behind the garden</h2>
          <div className="bg-card p-8 rounded-lg border border-border shadow-sm">
            <p className="text-lg mb-4">
              Founded by Phil, a former multinational corporation CEO and partner in an international digital agency. Now semi-retired, building this hobby project because he likes results, not writing.
            </p>
            <p className="text-muted-foreground mb-4">
              We're a small, salty team with deep roots in SaaS, scraping, scaling, and surfing. 
              We've combined our expertise to create a tool that grows your content while you catch waves or go plant something in a real garden. Your time saved, your rules...
            </p>
            <p className="text-sm text-muted-foreground italic">
              "SEO articles, LinkedIn posts, blogs... Relevant constant content drives growth, but let's be honest: for most of us, it's just a guilt-inducing chore we either avoid or outsource badly."
            </p>
            <div className="mt-4">
              <a 
                href="https://www.linkedin.com/in/philipleth/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Connect with Phil on LinkedIn
              </a>
            </div>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="mt-16 max-w-3xl mx-auto p-6 border border-destructive/20 rounded-lg bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Legal Disclaimer</h3>
              <p className="text-sm text-muted-foreground mb-3">
                ContentGardener provides AI-powered content generation tools. As the client, you are solely responsible for:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 mb-3 list-disc pl-5">
                <li>Reviewing, editing, and approving all AI-generated content before publication</li>
                <li>Ensuring all content complies with applicable laws, regulations, and industry standards</li>
                <li>Verifying the accuracy, truthfulness, and appropriateness of all content</li>
                <li>Obtaining necessary permissions for any third-party content or references</li>
                <li>Addressing any copyright, trademark, or intellectual property concerns</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                By using ContentGardener, you acknowledge that we make no warranties about the content generated and accept full responsibility for its use. We recommend having your legal team review this disclaimer and our terms of service.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to plant some content?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join the growing community of content creators who trust our platform
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link to="/auth">
              Start your free trial <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pricing; 