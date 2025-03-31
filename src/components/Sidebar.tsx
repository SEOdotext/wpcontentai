import React from 'react';
import { Calendar, ChevronDown, FileText, Globe, Home, Map, PlusCircle, Settings, Users } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { useWebsites } from '@/context/WebsitesContext';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle, Plus } from 'lucide-react';

export function AppSidebar() {
  const { websites, currentWebsite, setCurrentWebsite, isLoading } = useWebsites();
  const location = useLocation();
  
  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="h-16 flex items-center px-6">
        <span className="font-semibold text-lg text-primary">WPcontentAI</span>
      </SidebarHeader>
      <SidebarContent>
        <div className="px-3 mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="justify-start w-full overflow-hidden">
                <Globe className="h-4 w-4 mr-2" />
                {isLoading ? (
                  <span>Loading websites...</span>
                ) : currentWebsite ? (
                  <span className="truncate">{currentWebsite.name}</span>
                ) : (
                  <span>Select a website</span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              {isLoading ? (
                <DropdownMenuItem disabled>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading websites...
                </DropdownMenuItem>
              ) : websites.length === 0 ? (
                <DropdownMenuItem disabled>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  No accessible websites
                </DropdownMenuItem>
              ) : (
                websites.map((website) => (
                  <DropdownMenuItem
                    key={website.id}
                    onClick={() => setCurrentWebsite(website)}
                    className={cn(
                      "cursor-pointer",
                      website.id === currentWebsite?.id && "bg-accent"
                    )}
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    <span className="truncate">{website.name}</span>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuItem asChild>
                <Link to="/websites" className="w-full cursor-pointer">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  <span>Manage Websites</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {websites.length === 0 && !isLoading && (
            <div className="mt-2 p-2 text-xs text-amber-600 bg-amber-50 rounded-md border border-amber-200">
              <AlertCircle className="h-3 w-3 inline-block mr-1" />
              You don't have access to any websites. Please contact your administrator.
            </div>
          )}
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="gap-2" 
              isActive={location.pathname === '/' || location.pathname === '/dashboard'}
              asChild
            >
              <Link to="/">
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="gap-2" 
              isActive={location.pathname === '/create'}
              asChild
            >
              <Link to="/create">
                <PlusCircle className="h-4 w-4" />
                <span>Content Creation</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="gap-2"
              isActive={location.pathname.startsWith('/calendar')}
              asChild
            >
              <Link to="/calendar">
                <Calendar className="h-4 w-4" />
                <span>Content Calendar</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton 
              className="gap-2"
              isActive={location.pathname.startsWith('/sitemap')}
              asChild
            >
              <Link to="/sitemap">
                <Map className="h-4 w-4" />
                <span>Website Content</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="gap-2"
              isActive={location.pathname.startsWith('/settings')}
              asChild
            >
              <Link to="/settings">
                <Settings className="h-4 w-4" />
                <span>Website Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="gap-2"
              isActive={location.pathname.startsWith('/team-management')}
              asChild
            >
              <Link to="/team-management">
                <Users className="h-4 w-4" />
                <span>Team Management</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;
