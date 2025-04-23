import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Sparkles, ArrowRight, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import WeeklyPlanningButton from './WeeklyPlanningButton';

const DashboardRecommendations: React.FC = () => {
  const navigate = useNavigate();
  
  // Log component rendering
  console.log('Rendering DashboardRecommendations component');
  
  return (
    <Card className="w-full overflow-hidden border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium text-primary">
          Recommendations & Opportunities
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-2">
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
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center">
            <TrendingUp className="h-4 w-4 mr-1 text-primary" />
            Content Opportunities
          </h3>
          <div className="space-y-2">
            <motion.div 
              className="p-3 border border-primary/20 rounded-md hover:bg-primary/5 transition-colors"
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-sm text-primary">Seasonal Content</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create content around upcoming seasonal events and holidays
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
            
            <motion.div 
              className="p-3 border border-primary/20 rounded-md hover:bg-primary/5 transition-colors"
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-sm text-primary">Content Gaps</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fill gaps in your content calendar with relevant topics
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
            
            <motion.div 
              className="p-3 border border-primary/20 rounded-md hover:bg-primary/5 transition-colors"
              whileHover={{ scale: 1.01 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-sm text-primary">Trending Topics</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create content around trending topics in your industry
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardRecommendations; 