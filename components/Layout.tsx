import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const Layout: React.FC = () => {
  const { session, loading } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      <Navbar onMenuToggle={() => setIsSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 md:p-8">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
