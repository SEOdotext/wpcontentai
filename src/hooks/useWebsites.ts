import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Database } from '@/types/supabase';

interface Website {
  id: string;
  name: string;
  url: string;
}

export const useWebsites = () => {
  const supabase = useSupabaseClient<Database>();
  const [websites, setWebsites] = useState<Website[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    fetchWebsites();
  }, []);

  const fetchWebsites = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('websites')
        .select('id, name, url')
        .order('name');

      if (fetchError) throw fetchError;
      setWebsites(data || []);
    } catch (err) {
      console.error('Error fetching websites:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch websites'));
    } finally {
      setLoading(false);
    }
  };

  return { websites, loading, error, refetch: fetchWebsites };
}; 