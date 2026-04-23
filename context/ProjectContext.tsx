import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { apiUrl } from '../utils/api';

interface Project {
  id: string;
  title: string;
  description: string;
  owner_id: string;
  userRole?: string;
  member_count?: number;
  members?: { role: string; user: { id: string; name: string; avatar_url?: string } }[];
  updated_at?: string;
  created_at?: string;
}

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  fetchProjects: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  const fetchProjects = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiUrl('/api/projects'), {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setProjects(data);
      } else {
        setError(data.error || 'Failed to fetch projects');
      }
    } catch (err: any) {
      console.error('Error fetching projects:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const handleFocus = () => { if (session) fetchProjects(); };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [session, fetchProjects]);

  return (
    <ProjectContext.Provider value={{ projects, activeProject, setActiveProject, fetchProjects, loading, error }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};
