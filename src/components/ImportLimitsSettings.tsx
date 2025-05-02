import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from 'sonner';
import { useWebsites } from '@/context/WebsitesContext';
import { Website } from '@/types/website';

interface ImportLimitsSettingsProps {
  disabled?: boolean;
}

export function ImportLimitsSettings({ disabled = false }: ImportLimitsSettingsProps) {
  const { currentWebsite, updateWebsite } = useWebsites();

  const handlePageImportLimitChange = async (value: number[]) => {
    if (!currentWebsite) {
      toast.error("Please select a website first");
      return;
    }
    try {
      await updateWebsite(currentWebsite.id, {
        page_import_limit: value[0]
      });
      toast.success(`Page import limit updated to ${value[0]} pages`);
    } catch (error) {
      console.error('Failed to update page import limit:', error);
      toast.error('Failed to update page import limit');
    }
  };

  const handleKeyContentLimitChange = async (value: number[]) => {
    if (!currentWebsite) {
      toast.error("Please select a website first");
      return;
    }
    try {
      await updateWebsite(currentWebsite.id, {
        key_content_limit: value[0]
      });
      toast.success(`Key content limit updated to ${value[0]} pages`);
    } catch (error) {
      console.error('Failed to update key content limit:', error);
      toast.error('Failed to update key content limit');
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Page Import Limit</Label>
        <div className="flex items-center space-x-2">
          <Slider
            value={[currentWebsite?.page_import_limit || 500]}
            onValueChange={handlePageImportLimitChange}
            min={100}
            max={5000}
            step={100}
            disabled={disabled}
            className="w-[200px]"
          />
          <span className="w-16 text-right">{currentWebsite?.page_import_limit || 500}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Maximum number of pages that can be imported at once. Higher limits may take longer to process.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Key Content Limit</Label>
        <div className="flex items-center space-x-2">
          <Slider
            value={[currentWebsite?.key_content_limit || 10]}
            onValueChange={handleKeyContentLimitChange}
            min={5}
            max={50}
            step={5}
            disabled={disabled}
            className="w-[200px]"
          />
          <span className="w-16 text-right">{currentWebsite?.key_content_limit || 10}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Maximum number of key content pages that can be marked. These pages are used as reference for content generation.
        </p>
      </div>
    </div>
  );
} 