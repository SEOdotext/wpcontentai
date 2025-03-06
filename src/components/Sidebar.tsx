
import React from 'react';
import { Calendar, FileText, Globe, Home, LayoutList, Settings, PlusCircle } from 'lucide-react';
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
import { Link } from 'react-router-dom';
import { useWebsites } from '@/context/WebsitesContext';

export function AppSidebar() {
  const { websites, currentWebsite, setCurrentWebsite, isLoading } = useWebsites();

  return (
    <Sidebar className="border-r border-border/50">
      <SidebarHeader className="h-16 flex items-center px-6">
        <span className="font-semibold text-lg text-primary">WPcontentAI</span>
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
                <Globe className="h-4 w-4 ml-2 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              {websites.map((website) => (
                <DropdownMenuItem 
                  key={website.id}
                  onClick={() => setCurrentWebsite(website)}
                  className={currentWebsite?.id === website.id ? 'bg-muted' : ''}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  <span>{website.name}</span>
                </DropdownMenuItem>
              ))}
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
            <SidebarMenuButton className="gap-2" asChild>
              <Link to="/">
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="gap-2" asChild>
              <Link to="/create">
                <PlusCircle className="h-4 w-4" />
                <span>Content Creation</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="gap-2" asChild>
              <Link to="/calendar">
                <Calendar className="h-4 w-4" />
                <span>Content Calendar</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="gap-2" asChild>
              <Link to="/settings">
                <Settings className="h-4 w-4" />
                <span>Publication Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          {/* Remove settings from footer since it's now in the main menu */}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;
