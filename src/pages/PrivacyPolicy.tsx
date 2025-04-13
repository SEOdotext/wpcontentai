import React from 'react';
import PublicNav from '@/components/PublicNav';
import { Shield } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        {/* Header Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center py-1 px-3 mb-4 border border-primary/20 rounded-full bg-primary/5">
            <Shield className="h-4 w-4 text-primary mr-2" />
            <span className="text-sm font-medium text-primary">Your privacy matters</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            How we protect and manage your data in our content garden
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-muted-foreground">
            Last updated: {new Date().toLocaleDateString()}
          </p>

          <h2>Introduction</h2>
          <p>
            At ContentGardener, we take your privacy seriously. This Privacy Policy explains how we collect, use, and safeguard the limited information you provide when using our service. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.
          </p>

          <h2>Information we collect</h2>
          <p>
            We collect minimal information that you provide directly to us:
          </p>
          <ul>
            <li>Email address (for account creation and communication)</li>
            <li>Website URL (for content analysis and generation)</li>
          </ul>
          <p>
            We do not collect or store personal information such as names, addresses, or payment details directly on our servers. Payment processing is handled securely through our payment provider.
          </p>

          <h2>How we use your information</h2>
          <p>
            We use the information we collect to:
          </p>
          <ul>
            <li>Provide and maintain our content generation services</li>
            <li>Process your transactions (through our secure payment provider)</li>
            <li>Send you technical notices and updates about our service</li>
            <li>Respond to your support requests</li>
            <li>Improve our AI models and service quality</li>
          </ul>

          <h2>Data storage and security</h2>
          <p>
            We implement appropriate technical measures to protect the limited information we collect. However, please note that no method of transmission over the Internet or electronic storage is 100% secure.
          </p>

          <h2>Your rights</h2>
          <p>
            You have the right to:
          </p>
          <ul>
            <li>Access the limited information we hold about you</li>
            <li>Request deletion of your account and associated data</li>
            <li>Opt out of marketing communications</li>
          </ul>

          <h2>Cookies and tracking technologies</h2>
          <p>
            We use cookies and similar tracking technologies to track activity on our service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
          </p>

          <h2>Third-party services</h2>
          <p>
            We may employ third-party companies and individuals to facilitate our service, provide service-related services, or assist us in analyzing how our service is used. We do not share personal data with these third parties, as we only collect email addresses for account purposes.
          </p>

          <h2>Content ownership</h2>
          <p>
            When you use our service to generate content, you retain full ownership of the content created. We do not claim any rights to the content generated through our platform. However, we may use anonymized data about your content generation patterns to improve our AI models and service quality.
          </p>

          <h2>Changes to this privacy policy</h2>
          <p>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date at the top of this Privacy Policy.
          </p>

          <h2>Contact us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at:
          </p>
          <p>
            Email: info@contentgardener.ai
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy; 