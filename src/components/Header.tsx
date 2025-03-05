
import React from 'react';
import { Bell, ChevronDown, Menu, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';

const Header: React.FC = () => {
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
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg">WPcontentAI</span>
          </div>
        </div>
        
        <div className="hidden md:flex items-center ml-4 lg:ml-6 lg:w-[400px]">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search content..." 
              className="w-full pl-9 rounded-full bg-secondary border-0"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <Button size="icon" variant="ghost" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            <span className="sr-only">Notifications</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                  <span className="text-sm font-medium">JD</span>
                </div>
                <span className="hidden md:inline-block font-medium">John Doe</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Billing</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Log out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
