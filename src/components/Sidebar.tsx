
import React from 'react';
import { FileText, Globe, Home, LayoutList, Settings } from 'lucide-react';
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

export function AppSidebar() {
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
                  <span>My Tech Blog</span>
                </div>
                <Globe className="h-4 w-4 ml-2 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              <DropdownMenuItem>
                <Globe className="h-4 w-4 mr-2" />
                <span>My Tech Blog</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Globe className="h-4 w-4 mr-2" />
                <span>Company Website</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Globe className="h-4 w-4 mr-2" />
                <span>Personal Portfolio</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="gap-2">
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="gap-2 text-primary bg-primary/10">
              <LayoutList className="h-4 w-4" />
              <span>Content Structure</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="gap-2">
              <FileText className="h-4 w-4" />
              <span>Articles</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="gap-2">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;
