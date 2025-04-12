import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface Stats {
  websites: number;
  organisations: number;
  users: number;
}

export const AdminStats = () => {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ['adminStats'],
    queryFn: async () => {
      // First get all organisations we have access to
      const { data: orgs, error: orgsError } = await supabase
        .from('organisations')
        .select('id');

      if (orgsError) {
        console.error('Error fetching organisations:', orgsError);
        throw orgsError;
      }

      if (!orgs?.length) return { websites: 0, organisations: orgs.length, users: 0 };

      // Get count of websites for these organisations
      const { count: websitesCount, error: websitesError } = await supabase
        .from('websites')
        .select('id', { count: 'exact', head: true })
        .in('organisation_id', orgs.map(org => org.id));

      if (websitesError) {
        console.error('Error counting websites:', websitesError);
        throw websitesError;
      }

      // Get count of unique users through organisation memberships
      const { data: memberships, error: usersError } = await supabase
        .from('organisation_memberships')
        .select('member_id')
        .in('organisation_id', orgs.map(org => org.id));

      if (usersError) {
        console.error('Error counting users:', usersError);
        throw usersError;
      }

      // Count unique member_ids
      const uniqueUsers = new Set(memberships?.map(m => m.member_id));
      const usersCount = uniqueUsers.size;

      console.log('Stats response:', { websitesCount, orgs: orgs.length, usersCount });

      return {
        websites: websitesCount || 0,
        organisations: orgs.length,
        users: usersCount || 0
      };
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Websites',
      value: stats?.websites || 0,
    },
    {
      title: 'Organisations',
      value: stats?.organisations || 0,
    },
    {
      title: 'Users',
      value: stats?.users || 0,
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {statCards.map((stat) => (
        <Card 
          key={stat.title}
          className="p-4"
        >
          <div className="text-2xl font-bold">{stat.value}</div>
          <div className="text-sm text-gray-500">{stat.title}</div>
        </Card>
      ))}
    </div>
  );
};