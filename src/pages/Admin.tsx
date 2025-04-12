import React from 'react';
import { useAdmin } from '@/context/AdminContext';
import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { AdminStats } from '@/components/admin/AdminStats';
import { OrganisationsList } from '@/components/admin/OrganisationsList';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from 'react-router-dom';

const AdminLayout = () => {
  const { isAdmin, isLoading } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname.split('/').pop() || 'dashboard';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Checking admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Tabs value={currentPath} onValueChange={(value) => navigate(`/admin/${value}`)}>
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="organisations">Organisations</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Routes>
        <Route path="/" element={<AdminStats />} />
        <Route path="/dashboard" element={<AdminStats />} />
        <Route path="/organisations" element={<OrganisationsList />} />
      </Routes>
    </div>
  );
};

export default AdminLayout; 