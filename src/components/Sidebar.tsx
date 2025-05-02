import React, { useState } from 'react';
import { Calendar, ChevronDown, FileText, Globe, Home, Map, PlusCircle, Settings, Users, Link, Tags, PenTool, Layout, Import, Image, Share2 } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useWebsites } from '@/context/WebsitesContext';
import { Logo } from '@/components/Logo';

export function AppSidebar() {
  const { websites, currentWebsite, setCurrentWebsite, isLoading } = useWebsites();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(location.pathname.startsWith('/settings'));
  
  const settingsItems = [
    { id: 'wordpress', label: 'WordPress Integration', icon: <Link className="h-4 w-4" /> },
    { id: 'publication', label: 'Publication Settings', icon: <Calendar className="h-4 w-4" /> },
    { id: 'keywords', label: 'Keyword Management', icon: <Tags className="h-4 w-4" /> },
    { id: 'writing', label: 'Writing Style', icon: <PenTool className="h-4 w-4" /> },
    { id: 'formatting', label: 'Content Formatting', icon: <Layout className="h-4 w-4" /> },
    { id: 'language', label: 'Website Language', icon: <Globe className="h-4 w-4" /> },
    { id: 'import', label: 'Import Limits', icon: <Import className="h-4 w-4" /> },
    { id: 'images', label: 'AI Image Generation', icon: <Image className="h-4 w-4" /> },
    { id: 'social', label: 'Social Media', icon: <Share2 className="h-4 w-4" /> }
  ];

  const handleSettingsClick = () => {
    setIsSettingsExpanded(!isSettingsExpanded);
    if (!location.pathname.startsWith('/settings')) {
      navigate('/settings');
    }
  };

  const handleSettingsSectionClick = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
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
                <RouterLink to="/websites" className="w-full cursor-pointer">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  <span>Manage Websites</span>
                </RouterLink>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <SidebarMenu className="px-3">
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="gap-2" 
              isActive={location.pathname === '/' || location.pathname === '/dashboard'}
              asChild
            >
              <RouterLink to="/dashboard">
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
              </RouterLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="gap-2" 
              isActive={location.pathname === '/create'}
              asChild
            >
              <RouterLink to="/create">
                <PlusCircle className="h-4 w-4" />
                <span>Content Creation</span>
              </RouterLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="gap-2"
              isActive={location.pathname.startsWith('/calendar')}
              asChild
            >
              <RouterLink to="/calendar">
                <Calendar className="h-4 w-4" />
                <span>Content Calendar</span>
              </RouterLink>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton 
              className="gap-2"
              isActive={location.pathname.startsWith('/sitemap')}
              asChild
            >
              <RouterLink to="/sitemap">
                <Map className="h-4 w-4" />
                <span>Website Content</span>
              </RouterLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <SidebarMenuButton 
              className="gap-2"
              isActive={location.pathname.startsWith('/settings')}
              onClick={handleSettingsClick}
            >
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>Website Settings</span>
              </div>
            </SidebarMenuButton>
            {isSettingsExpanded && (
              <SidebarMenuSub>
                {settingsItems.map((item) => (
                  <SidebarMenuSubItem key={item.id}>
                    <SidebarMenuSubButton
                      asChild
                      isActive={location.hash === `#${item.id}`}
                    >
                      <RouterLink 
                        to={`/settings#${item.id}`} 
                        className="flex items-center gap-2"
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/settings#${item.id}`);
                          handleSettingsSectionClick(item.id);
                        }}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </RouterLink>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            )}
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
              <RouterLink to="/team-management">
                <Users className="h-4 w-4" />
                <span>Team Management</span>
              </RouterLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;
