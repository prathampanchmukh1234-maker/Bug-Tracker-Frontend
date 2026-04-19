import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useProjects } from '../context/ProjectContext';
import { LayoutDashboard, FolderKanban, Plus, ChevronRight, Hash } from 'lucide-react';
import { cn } from './Badge';

export const Sidebar: React.FC = () => {
  const { projects, activeProject, setActiveProject } = useProjects();
  const navigate = useNavigate();

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-[calc(100vh-64px)] overflow-y-auto">
      <div className="p-4 space-y-2">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
            isActive 
              ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold" 
              : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
          )}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-sm">Dashboard</span>
        </NavLink>

        <div className="pt-4">
          <div className="flex items-center justify-between mb-2 px-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Projects</span>
            <button 
              onClick={() => navigate('/dashboard?new=true')}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          
          <div className="space-y-1">
            {projects.map((project) => (
              <NavLink
                key={project.id}
                to={`/projects/${project.id}`}
                end={false}
                onClick={() => setActiveProject(project)}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm",
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold"
                    : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <FolderKanban className="w-4 h-4 flex-shrink-0" />
                <span className="truncate flex-1">{project.title}</span>
              </NavLink>
            ))}
            
            {projects.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-slate-400 italic">No projects yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
