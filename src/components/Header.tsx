import React from 'react';
import { ChevronDown, Menu, LogOut, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { useOrganisation } from '@/context/OrganisationContext';
import { Logo } from '@/components/Logo';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { organisation } = useOrganisation();
  const [user, setUser] = useState<{ email: string; provider?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch user information
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const provider = data.session.user.app_metadata.provider || 'email';
        setUser({ 
          email: data.session.user.email || 'User',
          provider
        });
      }
      setLoading(false);
    };
    
    getUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          const provider = session.user.app_metadata.provider || 'email';
          setUser({ 
            email: session.user.email || 'User',
            provider
          });
        } else {
          setUser(null);
        }
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  // Determine page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/calendar') return 'Content Calendar';
    if (path === '/' || path === '/dashboard') return 'Dashboard';
    if (path === '/create') return 'Content Creation';
    if (path === '/sitemap') return 'Website Content';
    if (path === '/settings') return 'Publication Settings';
    if (path === '/websites') return 'Websites';
    if (path === '/organisation') return 'Organisation';
    return '';
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
      navigate('/auth');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.substring(0, 2).toUpperCase();
  };

  // Get avatar background color based on provider
  const getAvatarClass = () => {
    if (user?.provider === 'google') {
      return 'bg-red-500';
    }
    return 'bg-primary';
  };

  return (
    <header className="w-full h-16 border-b border-border/50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="h-full flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <div className="block lg:hidden">
            <SidebarTrigger>
              <Button size="icon" variant="ghost">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SidebarTrigger>
          </div>
          <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full ${getAvatarClass()} flex items-center justify-center text-primary-foreground`}>
                    <span className="text-sm font-medium">{getUserInitials()}</span>
                  </div>
                  <span className="hidden md:inline-block font-medium truncate max-w-[250px]">
                    {user.email}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                {user.provider && (
                  <DropdownMenuItem className="text-xs text-muted-foreground cursor-default">
                    Signed in with {user.provider}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>Website Settings</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/websites')}>Websites</DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Organisation
                  </DropdownMenuLabel>
                  <DropdownMenuItem className="text-xs text-muted-foreground">
                    {organisation?.name || 'Loading...'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/organisation')}>
                    Manage Organisation
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
