import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface AdminContextType {
  isAdmin: boolean;
  isLoading: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const ADMIN_EMAILS = ['philipleth@gmail.com', 'philip@openocean.dk'];

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      const isUserAdmin = ADMIN_EMAILS.includes(user.email || '');
      setIsAdmin(isUserAdmin);
      setIsLoading(false);
    };

    checkAdminAccess();
  }, [user]);

  return (
    <AdminContext.Provider value={{ isAdmin, isLoading }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}; 