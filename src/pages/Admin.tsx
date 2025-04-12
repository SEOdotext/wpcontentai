import React from 'react';
import { useAdmin } from '@/context/AdminContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';

const Admin = () => {
  const { isAdmin, isLoading } = useAdmin();

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
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage user accounts and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">View Users</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>Configure system-wide settings</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">Manage Settings</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analytics</CardTitle>
            <CardDescription>View system-wide analytics and metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">View Analytics</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin; 