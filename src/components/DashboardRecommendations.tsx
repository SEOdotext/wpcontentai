import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import WeeklyPlanningButton from './WeeklyPlanningButton';
import WordPressIntegrationStep from './WordPressIntegrationStep';

const DashboardRecommendations: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="flex flex-col gap-6">
      <Card className="w-full">
        <CardHeader className="pb-2 p-4">
          <CardTitle className="text-lg font-medium">
            Recommendations & Opportunities
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4 p-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center">
              <Sparkles className="h-4 w-4 mr-1 text-primary" />
              Content Creation
            </h3>
            <div className="grid gap-2">
              <Button 
                variant="outline" 
                className="w-full justify-start border-primary/20 hover:bg-primary/5 hover:border-primary/30 transition-colors"
                onClick={() => navigate('/create')}
              >
                <PlusCircle className="mr-2 h-4 w-4 text-primary" />
                Add New Article
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start border-primary/20 hover:bg-primary/5 hover:border-primary/30 transition-colors"
                onClick={() => navigate('/calendar')}
              >
                <Sparkles className="mr-2 h-4 w-4 text-primary" />
                Generate New Article Ideas
              </Button>
              <WeeklyPlanningButton />
            </div>
          </div>
        </CardContent>
      </Card>

      <WordPressIntegrationStep />
    </div>
  );
};

export default DashboardRecommendations; 