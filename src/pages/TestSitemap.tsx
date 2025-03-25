import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search } from 'lucide-react';

const TestSitemap = () => {
  const [sitemapUrl, setSitemapUrl] = useState('https://lejfesten.dk/sitemap_index.xml');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testSitemap = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      console.log(`Testing sitemap at: ${sitemapUrl}`);
      
      const { data, error } = await supabase.functions.invoke('get-sitemap-pages', {
        body: { 
          website_id: 'sample',
          website_url: 'https://lejfesten.dk',
          custom_sitemap_url: sitemapUrl
        }
      });
      
      if (error) {
        console.error('Error calling function:', error);
        setError(`Error: ${error.message}`);
        return;
      }
      
      if (data.error) {
        console.error('Function returned error:', data.error);
        setError(`Function error: ${data.error}. ${data.message || ''}`);
        return;
      }
      
      console.log(`Success! Found ${data.pages?.length || 0} pages from sitemap at ${data.sitemap_url}`);
      setResults(data);
    } catch (err: any) {
      console.error('Exception:', err);
      setError(`Exception: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Test Sitemap Function</CardTitle>
          <CardDescription>
            Test the sitemap function with a specific URL to verify it can handle sitemap index files.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="sitemapUrl">Sitemap URL</Label>
              <div className="flex gap-2">
                <Input 
                  id="sitemapUrl" 
                  value={sitemapUrl} 
                  onChange={(e) => setSitemapUrl(e.target.value)}
                  placeholder="https://example.com/sitemap.xml"
                  className="flex-1"
                />
                <Button onClick={testSitemap} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Test Sitemap
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {error && (
              <div className="p-4 bg-red-50 text-red-800 rounded-md">
                {error}
              </div>
            )}
            
            {results && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 text-green-800 rounded-md">
                  Found {results.pages?.length || 0} pages from sitemap at {results.sitemap_url}
                </div>
                
                {results.pages && results.pages.length > 0 && (
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left">#</th>
                          <th className="p-2 text-left">Title</th>
                          <th className="p-2 text-left">URL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.pages.slice(0, 10).map((page: any, index: number) => (
                          <tr key={page.id} className="border-t">
                            <td className="p-2">{index + 1}</td>
                            <td className="p-2">{page.title}</td>
                            <td className="p-2">
                              <a 
                                href={page.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {page.url}
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {results.pages.length > 10 && (
                      <div className="p-2 text-center text-muted-foreground">
                        Showing 10 of {results.pages.length} pages
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestSitemap; 