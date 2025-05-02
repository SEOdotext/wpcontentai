import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Globe,
  Settings2,
  Calendar,
  Tags,
  PenTool,
  Layout,
  Share2,
  Import,
  Image,
  Link,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface SettingsMenuProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function SettingsMenu({ activeSection, onSectionChange }: SettingsMenuProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const menuItems = [
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

  return (
    <div className="space-y-1">
      <Button
        variant="ghost"
        className="w-full justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <Settings2 className="h-4 w-4 mr-2" />
          <span>Website Settings</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>
      
      {isExpanded && (
        <div className="ml-4 space-y-1 mt-1 border-l pl-2">
          {menuItems.map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "w-full justify-start",
                activeSection === item.id && "bg-muted"
              )}
              onClick={() => onSectionChange(item.id)}
            >
              {item.icon}
              <span className="ml-2">{item.label}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
} 