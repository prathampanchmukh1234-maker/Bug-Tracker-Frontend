import React, { useState, useEffect } from 'react';
import { useProjects } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Folder, Users, Calendar, ArrowRight } from 'lucide-react';
import { Modal } from '../components/Modal';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../components/Badge';
import toast from 'react-hot-toast';
import { apiUrl } from '../utils/api';

export const Dashboard: React.FC = () => {
  const { projects, fetchProjects, loading, error } = useProjects();
  const { session, user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ title: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  useEffect(() => {
    const fetchMyTickets = async () => {
      if (!session?.access_token || !user?.id) {
        setLoadingTickets(false);
        return;
      }

      try {
        const response = await fetch(apiUrl('/api/tickets/assigned-summary'), {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        if (response.ok) {
          setMyTickets(await response.json());
        }
      } catch (error) {
        console.error('Failed to fetch my tickets:', error);
      } finally {
        setLoadingTickets(false);
      }
    };

    fetchMyTickets();
  }, [session?.access_token, user?.id]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsModalOpen(true);
      // Clear the query param so it doesn't reopen on refresh/back
      navigate('/dashboard', { replace: true });
    }
  }, [searchParams, navigate]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const response = await fetch(apiUrl('/api/projects'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(newProject)
      });
      
      if (response.ok) {
        toast.success('Project created successfully!');
        setIsModalOpen(false);
        setNewProject({ title: '', description: '' });
        fetchProjects();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create project');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="h-10 bg-slate-200 dark:bg-slate-800 animate-pulse rounded w-1/4" />
          <div className="h-10 bg-slate-200 dark:bg-slate-800 animate-pulse rounded w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Projects</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage and track your team's progress</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25"
        >
          <Plus className="w-5 h-5" />
          <span>New Project</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/20 rounded-xl flex items-center justify-between">
          <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">{error}</p>
          <button 
            onClick={fetchProjects}
            className="text-sm font-bold text-rose-600 dark:text-rose-400 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {myTickets.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">My Open Tickets</h2>
            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-[10px] font-bold rounded-full">{myTickets.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {myTickets.slice(0, 4).map(ticket => (
              <Link 
                key={ticket.id} 
                to={`/tickets/${ticket.id}`}
                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 transition-all group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">BT-{ticket.id.slice(0, 4).toUpperCase()}</span>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    ticket.status === 'In Progress' ? "bg-indigo-500" : "bg-slate-300"
                  )} />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-indigo-600 transition-colors mb-2">{ticket.title}</h4>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500">{ticket.project?.title}</span>
                  <div className={cn(
                    "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                    ticket.priority === 'high' || ticket.priority === 'critical' ? "bg-rose-50 text-rose-600 dark:bg-rose-900/20" : "bg-slate-100 text-slate-600 dark:bg-slate-800"
                  )}>
                    {ticket.priority}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Projects</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className="group bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 transition-colors">
                <Folder className="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <Users className="w-4 h-4" />
                  <span className="text-xs font-bold">{project.member_count ?? project.members?.length ?? 0}</span>
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 transition-colors">
              {project.title}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 mb-6 flex-1">
              {project.description || 'No description provided.'}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800/50">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {project.updated_at ? formatDistanceToNow(new Date(project.updated_at), { addSuffix: true }) : 'Recently'}
                </span>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        ))}

        {projects.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="inline-flex p-4 bg-slate-50 dark:bg-slate-800 rounded-full mb-4">
              <Folder className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No projects yet</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8">Create your first project to start tracking bugs</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
            >
              Create Project
            </button>
          </div>
        )}
      </div>
    </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Project"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Project Title</label>
            <input
              type="text"
              value={newProject.title}
              onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
              placeholder="e.g. Mobile App Redesign"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Description</label>
            <textarea
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white h-32 resize-none"
              placeholder="What is this project about?"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-3 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {creating ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
