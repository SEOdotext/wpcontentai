import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PricingPlansProps {
  currentPlan?: string;
  credits?: number;
  nextPaymentDate?: string;
}

const PricingPlans: React.FC<PricingPlansProps> = ({ 
  currentPlan = 'No active plan', 
  credits = 0, 
  nextPaymentDate 
}) => {
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  const handleBillingPortal = async (type: 'subscription' | 'payment', plan?: 'hobby' | 'pro' | 'agency') => {
    setIsLoadingPortal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('stripe-portal', {
        body: { type, plan },
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
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          <CardTitle>Subscription & Billing</CardTitle>
        </div>
        <CardDescription>
          Choose a plan that fits your needs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan Info */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Current Plan</label>
            <p className="text-2xl font-semibold mt-1.5 capitalize">
              {currentPlan}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Available Credits</label>
            <p className="text-2xl font-semibold mt-1.5">
              {credits} credits
            </p>
          </div>
          {nextPaymentDate && (
            <div>
              <label className="text-sm font-medium">Next Payment</label>
              <p className="text-muted-foreground mt-1.5">
                {new Date(nextPaymentDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Pricing Plans Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Hobby Plan */}
          <div className="border rounded-lg p-6 space-y-4 hover:border-primary/50 transition-colors">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <span>🌱</span>
                <span>Hobby</span>
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">€15</span>
                <span className="text-muted-foreground">/month</span>
              </div>
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
                'Select Hobby'
              )}
            </Button>
          </div>

          {/* Pro Plan */}
          <div className="border rounded-lg p-6 space-y-4 hover:border-primary/50 transition-colors">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <span>🌿</span>
                <span>Pro</span>
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">€49</span>
                <span className="text-muted-foreground">/month</span>
              </div>
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
                <span>Buy Extra Articles: 10 for €20</span>
              </p>
            </div>
            <Button
              onClick={() => handleBillingPortal('subscription', 'pro')}
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
                'Select Pro'
              )}
            </Button>
          </div>

          {/* Agency/Enterprise Plan */}
          <div className="border rounded-lg p-6 space-y-4 bg-primary/5 hover:border-primary/50 transition-colors">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <span>🌳</span>
                <span>Agency / Enterprise</span>
              </h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold">€149</span>
                <span className="text-muted-foreground">/month</span>
              </div>
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
                <span>Buy Extra Articles: 50 for €100</span>
              </p>
            </div>
            <Button
              onClick={() => handleBillingPortal('subscription', 'agency')}
              disabled={isLoadingPortal}
              className="w-full mt-4"
            >
              {isLoadingPortal ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                'Select Agency'
              )}
            </Button>
          </div>
        </div>

        {/* Payment Methods */}
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
      </CardContent>
    </Card>
  );
};

export default PricingPlans; 