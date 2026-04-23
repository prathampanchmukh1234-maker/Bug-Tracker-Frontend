/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import { Layout } from './components/Layout';

const Login = lazy(() => import('./pages/Login').then((module) => ({ default: module.Login })));
const Register = lazy(() => import('./pages/Register').then((module) => ({ default: module.Register })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const ProjectView = lazy(() => import('./pages/ProjectView').then((module) => ({ default: module.ProjectView })));
const ProjectSummary = lazy(() => import('./pages/ProjectSummary').then((module) => ({ default: module.ProjectSummary })));
const TicketDetail = lazy(() => import('./pages/TicketDetail').then((module) => ({ default: module.TicketDetail })));
const AuthCallback = lazy(() => import('./pages/AuthCallback').then((module) => ({ default: module.AuthCallback })));

const FullScreenLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

const PrivateRoute = () => {
  const { session, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  return session ? <Outlet /> : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ProjectProvider>
          <Suspense fallback={<FullScreenLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              
              <Route element={<PrivateRoute />}>
                <Route element={<Layout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/projects/:id" element={<ProjectView />} />
                  <Route path="/projects/:id/summary" element={<ProjectSummary />} />
                  <Route path="/tickets/:id" element={<TicketDetail />} />
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
          <Toaster position="bottom-right" />
        </ProjectProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
