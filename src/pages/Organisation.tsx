import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useOrganisation } from '@/context/OrganisationContext';
import { Helmet } from 'react-helmet-async';
import { Building2, Users, Globe, Pencil, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Header from '@/components/Header';
import AppSidebar from '@/components/Sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import PricingPlans from '@/components/PricingPlans';

const Organisation = () => {
  const { organisation, updateOrganisation } = useOrganisation();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(organisation?.name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdateName = async () => {
    if (!organisation?.id || !newName.trim() || newName === organisation.name) {
      setIsEditing(false);
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await updateOrganisation(organisation.id, { name: newName.trim() });
      if (success) {
        setIsEditing(false);
      } else {
        setNewName(organisation.name);
      }
    } catch (error) {
      console.error('Error updating organisation name:', error);
      toast.error('Failed to update organisation name');
      setNewName(organisation.name);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 px-4 py-6 overflow-y-auto">
            <div className="max-w-6xl mx-auto space-y-6">
              <Helmet>
                <title>Organisation Settings | ContentGardener.ai</title>
              </Helmet>

              <Separator />

              <div className="grid gap-6">
                {/* Organisation Info */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      <CardTitle>Organisation Information</CardTitle>
                    </div>
                    <CardDescription>
                      View and manage your organisation details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Organisation Name</label>
                      <div className="mt-1.5">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <Input
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              placeholder="Enter organisation name"
                              className="max-w-md"
                            />
                            <Button 
                              onClick={handleUpdateName}
                              disabled={isSubmitting || !newName.trim() || newName === organisation?.name}
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                'Save'
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsEditing(false);
                                setNewName(organisation?.name || '');
                              }}
                              disabled={isSubmitting}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <p className="text-2xl font-semibold">{organisation?.name}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setNewName(organisation?.name || '');
                                setIsEditing(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Created At</label>
                      <p className="text-muted-foreground mt-1.5">
                        {organisation?.created_at ? new Date(organisation.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Subscription Management */}
                <PricingPlans 
                  currentPlan={(organisation as any)?.current_plan}
                  credits={(organisation as any)?.credits}
                  nextPaymentDate={(organisation as any)?.next_payment_date}
                />

                {/* Websites Quick Access */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      <CardTitle>Websites</CardTitle>
                    </div>
                    <CardDescription>
                      Manage your organisation's websites
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate('/websites')}
                    >
                      View All Websites
                    </Button>
                  </CardContent>
                </Card>

                {/* Team Members - Placeholder for future feature */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      <CardTitle>Team Members</CardTitle>
                    </div>
                    <CardDescription>
                      Manage your team members and their website access
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate('/team-management')}
                    >
                      Manage Team Members
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Organisation;