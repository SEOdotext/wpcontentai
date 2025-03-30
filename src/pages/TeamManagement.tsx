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

// Define types
interface TeamMember {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'member';
  created_at: string;
  organisation_id: string;
}

interface WebsiteAccess {
  id: string;
  user_id: string;
  website_id: string;
  created_at: string;
  website?: {
    name: string;
    url: string;
  };
}

const TeamManagement = () => {
  const { organisation } = useOrganisation();
  const { websites } = useWebsites();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [websiteAccess, setWebsiteAccess] = useState<WebsiteAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [selectedWebsites, setSelectedWebsites] = useState<string[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isUpdatingAccess, setIsUpdatingAccess] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [existingUserEmail, setExistingUserEmail] = useState('');
  const [isAddingExistingUser, setIsAddingExistingUser] = useState(false);
  const [activeTab, setActiveTab] = useState<'invite' | 'add'>('add');

  // Fetch team members and website access
  useEffect(() => {
    const fetchTeamData = async () => {
      if (!organisation?.id) return;
      
      setLoading(true);
      try {
        // Fetch team members for this organization
        const { data: members, error: membersError } = await supabase
          .from('organization_memberships')
          .select(`
            id,
            role,
            created_at,
            user:user_profiles (
              id,
              email,
              first_name,
              last_name
            )
          `)
          .eq('organisation_id', organisation.id);
        
        if (membersError) throw membersError;
        
        // Transform the data to match our interface
        const typedMembers = members.map(member => ({
          id: member.user.id,
          email: member.user.email,
          first_name: member.user.first_name,
          last_name: member.user.last_name,
          role: member.role as 'admin' | 'member',
          created_at: member.created_at,
          organisation_id: organisation.id
        }));
        
        setTeamMembers(typedMembers);
        
        // Check if website_access table exists
        try {
          // Fetch website access
          const { data: access, error: accessError } = await supabase
            .from('website_access')
            .select(`
              id,
              user_id,
              website_id,
              created_at
            `)
            .in('user_id', typedMembers.map(m => m.id));
          
          if (accessError) throw accessError;
          
          // Fetch website details separately
          if (access && access.length > 0) {
            const websiteIds = [...new Set(access.map(a => a.website_id))];
            
            const { data: websiteDetails, error: websiteError } = await supabase
              .from('websites')
              .select('id, name, url')
              .in('id', websiteIds);
            
            if (websiteError) throw websiteError;
            
            // Combine the data
            const accessWithWebsites = access.map(a => ({
              ...a,
              website: websiteDetails?.find(w => w.id === a.website_id)
            }));
            
            setWebsiteAccess(accessWithWebsites);
          } else {
            setWebsiteAccess([]);
          }
        } catch (error) {
          console.error('Error fetching website access:', error);
          setWebsiteAccess([]);
        }
      } catch (error) {
        console.error('Error fetching team data:', error);
        toast.error('Failed to load team members');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTeamData();
  }, [organisation?.id]);

  // Invite a new team member
  const handleInviteTeamMember = async () => {
    if (!inviteEmail.trim() || !organisation?.id) return;
    
    setIsInviting(true);
    try {
      // In a real implementation, you would:
      // 1. Create a user in auth.users
      // 2. Then create a user_profile linked to that auth user
      
      // For now, we'll show a message explaining the limitation
      toast.info('In a production environment, this would create a new user and send an invitation email.');
      toast.info('For now, please create the user manually in the Supabase dashboard.');
      
      // Reset form
      setInviteEmail('');
      setInviteRole('member');
      setSelectedWebsites([]);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error inviting team member:', error);
      toast.error('Failed to invite team member');
    } finally {
      setIsInviting(false);
    }
  };

  // Update member role
  const handleUpdateRole = async (memberId: string, newRole: 'admin' | 'member') => {
    setIsUpdatingRole(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', memberId);
      
      if (error) throw error;
      
      // Update local state
      setTeamMembers(prev => 
        prev.map(member => 
          member.id === memberId ? { ...member, role: newRole } : member
        )
      );
      
      toast.success('Member role updated successfully');
    } catch (error) {
      console.error('Error updating member role:', error);
      toast.error('Failed to update member role');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Update website access
  const handleUpdateWebsiteAccess = async () => {
    if (!selectedMember) return;
    
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
      setIsDialogOpen(false);
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
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
      
      // Update local state
      setTeamMembers(prev => prev.filter(member => member.id !== memberId));
      setWebsiteAccess(prev => prev.filter(access => access.user_id !== memberId));
      
      toast.success('Team member removed successfully');
    } catch (error) {
      console.error('Error removing team member:', error);
      toast.error('Failed to remove team member');
    }
  };

  // Open dialog to manage website access
  const openManageAccessDialog = (member: TeamMember) => {
    setSelectedMember(member);
    
    // Set selected websites based on current access
    const memberWebsiteIds = websiteAccess
      .filter(access => access.user_id === member.id)
      .map(access => access.website_id);
    
    setSelectedWebsites(memberWebsiteIds);
    setIsDialogOpen(true);
  };

  // Add existing user to organization by email
  const handleAddExistingUser = async () => {
    if (!organisation?.id) return;
    
    setIsAddingExistingUser(true);
    try {
      // Check if user exists
      const { data: existingUsers, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', existingUserEmail.trim());
      
      if (userError) throw userError;
      
      if (!existingUsers || existingUsers.length === 0) {
        console.log('User not found with email:', existingUserEmail);
        
        // Try direct ID lookup if the input looks like a UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(existingUserEmail.trim())) {
          console.log('Input looks like a UUID, trying direct ID lookup');
          const { data: userById, error: idLookupError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', existingUserEmail.trim());
            
          if (idLookupError) {
            console.error('Error looking up user by ID:', idLookupError);
          } else if (userById && userById.length > 0) {
            console.log('Found user by ID:', userById[0]);
            const existingUser = userById[0];
            
            // Check if user is already in this organization
            const { data: existingMembership } = await supabase
              .from('organization_memberships')
              .select('*')
              .eq('user_id', existingUser.id)
              .eq('organisation_id', organisation.id)
              .single();
            
            if (existingMembership) {
              console.log('User already in organization:', organisation.id);
              toast.info('This user is already in your organization.');
              return;
            }
            
            // Add user to organization
            console.log('Adding user to organization:', organisation.id);
            const { error: membershipError } = await supabase
              .from('organization_memberships')
              .insert({
                user_id: existingUser.id,
                organisation_id: organisation.id,
                role: inviteRole
              });
            
            if (membershipError) {
              console.error('Error adding user to organization:', membershipError);
              toast.error('Failed to add user to organization');
              return;
            }
            
            // If member role, add website access
            if (inviteRole === 'member' && selectedWebsites.length > 0) {
              try {
                console.log('Adding website access for user:', existingUser.id);
                const accessEntries = selectedWebsites.map(websiteId => ({
                  user_id: existingUser.id,
                  website_id: websiteId
                }));
                
                const { error: accessError } = await supabase
                  .from('website_access')
                  .insert(accessEntries);
                
                if (accessError) {
                  console.error('Error adding website access:', accessError);
                  throw accessError;
                }
              } catch (error) {
                console.error('Error adding website access:', error);
                toast.warning('User added but website access could not be added');
              }
            }
            
            // Refresh data
            const updatedUser = {
              ...existingUser,
              role: inviteRole as 'admin' | 'member',
              organisation_id: organisation.id
            };
            
            setTeamMembers(prev => [...prev, updatedUser]);
            console.log('User successfully added to organization');
            toast.success('User added to organization successfully');
            
            // Reset form
            setExistingUserEmail('');
            setInviteRole('member');
            setSelectedWebsites([]);
            setIsDialogOpen(false);
            return;
          }
        }
        
        toast.error('User not found. The user must have already signed up before they can be added.');
        return;
      }
      
      const existingUser = existingUsers[0];
      console.log('Found user:', existingUser);
      
      // Check if user is already in this organization
      const { data: existingMembership } = await supabase
        .from('organization_memberships')
        .select('*')
        .eq('user_id', existingUser.id)
        .eq('organisation_id', organisation.id)
        .single();
      
      if (existingMembership) {
        console.log('User already in organization:', organisation.id);
        toast.info('This user is already in your organization.');
        return;
      }
      
      // Add user to organization
      console.log('Adding user to organization:', organisation.id);
      const { error: membershipError } = await supabase
        .from('organization_memberships')
        .insert({
          user_id: existingUser.id,
          organisation_id: organisation.id,
          role: inviteRole
        });
      
      if (membershipError) {
        console.error('Error adding user to organization:', membershipError);
        toast.error('Failed to add user to organization');
        return;
      }
      
      // If member role, add website access
      if (inviteRole === 'member' && selectedWebsites.length > 0) {
        try {
          console.log('Adding website access for user:', existingUser.id);
          const accessEntries = selectedWebsites.map(websiteId => ({
            user_id: existingUser.id,
            website_id: websiteId
          }));
          
          const { error: accessError } = await supabase
            .from('website_access')
            .insert(accessEntries);
          
          if (accessError) {
            console.error('Error adding website access:', accessError);
            throw accessError;
          }
        } catch (error) {
          console.error('Error adding website access:', error);
          toast.warning('User added but website access could not be added');
        }
      }
      
      // Refresh data
      const updatedUser = {
        ...existingUser,
        role: inviteRole as 'admin' | 'member',
        organisation_id: organisation.id
      };
      
      setTeamMembers(prev => [...prev, updatedUser]);
      console.log('User successfully added to organization');
      toast.success('User added to organization successfully');
      
      // Reset form
      setExistingUserEmail('');
      setInviteRole('member');
      setSelectedWebsites([]);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error adding existing user:', error);
      toast.error('Failed to add user to organization');
    } finally {
      setIsAddingExistingUser(false);
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
                <title>Team Management | WP Content AI</title>
              </Helmet>

              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Team Management</h1>
                <Dialog open={isDialogOpen && !selectedMember} onOpenChange={(open) => {
                  setIsDialogOpen(open);
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
                      <DialogTitle>Team Management</DialogTitle>
                      <DialogDescription>
                        Invite new members or add existing users to your organization.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
                        <p className="text-yellow-800 font-medium">Development Mode</p>
                        <p className="text-sm text-yellow-700 mt-1">
                          In a production environment, inviting new users would create accounts and send email invitations.
                          For now, you can add existing users to your organization.
                        </p>
                      </div>
                      
                      <Tabs defaultValue="add" value={activeTab} onValueChange={(value) => setActiveTab(value as 'invite' | 'add')}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="add">Add Existing User</TabsTrigger>
                          <TabsTrigger value="invite">Invite New User</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="add" className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <label htmlFor="existingUserEmail" className="text-sm font-medium">
                              Email Address
                            </label>
                            <Input
                              id="existingUserEmail"
                              type="email"
                              placeholder="colleague@example.com"
                              value={existingUserEmail}
                              onChange={(e) => setExistingUserEmail(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Enter the email of an existing user to add them to your organization.
                              Works with users who signed up with email/password or Google authentication.
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <label htmlFor="role-add" className="text-sm font-medium">
                              Role
                            </label>
                            <Select
                              value={inviteRole}
                              onValueChange={(value) => setInviteRole(value as 'admin' | 'member')}
                            >
                              <SelectTrigger id="role-add">
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin (Full Access)</SelectItem>
                                <SelectItem value="member">Member (Limited Access)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {inviteRole === 'member' && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                Website Access
                              </label>
                              <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                                {websites.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No websites available</p>
                                ) : (
                                  websites.map((website) => (
                                    <div key={website.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`website-add-${website.id}`}
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
                                        htmlFor={`website-add-${website.id}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                      >
                                        {website.name}
                                      </label>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="invite" className="space-y-4 mt-4">
                          <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium">
                              Email Address
                            </label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="colleague@example.com"
                              value={inviteEmail}
                              onChange={(e) => setInviteEmail(e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <label htmlFor="role-invite" className="text-sm font-medium">
                              Role
                            </label>
                            <Select
                              value={inviteRole}
                              onValueChange={(value) => setInviteRole(value as 'admin' | 'member')}
                            >
                              <SelectTrigger id="role-invite">
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin (Full Access)</SelectItem>
                                <SelectItem value="member">Member (Limited Access)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {inviteRole === 'member' && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">
                                Website Access
                              </label>
                              <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                                {websites.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No websites available</p>
                                ) : (
                                  websites.map((website) => (
                                    <div key={website.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`website-invite-${website.id}`}
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
                                        htmlFor={`website-invite-${website.id}`}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                      >
                                        {website.name}
                                      </label>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                    <DialogFooter>
                      {activeTab === 'add' ? (
                        <Button
                          onClick={handleAddExistingUser}
                          disabled={isAddingExistingUser || !existingUserEmail.trim()}
                        >
                          {isAddingExistingUser ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            'Add to Organization'
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={handleInviteTeamMember}
                          disabled={isInviting || !inviteEmail.trim()}
                        >
                          {isInviting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Inviting...
                            </>
                          ) : (
                            'Send Invitation'
                          )}
                        </Button>
                      )}
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
                      {/* Show a message if the website_access table doesn't exist */}
                      {websiteAccess.length === 0 && teamMembers.some(m => m.role === 'member') && (
                        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                          <p className="text-yellow-800 font-medium">Database Setup Required</p>
                          <p className="text-sm text-yellow-700 mt-1">
                            The website access table needs to be created. Please run the SQL script from the fix_website_access_dashboard.sql file in the Supabase SQL Editor.
                          </p>
                        </div>
                      )}
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
                                  <div className="flex items-center gap-2">
                                    <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                                      {member.role === 'admin' ? (
                                        <Shield className="h-3 w-3 mr-1" />
                                      ) : (
                                        <Users className="h-3 w-3 mr-1" />
                                      )}
                                      {member.role === 'admin' ? 'Admin' : 'Member'}
                                    </Badge>
                                    <Select
                                      value={member.role}
                                      onValueChange={(value) => 
                                        handleUpdateRole(member.id, value as 'admin' | 'member')
                                      }
                                      disabled={isUpdatingRole}
                                    >
                                      <SelectTrigger className="w-[110px] h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="member">Member</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
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
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openManageAccessDialog(member)}
                                      >
                                        Manage Access
                                      </Button>
                                    )}
                                    <Button
                                      variant="destructive"
                                      size="icon"
                                      onClick={() => handleRemoveTeamMember(member.id)}
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
            </div>
          </main>
        </div>
      </div>

      {/* Dialog for managing website access */}
      <Dialog open={isDialogOpen && !!selectedMember} onOpenChange={(open) => {
        setIsDialogOpen(open);
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
    </SidebarProvider>
  );
};

export default TeamManagement; 