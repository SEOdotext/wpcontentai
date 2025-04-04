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
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { useWebsites } from '@/context/WebsitesContext';
import { Logo } from '@/components/Logo';

export function AppSidebar() {
  const { websites, currentWebsite, setCurrentWebsite, isLoading } = useWebsites();
  const location = useLocation();
  
  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="h-16 flex items-center px-6 pt-[15px]">
        <Logo />
      </SidebarHeader>
      <SidebarContent>
        <div className="px-3 mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span>{isLoading ? 'Loading...' : (currentWebsite?.name || 'Select Website')}</span>
                </div>
                <ChevronDown className="h-4 w-4 ml-2 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              {websites.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  No websites available
                </div>
              ) : (
                websites.map((website) => (
                  <DropdownMenuItem 
                    key={website.id}
                    onClick={() => setCurrentWebsite(website)}
                    className={currentWebsite?.id === website.id ? 'bg-primary/10 font-medium' : ''}
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    <div className="flex flex-col">
                      <span>{website.name}</span>
                      <span className="text-xs text-muted-foreground">{website.organisation_name}</span>
                    </div>
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
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="gap-2" 
              isActive={location.pathname === '/' || location.pathname === '/dashboard'}
              asChild
            >
              <Link to="/dashboard">
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
