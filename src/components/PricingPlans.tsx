import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface PricingPlansProps {
  currentPlan?: string;
  credits?: number;
  nextPaymentDate?: string;
  isPricingPage?: boolean;
}

// Credit package options
const CREDIT_PACKAGES = {
  pro: {
    priceId: 'price_1RBVpYRGhl9iFwDNYmIXpeix',  // 10 Article Package €20
    credits: 10,
    price: 20
  },
  agency: {
    priceId: 'price_1RBVd3RGhl9iFwDNCuJUImV7',  // 50 Article Package €100
    credits: 50,
    price: 100
  }
};

const PricingPlans: React.FC<PricingPlansProps> = ({ 
  currentPlan = 'No active plan', 
  credits = 0, 
  nextPaymentDate,
  isPricingPage = false
}) => {
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  const handleBillingPortal = async (type: 'subscription' | 'payment', plan?: 'hobby' | 'pro' | 'agency', includeCredits: boolean = false) => {
    setIsLoadingPortal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      // Track subscription selection in data layer
      if (window.dataLayer) {
        // Track subscription selection
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

        // Track redirect to checkout
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

        // If credits are included, track them as part of the selection
        if (includeCredits) {
          const creditPackage = plan === 'pro' ? CREDIT_PACKAGES.pro : CREDIT_PACKAGES.agency;
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
        }
      }

      // Hardcode the credit package IDs for each plan
      let creditPackageId;
      if (plan === 'pro') {
        creditPackageId = 'price_1RBVpYRGhl9iFwDNYmIXpeix'; // 10 Article Package €20
      } else if (plan === 'agency') {
        creditPackageId = 'price_1RBVd3RGhl9iFwDNCuJUImV7'; // 50 Article Package €100
      }

      const { data, error } = await supabase.functions.invoke('stripe-portal', {
        body: { 
          type, 
          plan,
          includeCredits,
          creditPackageId: includeCredits ? creditPackageId : undefined
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (error) throw error;
      if (!data?.url) throw new Error('No portal URL returned');
      
      setIsLoadingPortal(false);
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error accessing billing portal:', error);
      toast.error('Failed to access billing portal');
      setIsLoadingPortal(false);
    }
  };

  return (
    <Card className="border-primary/10">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>Choose your content garden</CardTitle>
        </div>
        <CardDescription>
          Pick the plan that grows with you
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan Info */}
        {currentPlan !== 'No active plan' && (
          <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
            <div>
              <label className="text-sm font-medium">Your current garden</label>
              <p className="text-2xl font-semibold mt-1.5 capitalize">
                {currentPlan}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Seeds in your pocket</label>
              <p className="text-2xl font-semibold mt-1.5">
                {credits} credits
              </p>
            </div>
            {nextPaymentDate && (
              <div>
                <label className="text-sm font-medium">Next harvest</label>
                <p className="text-muted-foreground mt-1.5">
                  {new Date(nextPaymentDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pricing Plans Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Hobby Plan */}
          <div className="border rounded-lg p-6 space-y-4 hover:border-primary/50 transition-colors hover:shadow-md">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <span>🌱</span>
                <span>Hobby</span>
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">€15</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">Perfect for small gardens</p>
            </div>
            <div className="space-y-2">
              <p className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                <span>5 Articles per Month</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                <span>1 Website</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                <span>100 Pages Max Indexing</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                <span>Standard AI Models</span>
              </p>
            </div>
            {isPricingPage ? (
              <Button asChild variant="outline" className="w-full mt-4">
                <Link to="/">
                  Plant with Hobby
                </Link>
              </Button>
            ) : (
              <Button
                onClick={() => handleBillingPortal('subscription', 'hobby')}
                disabled={isLoadingPortal}
                variant="outline"
                className="w-full mt-4"
              >
                {isLoadingPortal ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Plant with Hobby'
                )}
              </Button>
            )}
          </div>

          {/* Pro Plan */}
          <div className="border rounded-lg p-6 space-y-4 hover:border-primary/50 transition-colors hover:shadow-md relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <div className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                Most Popular
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <span>🌿</span>
                <span>Pro</span>
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">€49</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">For growing content gardens</p>
            </div>
            <div className="space-y-2">
              <p className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                <span>15 Articles per Month</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                <span>1 Website (+€20 per extra)</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                <span>500 Pages Max Indexing</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                <span>Advanced AI Models</span>
              </p>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>→</span>
                <span>Add 10 extra articles for €20</span>
              </p>
            </div>
            {isPricingPage ? (
              <Button asChild className="w-full mt-4">
                <Link to="/">
                  Grow with Pro
                </Link>
              </Button>
            ) : (
              <Button
                onClick={() => handleBillingPortal('subscription', 'pro', true)}
                disabled={isLoadingPortal}
                className="w-full mt-4"
              >
                {isLoadingPortal ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Grow with Pro'
                )}
              </Button>
            )}
          </div>

          {/* Agency/Enterprise Plan */}
          <div className="border rounded-lg p-6 space-y-4 bg-primary/5 hover:border-primary/50 transition-colors hover:shadow-md">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <span>🌳</span>
                <span>Agency / Enterprise</span>
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">€149</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">For content forests</p>
            </div>
            <div className="space-y-2">
              <p className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                <span>50 Articles per Month</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                <span>Unlimited Websites</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                <span>Unlimited Pages Indexing</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-primary">✓</span>
                <span>Advanced AI Models</span>
              </p>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>→</span>
                <span>Add 50 extra articles for €100</span>
              </p>
            </div>
            {isPricingPage ? (
              <Button asChild variant="outline" className="w-full mt-4">
                <Link to="/">
                  Scale with Agency
                </Link>
              </Button>
            ) : (
              <Button
                onClick={() => handleBillingPortal('subscription', 'agency', true)}
                disabled={isLoadingPortal}
                className="w-full mt-4"
              >
                {isLoadingPortal ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Scale with Agency'
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Payment Methods */}
        {!isPricingPage && (
          <div className="pt-4">
            <Button 
              variant="outline"
              className="w-full"
              onClick={() => handleBillingPortal('payment')}
              disabled={isLoadingPortal}
            >
              {isLoadingPortal ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Manage Payment Methods'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PricingPlans; 