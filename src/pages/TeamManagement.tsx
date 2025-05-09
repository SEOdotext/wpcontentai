import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Helmet } from 'react-helmet-async';
import { Users, UserPlus, Trash2, Loader2, Shield, Globe } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Header from '@/components/Header';
import AppSidebar from '@/components/Sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useOrganisation } from '@/context/OrganisationContext';
import { useWebsites } from '@/context/WebsitesContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import Supabase config
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Define types
interface Invitation {
  id: string;
  email: string;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  expires_at: string;
}

interface TeamMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'member';
  created_at: string;
  organisation_id: string;
  website_access?: WebsiteAccessResponse[];
}

interface WebsiteAccessResponse {
  id: string;
  user_id: string;
  website_id: string;
  created_at: string;
  website: {
    id: string;
    name: string;
    url: string;
  };
}

const TeamManagement = () => {
  const { organisation } = useOrganisation();
  const { websites } = useWebsites();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [websiteAccess, setWebsiteAccess] = useState<WebsiteAccessResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [selectedWebsites, setSelectedWebsites] = useState<string[]>([]);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isUpdatingAccess, setIsUpdatingAccess] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [existingUserEmail, setExistingUserEmail] = useState('');
  const [isAddingExistingUser, setIsAddingExistingUser] = useState(false);
  const [activeTab, setActiveTab] = useState<'invite' | 'add'>('add');
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'member' | null>(null);
  const [resendingMemberId, setResendingMemberId] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  // Fetch the current user's role
  const fetchCurrentUserRole = async () => {
    if (!organisation?.id) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from('organisation_memberships')
        .select('role')
        .eq('member_id', user.id)
        .eq('organisation_id', organisation.id)
        .single();
      
      if (error) {
        console.error('Error fetching current user role:', error);
        return;
      }
      
      setCurrentUserRole(data.role as 'admin' | 'member');
      
      // Store the user's role in localStorage for access across the app
      localStorage.setItem('userRole', data.role);
    } catch (error) {
      console.error('Error in fetchCurrentUserRole:', error);
    }
  };
  
  // Fetch team members and website access
  const fetchTeamData = async () => {
    if (!organisation?.id) return;
    
    setLoading(true);
    try {
      console.log('Fetching team members for organisation:', organisation.id);
      
      // Call the RPC function to get team data - this handles all the data fetching in one go
      const { data, error } = await supabase.rpc('get_team_data', {
        organisation_id: organisation.id
      });
      
      if (error) {
        console.error('Error fetching team data:', error);
        throw error;
      }
      
      console.log('Team data response:', JSON.stringify(data, null, 2));
      
      if (!data || !data.team_members) {
        console.log('No team members found');
        setTeamMembers([]);
        setWebsiteAccess([]);
        return;
      }
      
      // Set team members
      const teamMembersData = data.team_members as TeamMember[];
      console.log('Team members data:', JSON.stringify(teamMembersData, null, 2));
      setTeamMembers(teamMembersData);
      
      // Extract and set website access
      const accessData: WebsiteAccessResponse[] = [];
      
      // Process website access data from team members
      teamMembersData.forEach(member => {
        if (member.website_access && Array.isArray(member.website_access)) {
          member.website_access.forEach((access: WebsiteAccessResponse) => {
            // Add user_id to each access entry if not already present
            accessData.push({
              ...access,
              user_id: member.id // Ensure user_id is set correctly
            });
          });
        }
      });
      
      console.log('Processed website access:', accessData);
      setWebsiteAccess(accessData);
      
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };
  
  // Add fetchInvitations function
  const fetchInvitations = async () => {
    if (!organisation?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('organisation_id', organisation.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast.error('Failed to load invitations');
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchCurrentUserRole();
    fetchTeamData();
    fetchInvitations();
  }, [organisation?.id]);

  // Invite a new team member
  const handleInviteTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organisation?.id || currentUserRole !== 'admin') return;

    try {
      console.log('Starting invitation process:', { email, role, organisation_id: organisation.id });

      // Call the Edge Function to handle the invitation
      const response = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          email: email.trim(),
          organisation_id: organisation.id,
          role: role
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invitation');
      }

      const { data } = await response.json();
      console.log('Invitation sent successfully:', data);

      toast.success('Team member invited successfully');
      
      // Reset form
      setEmail('');
      setRole('member');
      setSelectedWebsites([]);
      setIsInviteDialogOpen(false);

      // Refresh the team list
      await fetchTeamData();
    } catch (error) {
      console.error('Error in handleInviteTeamMember:', error);
      toast.error('Failed to invite team member');
    }
  };

  // Update member role
  const handleUpdateRole = async (memberId: string, newRole: 'admin' | 'member') => {
    if (!organisation?.id || currentUserRole !== 'admin') return;
    
    setIsUpdatingRole(true);
    try {
      console.log(`Updating role for member ${memberId} to ${newRole} in org ${organisation.id}`);
      
      // Use the RPC function to update the role
      const { data, error } = await supabase.rpc('update_user_role', {
        p_user_id: memberId,
        p_organisation_id: organisation.id,
        p_new_role: newRole
      });
      
      console.log('Response from update_user_role:', { data, error });
      
      if (error) {
        console.error('Error calling update_user_role:', error);
        throw error;
      }
      
      if (data && data.status === 'success') {
        toast.success('Member role updated successfully. Reloading...');
        
        // Force a full page reload to ensure we get the latest data
        window.location.reload();
      } else {
        console.error('Function returned error:', data);
        toast.error((data && data.message) || 'Failed to update member role');
      }
    } catch (error) {
      console.error('Error updating member role:', error);
      toast.error('Failed to update member role');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Update website access
  const handleUpdateWebsiteAccess = async () => {
    if (!selectedMember || currentUserRole !== 'admin') return;
    
    setIsUpdatingAccess(true);
    try {
      // First, remove all existing access
      const { error: deleteError } = await supabase
        .from('website_access')
        .delete()
        .eq('user_id', selectedMember.id);
      
      if (deleteError) throw deleteError;
      
      // Then add new access
      if (selectedWebsites.length > 0) {
        const accessEntries = selectedWebsites.map(websiteId => ({
          user_id: selectedMember.id,
          website_id: websiteId
        }));
        
        const { data: newAccess, error: insertError } = await supabase
          .from('website_access')
          .insert(accessEntries)
          .select(`
            id,
            user_id,
            website_id,
            created_at
          `);
        
        if (insertError) throw insertError;
        
        // Fetch website details
        const websiteIds = [...new Set(newAccess.map(a => a.website_id))];
        
        const { data: websiteDetails, error: websiteError } = await supabase
          .from('websites')
          .select('id, name, url')
          .in('id', websiteIds);
        
        if (websiteError) throw websiteError;
        
        // Combine the data
        const accessWithWebsites = newAccess.map(a => ({
          ...a,
          website: websiteDetails?.find(w => w.id === a.website_id)
        }));
        
        // Update local state
        setWebsiteAccess(prev => {
          const filtered = prev.filter(access => access.user_id !== selectedMember.id);
          return [...filtered, ...accessWithWebsites];
        });
      } else {
        // Just update local state to remove access
        setWebsiteAccess(prev => 
          prev.filter(access => access.user_id !== selectedMember.id)
        );
      }
      
      toast.success('Website access updated successfully');
      setIsInviteDialogOpen(false);
    } catch (error) {
      console.error('Error updating website access:', error);
      toast.error('Failed to update website access');
    } finally {
      setIsUpdatingAccess(false);
    }
  };

  // Remove team member
  const handleRemoveTeamMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    if (!organisation?.id || currentUserRole !== 'admin') return;
    
    try {
      // Use the new RPC function to remove the user from the organization
      const { data, error } = await supabase.rpc('remove_user_from_organisation', {
        p_user_id: memberId,
        p_organisation_id: organisation.id
      });
      
      if (error) throw error;
      
      if (data && data.status === 'success') {
        // Update local state
        setTeamMembers(prev => prev.filter(member => member.id !== memberId));
        setWebsiteAccess(prev => prev.filter(access => access.user_id !== memberId));
        
        toast.success('Team member removed successfully');
      } else {
        toast.error((data && data.message) || 'Failed to remove team member');
      }
    } catch (error) {
      console.error('Error removing team member:', error);
      toast.error('Failed to remove team member');
    }
  };

  // Open dialog to manage website access
  const openManageAccessDialog = (member: TeamMember) => {
    if (currentUserRole !== 'admin') return;
    
    setSelectedMember(member);
    
    // Set selected websites based on current access
    const memberWebsiteIds = websiteAccess
      .filter(access => access.user_id === member.id)
      .map(access => access.website_id);
    
    setSelectedWebsites(memberWebsiteIds);
    setIsInviteDialogOpen(true);
  };

  // Add existing user to organization by email
  const handleAddExistingUser = async () => {
    if (!organisation?.id || currentUserRole !== 'admin') return;
    
    setIsAddingExistingUser(true);
    try {
      // Handle invitation using the existing RPC function
      const { data, error } = await supabase.rpc('handle_organisation_invitation', {
        p_email: existingUserEmail.trim(),
        p_organisation_id: organisation.id,
        p_role: role,
        p_website_ids: selectedWebsites
      });

      if (error) throw error;

      if (data && data.status === 'success') {
        toast.success(data.message || 'User added to organization successfully');
            
        // Reset form
        setExistingUserEmail('');
        setRole('member');
        setSelectedWebsites([]);
        setIsInviteDialogOpen(false);
        
        // Refresh team members list
        fetchTeamData();
      } else {
        toast.error((data && data.message) || 'Failed to add user to organization');
      }
    } catch (error) {
      console.error('Error adding existing user:', error);
      toast.error('Failed to add user to organization');
    } finally {
      setIsAddingExistingUser(false);
    }
  };

  // Resend invitation to a team member
  const handleResendInvite = async (member: TeamMember) => {
    if (!organisation?.id || currentUserRole !== 'admin') return;
    
    setResendingMemberId(member.id);
    try {
      console.log('Resending invitation to:', member.email);

      const response = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          email: member.email,
          organisation_id: organisation.id,
          role: member.role,
          is_resend: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resend invitation');
      }

      const { data } = await response.json();
      console.log('Invitation resent successfully:', data);

      toast.success('Invitation resent successfully');
    } catch (error) {
      console.error('Error in handleResendInvite:', error);
      toast.error('Failed to resend invitation');
    } finally {
      setResendingMemberId(null);
    }
  };

  // Handle resending invitation emails
  const handleResendInvitationEmail = async (invitation: Invitation) => {
    if (!organisation?.id || currentUserRole !== 'admin') return;
    
    setResendingMemberId(invitation.id);
    try {
      console.log('Resending invitation to:', invitation.email);

      const response = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          email: invitation.email,
          organisation_id: organisation.id,
          role: invitation.role,
          is_resend: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resend invitation');
      }

      const { data } = await response.json();
      console.log('Invitation resent successfully:', data);

      toast.success('Invitation resent successfully');
      fetchInvitations(); // Refresh the invitations list
    } catch (error) {
      console.error('Error in handleResendInvitationEmail:', error);
      toast.error('Failed to resend invitation');
    } finally {
      setResendingMemberId(null);
    }
  };

  // Add function to cancel invitation
  const handleCancelInvitation = async (invitationId: string) => {
    if (!organisation?.id || currentUserRole !== 'admin') return;
    
    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitationId);
      
      if (error) throw error;
      
      toast.success('Invitation cancelled successfully');
      fetchInvitations(); // Refresh the invitations list
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error('Failed to cancel invitation');
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
                <title>Team Management | ContentGardener.ai</title>
              </Helmet>

              {currentUserRole !== 'admin' ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-destructive" />
                      <CardTitle>Permission Required</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p>You must be an admin to access the team management page.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Team Management</h1>
                    <Dialog open={isInviteDialogOpen && !selectedMember} onOpenChange={(open) => {
                      setIsInviteDialogOpen(open);
                      if (!open) setSelectedMember(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Invite Team Member
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Invite Team Member</DialogTitle>
                          <DialogDescription>
                            Invite a new team member to your organization. They will receive an email invitation to join.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium">
                                  Email Address
                                </label>
                                <Input
                                  id="email"
                                  type="email"
                                  placeholder="colleague@example.com"
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                                />
                            <p className="text-xs text-muted-foreground">
                              Enter the email address of the person you want to invite. They will receive an invitation to join your organization.
                            </p>
                              </div>
                              
                              <div className="space-y-2">
                            <label htmlFor="role" className="text-sm font-medium">
                                  Role
                                </label>
                                <Select
                                  value={role}
                                  onValueChange={(value) => setRole(value as 'admin' | 'member')}
                                >
                                  <SelectTrigger id="role">
                                    <SelectValue placeholder="Select a role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="admin">Admin (Full Access)</SelectItem>
                                    <SelectItem value="member">Member (Limited Access)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                        </div>
                        <DialogFooter>
                            <Button
                              onClick={handleInviteTeamMember}
                              disabled={!email.trim()}
                            >
                              Invite
                            </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <Separator />

                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        <CardTitle>Team Members</CardTitle>
                      </div>
                      <CardDescription>
                        Manage your team members and their access to websites
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {loading ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : teamMembers.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No team members found</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Invite team members to collaborate on your content
                          </p>
                        </div>
                      ) : (
                        <>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Website Access</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {teamMembers.map((member) => {
                                const memberAccess = websiteAccess.filter(
                                  (access) => access.user_id === member.id
                                );
                                
                                return (
                                  <TableRow key={member.id}>
                                    <TableCell>
                                      {member.first_name || member.last_name
                                        ? `${member.first_name} ${member.last_name}`.trim()
                                        : 'Unnamed User'}
                                    </TableCell>
                                    <TableCell>{member.email}</TableCell>
                                    <TableCell>
                                      <Select
                                        value={member.role}
                                        onValueChange={(value) => 
                                          handleUpdateRole(member.id, value as 'admin' | 'member')
                                        }
                                        disabled={isUpdatingRole}
                                      >
                                        <SelectTrigger className="w-[110px] h-8">
                                          <SelectValue>
                                            <div className="flex items-center gap-1">
                                              {member.role === 'admin' ? (
                                                <Shield className="h-3 w-3" />
                                              ) : (
                                                <Users className="h-3 w-3" />
                                              )}
                                              {member.role === 'admin' ? 'Admin' : 'Member'}
                                            </div>
                                          </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="admin">Admin</SelectItem>
                                          <SelectItem value="member">Member</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell>
                                      {member.role === 'admin' ? (
                                        <span className="text-sm text-muted-foreground">
                                          Full access
                                        </span>
                                      ) : memberAccess.length === 0 ? (
                                        <span className="text-sm text-muted-foreground">
                                          No access
                                        </span>
                                      ) : (
                                        <div className="flex flex-wrap gap-1">
                                          {memberAccess.map((access) => (
                                            <Badge key={access.id} variant="outline" className="text-xs">
                                              <Globe className="h-3 w-3 mr-1" />
                                              {access.website?.name || 'Unknown website'}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        {member.role === 'member' && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openManageAccessDialog(member)}
                                            title="Manage Website Access"
                                          >
                                            <Globe className="h-4 w-4" />
                                          </Button>
                                        )}
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleResendInvite(member)}
                                          disabled={resendingMemberId === member.id}
                                          title="Resend Invitation"
                                        >
                                          {resendingMemberId === member.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <UserPlus className="h-4 w-4" />
                                          )}
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleRemoveTeamMember(member.id)}
                                          title="Remove Team Member"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Dialog for managing website access - only visible to admins */}
      {currentUserRole === 'admin' && (
        <Dialog open={isInviteDialogOpen && !!selectedMember} onOpenChange={(open) => {
          setIsInviteDialogOpen(open);
          if (!open) setSelectedMember(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Website Access</DialogTitle>
              <DialogDescription>
                Select which websites this team member can access
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Website Access for {selectedMember?.email}
                </label>
                <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                  {websites.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No websites available</p>
                  ) : (
                    websites.map((website) => (
                      <div key={website.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`manage-website-${website.id}`}
                          checked={selectedWebsites.includes(website.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedWebsites([...selectedWebsites, website.id]);
                            } else {
                              setSelectedWebsites(selectedWebsites.filter(id => id !== website.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={`manage-website-${website.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {website.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleUpdateWebsiteAccess}
                disabled={isUpdatingAccess}
              >
                {isUpdatingAccess ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </SidebarProvider>
  );
};

export default TeamManagement; 