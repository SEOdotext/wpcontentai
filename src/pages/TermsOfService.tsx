import React from 'react';
import PublicNav from '@/components/PublicNav';
import { ScrollText } from 'lucide-react';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center py-1 px-3 mb-4 border border-primary/20 rounded-full bg-primary/5">
            <ScrollText className="h-4 w-4 text-primary mr-2" />
            <span className="text-sm font-medium text-primary">Our garden rules</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The guidelines for growing with ContentGardener
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <h2>Agreement to terms</h2>
          <p>
            By accessing or using ContentGardener, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, then you may not access the service.
          </p>

          <h2>Description of service</h2>
          <p>
            ContentGardener provides AI-powered content generation tools that help users create, manage, and optimize content for their websites. Our service includes content analysis, generation, and WordPress integration features.
          </p>

          <h2>User accounts</h2>
          <p>
            When you create an account with us, you must provide accurate, complete, and current information. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account.
          </p>
          <p>
            You are responsible for safeguarding the password that you use to access the service and for any activities or actions under your password.
          </p>

          <h2>Subscription and payments</h2>
          <p>
            Some parts of the service are billed on a subscription basis. You will be billed in advance on a recurring and periodic basis, depending on the type of subscription plan you select.
          </p>
          <p>
            At the end of each period, your subscription will automatically renew under the same conditions unless you cancel it or ContentGardener cancels it.
          </p>

          <h2>Free trial</h2>
          <p>
            We may, at our sole discretion, offer a subscription with a free trial for a limited period of time. You may be required to enter your billing information to sign up for the free trial.
          </p>
          <p>
            If you do not cancel the subscription before the free trial period ends, you will be automatically charged the applicable subscription fees for the type of subscription you selected.
          </p>

          <h2>Content and conduct</h2>
          <p>
            You are responsible for all content that you generate, post, or display through the service. You agree not to use the service to:
          </p>
          <ul>
            <li>Generate content that is illegal, harmful, threatening, abusive, harassing, defamatory, or invasive of privacy</li>
            <li>Impersonate any person or entity</li>
            <li>Interfere with or disrupt the service or servers connected to the service</li>
            <li>Attempt to gain unauthorized access to any portion of the service</li>
          </ul>

          <h2>Intellectual property</h2>
          <p>
            The service and its original content, features, and functionality are owned by ContentGardener and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
          </p>
          <p>
            Content generated through our service is owned by you. We may only use your generated content in a generic, aggregated way to improve our AI models and service quality. We will never use your specific content in a way that could identify you or your business.
          </p>

          <h2>Termination</h2>
          <p>
            We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever, including without limitation if you breach the Terms.
          </p>

          <h2>Limitation of liability</h2>
          <p>
            In no event shall ContentGardener, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the service.
          </p>

          <h2>Disclaimer</h2>
          <p>
            Your use of the service is at your sole risk. The service is provided on an "AS IS" and "AS AVAILABLE" basis. The service is provided without warranties of any kind, whether express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement or course of performance.
          </p>

          <h2>Governing law</h2>
          <p>
            These Terms shall be governed and construed in accordance with the laws of Denmark, without regard to its conflict of law provisions.
          </p>

          <h2>Changes to terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect.
          </p>

          <h2>Contact us</h2>
          <p>
            If you have any questions about these Terms, please contact us at:
          </p>
          <p>
            Email: info@contentgardener.ai
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService; 