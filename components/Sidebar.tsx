import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useProjects } from '../context/ProjectContext';
import { LayoutDashboard, FolderKanban, Plus, X } from 'lucide-react';
import { cn } from './Badge';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { projects, activeProject, setActiveProject } = useProjects();
  const navigate = useNavigate();

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-950/40 transition-opacity md:hidden',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed inset-y-16 left-0 z-50 w-[min(18rem,calc(100vw-1.5rem))] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto transition-transform md:static md:inset-auto md:z-0 md:w-64 md:translate-x-0 md:h-[calc(100vh-64px)]',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
      <div className="p-4 space-y-2">
        <div className="mb-2 flex items-center justify-between md:hidden">
          <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Navigation</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close navigation menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <NavLink
          to="/dashboard"
          onClick={onClose}
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
              onClick={() => {
                navigate('/dashboard?new=true');
                onClose?.();
              }}
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
                onClick={() => {
                  setActiveProject(project);
                  onClose?.();
                }}
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
    </>
  );
};
