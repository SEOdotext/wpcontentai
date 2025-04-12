import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from 'lucide-react';

interface Website {
  id: string;
  name: string;
  url: string;
}

interface Organisation {
  id: string;
  name: string;
  created_at: string;
  stripe_id: string | null;
  current_plan: string | null;
  credits: number;
  next_payment_date: string | null;
  websites: Website[];
}

export const OrganisationsList = () => {
  const { data: organisations, isLoading, error } = useQuery<Organisation[]>({
    queryKey: ['adminOrganisations'],
    queryFn: async () => {
      // First get organizations
      const { data: orgs, error: orgsError } = await supabase
        .from('organisations')
        .select('*')
        .order('created_at', { ascending: false });

      if (orgsError) throw orgsError;
      if (!orgs) return [];

      // For each organization, get the websites
      const organisationsWithDetails = await Promise.all(orgs.map(async (org) => {
        // Get websites for this organization
        const { data: websites, error: websitesError } = await supabase
          .from('websites')
          .select('id, name, url')
          .eq('organisation_id', org.id);

        if (websitesError) {
          console.error('Error fetching websites:', websitesError);
        }

        return {
          ...org,
          websites: websites || []
        };
      }));

      return organisationsWithDetails;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-500">
        Error loading organisations: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Organisations ({organisations?.length || 0})</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Websites</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Credits</TableHead>
            <TableHead>Next Payment</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(organisations || []).map((org) => (
            <TableRow key={org.id} className="group">
              <TableCell>{org.name}</TableCell>
              <TableCell>
                {new Date(org.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="group-hover:block">
                  {(org.websites || []).map(website => (
                    <div key={website.id} className="text-sm">
                      <a href={website.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {website.url}
                      </a>
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell>{org.current_plan || 'No Plan'}</TableCell>
              <TableCell>{org.credits}</TableCell>
              <TableCell>
                {org.next_payment_date 
                  ? new Date(org.next_payment_date).toLocaleDateString()
                  : 'N/A'
                }
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}; 