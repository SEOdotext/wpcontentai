import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Loader2 } from "lucide-react";
import { useSettings } from '../context/SettingsContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from 'sonner';

interface PublicationSettingsProps {
  initialFrequency?: number;
  initialPostingDays?: string[];
  initialWeeklyPlanningDay?: string;
  onSave?: (settings: {
    postingDays: string[];
    weeklyPlanningDay: string;
  }) => Promise<void>;
  showSaveButton?: boolean;
  disabled?: boolean;
}

export function PublicationSettings({
  initialFrequency = 0,
  initialPostingDays = [],
  initialWeeklyPlanningDay = '',
  onSave,
  showSaveButton = true,
  disabled = false
}: PublicationSettingsProps) {
  const { 
    postingFrequency, 
    setPostingFrequency,
    writingStyle,
    subjectMatters,
    weeklyPlanningDay,
    setWeeklyPlanningDay
  } = useSettings();
  const [postingDays, setPostingDays] = useState<string[]>(initialPostingDays);
  const [isSaving, setIsSaving] = useState(false);
  const [showWeekends, setShowWeekends] = useState(false);
  const [localWeeklyPlanningDay, setLocalWeeklyPlanningDay] = useState(initialWeeklyPlanningDay);
  const [localPostingFrequency, setLocalPostingFrequency] = useState(initialFrequency);

  // Update state when props change
  useEffect(() => {
    console.log('Publication settings props updated:', { initialFrequency, initialPostingDays, initialWeeklyPlanningDay });
    
    // Skip if we're still initializing
    if (!initialWeeklyPlanningDay) {
      return;
    }

    // Reset all state values when website changes
    setLocalPostingFrequency(initialFrequency || 0);
    setPostingDays(initialPostingDays || []);
    setLocalWeeklyPlanningDay(initialWeeklyPlanningDay);
  }, [initialFrequency, initialPostingDays, initialWeeklyPlanningDay]);

  // Get default posting days based on frequency
  const getDefaultPostingDays = (frequency: number): string[] => {
    switch (frequency) {
      case 1:
        return ['monday'];
      case 2:
        return ['monday', 'thursday'];
      case 3:
        return ['monday', 'wednesday', 'friday'];
      case 4:
        return ['monday', 'tuesday', 'thursday', 'friday'];
      case 5:
        return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      case 6:
        return ['monday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      case 7:
        return ['monday', 'monday', 'tuesday', 'wednesday', 'thursday', 'thursday', 'friday'];
      case 8:
        return ['monday', 'monday', 'tuesday', 'tuesday', 'wednesday', 'thursday', 'thursday', 'friday'];
      case 9:
        return ['monday', 'monday', 'tuesday', 'tuesday', 'wednesday', 'wednesday', 'thursday', 'thursday', 'friday'];
      case 10:
        return ['monday', 'monday', 'tuesday', 'tuesday', 'wednesday', 'wednesday', 'thursday', 'thursday', 'friday', 'friday'];
      default:
        return ['monday', 'wednesday', 'friday'];
    }
  };

  const handleFrequencyChange = (value: number) => {
    // Check if the new frequency would exceed the maximum limit
    if (value > 299) {
      toast.error("Maximum limit reached - You can schedule a maximum of 299 articles per week.");
      return;
    }
    
    // Update local frequency
    setLocalPostingFrequency(value);
    
    // For specific frequencies, always use the standard pattern
    if ([1, 2, 3, 4, 5].includes(value)) {
      setPostingDays(getDefaultPostingDays(value));
      return;
    }
    
    // For other frequencies, keep existing days and add more if needed
    if (postingDays.length < value) {
      // Get available days (including weekends if they're in the current selection)
      const availableDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      if (postingDays.some(day => day === 'saturday' || day === 'sunday')) {
        availableDays.push('saturday', 'sunday');
      }
      
      // Start with current days
      const newDays = [...postingDays];
      
      // Add more days until we reach the desired frequency
      while (newDays.length < value) {
        // Find the day with the least posts
        const dayCounts = availableDays.map(day => ({
          day,
          count: newDays.filter(d => d === day).length
        }));
        
        // Sort by count (ascending) and get the day with the least posts
        dayCounts.sort((a, b) => a.count - b.count);
        const dayToAdd = dayCounts[0].day;
        
        // Add the day
        newDays.push(dayToAdd);
      }
      
      setPostingDays(newDays);
    } 
    // If current days are more than new frequency, remove excess days
    else if (postingDays.length > value) {
      setPostingDays(prev => prev.slice(0, value));
    }
  };

  const handleDayToggle = (day: string) => {
    setPostingDays(prev => {
      const newDays = prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day];
      
      // Update frequency to match the number of days
      const newFrequency = newDays.length;
      setLocalPostingFrequency(newFrequency);
      
      // For specific frequencies, ensure we use the standard pattern
      if ([1, 2, 3, 4, 5].includes(newFrequency)) {
        return getDefaultPostingDays(newFrequency);
      }
      
      return newDays;
    });
  };

  // Add a function to handle adding a day
  const handleAddDay = (day: string) => {
    // Check if adding a day would exceed the maximum limit of 299 articles per week
    if (postingDays.length >= 299) {
      toast.error("Maximum limit reached - You can schedule a maximum of 299 articles per week.");
      return;
    }
    
    const newDays = [...postingDays, day];
    const newFrequency = newDays.length;
    
    // For specific frequencies, ensure we use the standard pattern
    if ([1, 2, 3, 4, 5].includes(newFrequency)) {
      const standardDays = getDefaultPostingDays(newFrequency);
      setPostingDays(standardDays);
      setLocalPostingFrequency(newFrequency);
    } else {
      setPostingDays(newDays);
      setLocalPostingFrequency(newFrequency);
    }
  };

  // Add a function to handle removing a day
  const handleRemoveDay = (day: string) => {
    const currentCount = postingDays.filter(d => d === day).length;
    if (currentCount > 0) {
      const newDays = postingDays.filter((d, i) => !(d === day && i === postingDays.lastIndexOf(day)));
      const newFrequency = newDays.length;
      
      // For specific frequencies, ensure we use the standard pattern
      if ([1, 2, 3, 4, 5].includes(newFrequency)) {
        const standardDays = getDefaultPostingDays(newFrequency);
        setPostingDays(standardDays);
        setLocalPostingFrequency(newFrequency);
      } else {
        setPostingDays(newDays);
        setLocalPostingFrequency(newFrequency);
      }
    }
  };

  // Calculate price based on frequency
  const calculatePrice = (frequency: number): string => {
    if (frequency <= 1) {
      return 'Hobby Plan for €15/month';
    } else if (frequency <= 3) {
      return 'Pro Plan - Starting at €49/month';
    } else if (frequency <= 5) {
      return 'Pro Plan (€49/month) + Article Package (10 articles for €20) = €69/month total';
    } else if (frequency <= 7) {
      return 'Pro Plan (€49/month) + Article Packages (20 articles for €40) = €89/month total';
    } else {
      // Calculate additional packages needed (1 package per 2 posts above 7)
      const additionalPackages = Math.ceil((frequency - 7) / 2);
      const totalArticles = 20 + (additionalPackages * 10);
      const packageCost = additionalPackages * 20;
      const totalPrice = 49 + packageCost;
      return `Pro Plan (€49/month) + Article Packages (${totalArticles} articles for €${packageCost}) = €${totalPrice}/month total`;
    }
  };

  const handleSave = async () => {
    if (onSave) {
      setIsSaving(true);
      try {
        await onSave({
          postingDays,
          weeklyPlanningDay: localWeeklyPlanningDay
        });
        // Update global state after successful save
        setPostingFrequency(localPostingFrequency);
        setWeeklyPlanningDay(localWeeklyPlanningDay);
        toast.success("Publication settings saved successfully");
      } catch (error) {
        console.error('Error saving settings:', error);
        toast.error("Failed to save publication settings");
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Weekly Planning Day Selection */}
      <div className="space-y-4">
        <Label>Weekly Planning Day</Label>
        <Select
          value={localWeeklyPlanningDay}
          onValueChange={(value) => {
            setLocalWeeklyPlanningDay(value);
          }}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select planning day" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monday">Monday</SelectItem>
            <SelectItem value="tuesday">Tuesday</SelectItem>
            <SelectItem value="wednesday">Wednesday</SelectItem>
            <SelectItem value="thursday">Thursday</SelectItem>
            <SelectItem value="friday">Friday</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          On this day each week, we'll automatically plan and generate your content. You'll receive an email with the planned content for your review.
        </p>
      </div>

      <Separator />

      {/* Frequency Input */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Publishing Frequency</Label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleFrequencyChange(Math.max(1, localPostingFrequency - 1))}
              disabled={disabled || localPostingFrequency <= 1}
            >
              -
            </Button>
            <input
              type="number"
              min="1"
              max="299"
              value={localPostingFrequency}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (!isNaN(value) && value >= 1 && value <= 299) {
                  handleFrequencyChange(value);
                }
              }}
              className="w-12 h-8 text-center text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              disabled={disabled}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleFrequencyChange(localPostingFrequency + 1)}
              disabled={disabled || localPostingFrequency >= 299}
            >
              +
            </Button>
            <span className="text-sm text-muted-foreground">per week</span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {localPostingFrequency === 1 ? 'Perfect for maintaining a steady presence' :
           localPostingFrequency <= 3 ? 'Ideal for growing your audience consistently' :
           localPostingFrequency <= 5 ? 'Great for high engagement and SEO impact' :
           'Maximum impact and authority building'}
        </div>
      </div>

      <Separator className="my-6" />

      {/* Posting Days */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Posting Schedule</Label>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowWeekends(!showWeekends)}
              className="text-xs text-muted-foreground hover:text-foreground"
              disabled={disabled}
            >
              {showWeekends ? "Hide Weekends" : "Include Weekends"}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((day) => (
            <div key={day} className="flex flex-col items-center gap-2">
              <Toggle
                pressed={postingDays.includes(day)}
                onPressedChange={() => handleDayToggle(day)}
                className="capitalize w-full"
                disabled={disabled}
              >
                {day}
              </Toggle>
              <div className="flex items-center gap-1">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleRemoveDay(day)}
                  disabled={disabled}
                >
                  -
                </Button>
                <span className="text-sm min-w-[1.5rem] text-center">
                  {postingDays.filter(d => d === day).length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleAddDay(day)}
                  disabled={disabled}
                >
                  +
                </Button>
              </div>
            </div>
          ))}
        </div>
        {showWeekends && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-2">
              {['saturday', 'sunday'].map((day) => (
                <div key={day} className="flex flex-col items-center gap-2">
                  <Toggle
                    pressed={postingDays.includes(day)}
                    onPressedChange={() => handleDayToggle(day)}
                    className="capitalize w-full"
                    disabled={disabled}
                  >
                    {day}
                  </Toggle>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleRemoveDay(day)}
                      disabled={disabled}
                    >
                      -
                    </Button>
                    <span className="text-sm min-w-[1.5rem] text-center">
                      {postingDays.filter(d => d === day).length}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleAddDay(day)}
                      disabled={disabled}
                    >
                      +
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule Summary */}
        {postingDays.length > 0 && (
          <div className="text-sm text-muted-foreground mt-4">
            <p className="font-medium">Your publishing schedule:</p>
            <div className="mt-2 space-y-2">
              {Array.from(new Set(postingDays))
                .sort((a, b) => {
                  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                  return days.indexOf(a) - days.indexOf(b);
                })
                .map((day) => {
                const postsOnDay = postingDays.filter(d => d === day).length;
                return (
                  <div key={day} className="flex items-center gap-2">
                    <span className="capitalize font-medium min-w-[100px]">{day}:</span>
                    <div className="flex gap-1">
                      {Array.from({ length: postsOnDay }).map((_, i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full bg-primary"
                        />
                      ))}
                    </div>
                    <span className="ml-2">{postsOnDay} post{postsOnDay !== 1 ? 's' : ''}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex justify-between items-center">
              <p className="text-xs">
                Total: {postingDays.length} post{postingDays.length !== 1 ? 's' : ''} per week
              </p>
              <div className="text-sm text-gray-500">
                {calculatePrice(postingDays.length)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      {showSaveButton && (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving || disabled || postingDays.length !== localPostingFrequency}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      )}
    </div>
  );
} 