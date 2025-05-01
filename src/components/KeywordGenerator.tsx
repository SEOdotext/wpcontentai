import React, { useState } from 'react';
import { Tag, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import KeywordBadge from './KeywordBadge';
import { toast } from 'sonner';

const mockKeywords = [
  { text: 'wordpress', difficulty: 'medium' as const },
  { text: 'wordpress plugins', difficulty: 'hard' as const },
  { text: 'content management', difficulty: 'easy' as const },
  { text: 'speed optimization', difficulty: 'medium' as const },
  { text: 'website themes', difficulty: 'easy' as const },
];

interface SuggestedKeyword {
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  volume?: string;
  cpc?: string;
}

const KeywordGenerator: React.FC = () => {
  const [topicInput, setTopicInput] = useState('');
  const [generatedKeywords, setGeneratedKeywords] = useState<SuggestedKeyword[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<SuggestedKeyword[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    if (!topicInput.trim()) {
      toast({
        title: "Topic Required",
        description: "Please enter a topic to generate keywords",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    // Simulate API call with timeout
    setTimeout(() => {
      // Randomize results a bit for demo
      const shuffled = [...mockKeywords].sort(() => 0.5 - Math.random());
      setGeneratedKeywords(shuffled.slice(0, 4));
      setIsGenerating(false);
      
      toast({
        title: "Keywords Generated",
        description: `Generated keywords for "${topicInput}"`,
      });
    }, 1500);
  };

  const handleKeywordSelect = (keyword: SuggestedKeyword) => {
    if (selectedKeywords.some(k => k.text === keyword.text)) {
      setSelectedKeywords(selectedKeywords.filter(k => k.text !== keyword.text));
    } else {
      setSelectedKeywords([...selectedKeywords, keyword]);
    }
  };

  const handleKeywordInsert = () => {
    if (selectedKeywords.length === 0) {
      toast({
        title: "No Keywords Selected",
        description: "Please select at least one keyword",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "Keywords Inserted",
      description: `${selectedKeywords.length} keywords have been inserted into your content`,
    });
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="generate" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            <span>Generate Keywords</span>
          </TabsTrigger>
          <TabsTrigger value="insert" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span>Insert Keywords</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="generate">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter a topic (e.g., WordPress themes)"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? 'Generating...' : 'Generate'}
              </Button>
            </div>
            
            {generatedKeywords.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Suggested Keywords:</h3>
                <div className="flex flex-wrap gap-2">
                  {generatedKeywords.map((keyword, index) => (
                    <div 
                      key={index}
                      onClick={() => handleKeywordSelect(keyword)}
                      className="cursor-pointer"
                    >
                      <KeywordBadge 
                        keyword={keyword.text} 
                        difficulty={keyword.difficulty}
                        className={selectedKeywords.some(k => k.text === keyword.text) ? 'ring-2 ring-primary' : ''}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {selectedKeywords.length > 0 && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">Selected Keywords:</h3>
                  <Button size="sm" variant="outline" onClick={() => setSelectedKeywords([])}>
                    Clear
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedKeywords.map((keyword, index) => (
                    <KeywordBadge 
                      key={index} 
                      keyword={keyword.text} 
                      difficulty={keyword.difficulty}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="insert">
          <div className="space-y-4">
            {selectedKeywords.length > 0 ? (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium">Keywords to Insert:</h3>
                  <Button size="sm" variant="outline" onClick={() => setSelectedKeywords([])}>
                    Clear
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedKeywords.map((keyword, index) => (
                    <KeywordBadge 
                      key={index} 
                      keyword={keyword.text} 
                      difficulty={keyword.difficulty}
                    />
                  ))}
                </div>
                <Button onClick={handleKeywordInsert} className="w-full">
                  Insert Keywords into Content
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Tag className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="mb-2">No keywords selected</p>
                <p className="text-sm">Switch to the Generate tab to select keywords</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KeywordGenerator;
