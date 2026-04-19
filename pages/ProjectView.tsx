import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { KanbanBoard } from '../components/KanbanBoard';
import { Modal } from '../components/Modal';
import { Plus, Search, Filter, Settings, LayoutGrid, List, Trash2, X, ChevronRight, BarChart3, Users, CheckSquare, Square, Calendar, Hash } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { PriorityBadge, TypeBadge, StatusBadge, cn } from '../components/Badge';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export const ProjectView: React.FC = () => {
  const { id } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const { fetchProjects, setActiveProject } = useProjects();
  const [project, setProject] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium',
    type: 'bug',
    assignee_id: '',
    status: 'To Do',
    sprint_name: '',
    labels: [] as string[],
    due_date: ''
  });
  const [labelInput, setLabelInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = searchParams.get('view') || 'board';
  const statusFilter = searchParams.get('status') || '';
  const priorityFilter = searchParams.get('priority') || '';
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [swimlaneBy, setSwimlaneBy] = useState<'none' | 'assignee'>('none');
  const skipFilterEffect = useRef(false);

  const setViewMode = (view: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('view', view);
    setSearchParams(newParams);
  };

  const setStatusFilter = (status: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (status) newParams.set('status', status);
    else newParams.delete('status');
    setSearchParams(newParams);
  };

  const setPriorityFilter = (priority: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (priority) newParams.set('priority', priority);
    else newParams.delete('priority');
    setSearchParams(newParams);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [inviting, setInviting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingMember, setRemovingMember] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<any | null>(null);
  const [deleteProjectModalOpen, setDeleteProjectModalOpen] = useState(false);
  const [editProject, setEditProject] = useState({ title: '', description: '', workflow_statuses: [] as string[] });

  const projectColor = project ? `hsl(${(project.title.length * 40) % 360}, 60%, 45%)` : '#6366f1';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'c' && e.target === document.body) {
        setIsModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchData = async (search: string, status: string, priority: string, view: string) => {
    if (!session || !id) return;
    try {
      const params = new URLSearchParams({ projectId: id! });
      if (status) params.append('status', status);
      if (priority) params.append('priority', priority);
      if (search) params.append('search', search);

      const [pRes, tRes] = await Promise.all([
        fetch(`/api/projects/${id}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        fetch(`/api/tickets?${params.toString()}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
      ]);

      if (pRes.ok) {
        const data = await pRes.json();
        if (data) {
          setProject(data);
          setEditProject({ 
            title: data.title, 
            description: data.description || '',
            workflow_statuses: data.workflow_statuses || ['To Do', 'In Progress', 'Done']
          });
        }
      }
      if (tRes.ok) setTickets(await tRes.json());
    } catch (error) {
      console.error('Error fetching project data:', error);
    } finally {
      setLoading(false);
    }
  };

  useLayoutEffect(() => {
    // Reset filters when project changes
    skipFilterEffect.current = true;
    setSearchQuery('');
    setDebouncedSearch('');
    setSearchParams(new URLSearchParams({ view: 'board' }));
    setProject(null);
    setTickets([]);
    setLoading(true);
    fetchData('', '', '', 'board');
    
    // reset skip ref after layout effect
    setTimeout(() => {
      skipFilterEffect.current = false;
    }, 100);
  }, [id, session]);

  useEffect(() => {
    // Only refetch tickets when filters change
    if (skipFilterEffect.current) return;
    fetchData(debouncedSearch, statusFilter, priorityFilter, viewMode);
  }, [debouncedSearch, statusFilter, priorityFilter, viewMode]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ ...newTicket, project_id: id })
      });

      if (response.ok) {
        toast.success('Ticket created!');
        setIsModalOpen(false);
        setNewTicket({ 
          title: '', 
          description: '', 
          priority: 'medium', 
          type: 'bug', 
          assignee_id: '', 
          status: 'To Do', 
          sprint_name: '', 
          labels: [], 
          due_date: '' 
        });
        fetchData(debouncedSearch, statusFilter, priorityFilter, viewMode);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create ticket');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    try {
      const response = await fetch(`/api/projects/${id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole })
      });

      if (response.ok) {
        toast.success('Member invited!');
        setInviteModalOpen(false);
        setInviteEmail('');
        fetchData(debouncedSearch, statusFilter, priorityFilter, viewMode);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to invite member');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(editProject)
      });

      if (response.ok) {
        toast.success('Project updated!');
        setSettingsModalOpen(false);
        fetchData(debouncedSearch, statusFilter, priorityFilter, viewMode);
        fetchProjects(); // Refresh sidebar
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update project');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteProject = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (response.ok) {
        toast.success('Project deleted successfully');
        setDeleteProjectModalOpen(false);
        setSettingsModalOpen(false);
        setActiveProject(null);
        fetchProjects();
        navigate('/dashboard');
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete project');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    if (selectedTickets.length === 0) return;
    const loadingToast = toast.loading(`Updating ${selectedTickets.length} tickets...`);
    try {
      const results = await Promise.allSettled(
        selectedTickets.map(async ticketId => {
          const res = await fetch(`/api/tickets/${ticketId}/status`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({ status })
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Failed for ${ticketId}`);
          }
        })
      );
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) {
        toast.error(`${failed} ticket(s) failed to update`, { id: loadingToast });
      } else {
        toast.success('All tickets updated!', { id: loadingToast });
      }
      setSelectedTickets([]);
      fetchData(debouncedSearch, statusFilter, priorityFilter, viewMode);
    } catch (error) {
      toast.error('Failed to update tickets', { id: loadingToast });
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    setRemovingMember(true);
    try {
      const res = await fetch(`/api/projects/${id}/members/${memberToRemove.user.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        toast.success('Member removed');
        setMemberToRemove(null);
        fetchData(debouncedSearch, statusFilter, priorityFilter, viewMode);
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove member');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setRemovingMember(false);
    }
  };

  const toggleTicketSelection = (ticketId: string) => {
    setSelectedTickets(prev => 
      prev.includes(ticketId) ? prev.filter(id => id !== ticketId) : [...prev, ticketId]
    );
  };

  const handleCompleteSprint = async (sprintName: string) => {
    if (!window.confirm(`Complete ${sprintName}? Unfinished items will be moved to the backlog.`)) return;
    try {
      const response = await fetch(`/api/tickets/complete-sprint/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ sprintName })
      });
      if (response.ok) {
        toast.success('Sprint completed');
        fetchData(debouncedSearch, statusFilter, priorityFilter, viewMode);
      }
    } catch (error) {
      toast.error('Failed to complete sprint');
    }
  };

  const openAddTicketModal = (status?: string) => {
    if (status) {
      setNewTicket(prev => ({ ...prev, status }));
    }
    setIsModalOpen(true);
  };

  const filtersActive = !!(debouncedSearch || statusFilter || priorityFilter);

  if (loading) return <div className="animate-pulse space-y-4">
    <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
    <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded" />
  </div>;

  if (!project) return (
    <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Project Not Found</h3>
      <p className="text-slate-500 dark:text-slate-400 mb-6">The project you are looking for does not exist or you don't have access.</p>
      <Link
        to="/dashboard"
        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-8">
        <div className="flex items-start gap-4 max-w-2xl">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-lg"
            style={{ backgroundColor: projectColor }}
          >
            {project.title[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{project.title}</h1>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider">Active</span>
            </div>
            <p className="text-slate-500 dark:text-slate-400">{project.description}</p>
          </div>
        </div>

          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {project.members?.map((m: any) => (
                <div key={m.user.id} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-950 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400 shadow-sm" title={m.user.name}>
                  {m.user.name[0].toUpperCase()}
                </div>
              ))}
              {['owner', 'admin', 'manager'].includes(project.userRole) && (
                <button 
                  onClick={() => setInviteModalOpen(true)}
                  className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>
            
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2" />
  
            <button 
              onClick={() => navigate(`/projects/${id}/summary`)}
              className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title="Project Summary"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
  
            {['owner', 'admin'].includes(project.userRole) && (
              <button 
                onClick={() => setSettingsModalOpen(true)}
                className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                title="Project Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
  
            {project.userRole !== 'viewer' && (
              <button
                onClick={() => openAddTicketModal()}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25 group relative"
              >
                <Plus className="w-5 h-5" />
                <span>Create</span>
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Press 'C' to create</span>
              </button>
            )}
          </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search issues..."
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white text-sm"
            />
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            <button 
              onClick={() => { setStatusFilter(''); setPriorityFilter(''); setSearchQuery(''); setDebouncedSearch(''); }}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap", !filtersActive ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}
            >
              All Issues
            </button>
            <button 
              onClick={() => { setSearchQuery(session?.user?.id || ''); setDebouncedSearch(session?.user?.id || ''); }}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap", debouncedSearch === session?.user?.id ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}
            >
              My Issues
            </button>
            <button 
              onClick={() => setPriorityFilter('high')}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap", priorityFilter === 'high' ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}
            >
              High Priority
            </button>
            <button 
              onClick={() => setStatusFilter('To Do')}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap", statusFilter === 'To Do' ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800")}
            >
              To Do
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {viewMode === 'board' && (
            <div className="flex items-center gap-2 mr-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Group by:</span>
              <select 
                value={swimlaneBy}
                onChange={(e) => setSwimlaneBy(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-slate-600 dark:text-slate-400 outline-none cursor-pointer hover:text-indigo-600"
              >
                <option value="none">None</option>
                <option value="assignee">Assignee</option>
              </select>
            </div>
          )}

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <button 
              onClick={() => setViewMode('board')}
              className={cn("p-1.5 rounded-lg transition-all", viewMode === 'board' ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600")}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn("p-1.5 rounded-lg transition-all", viewMode === 'list' ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600")}
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('backlog')}
              className={cn("p-1.5 rounded-lg transition-all", viewMode === 'backlog' ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600")}
              title="Backlog"
            >
              <Hash className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('roadmap')}
              className={cn("p-1.5 rounded-lg transition-all", viewMode === 'roadmap' ? "bg-white dark:bg-slate-800 shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600")}
              title="Roadmap"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 relative">
        {tickets.length > 0 ? (
          <>
            {viewMode === 'board' && (
              <KanbanBoard
                projectId={id!}
                tickets={tickets}
                onTicketUpdate={() => fetchData(debouncedSearch, statusFilter, priorityFilter, viewMode)}
                swimlaneBy={swimlaneBy}
                onAddTicket={(status) => {
                  setNewTicket(prev => ({ ...prev, status }));
                  setIsModalOpen(true);
                }}
                workflowStatuses={project?.workflow_statuses}
              />
            )}

            {viewMode === 'list' && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-4 w-10">
                        <button 
                          onClick={() => setSelectedTickets(selectedTickets.length === tickets.length ? [] : tickets.map(t => t.id))}
                          className="text-slate-400 hover:text-indigo-600"
                        >
                          {selectedTickets.length === tickets.length ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                        </button>
                      </th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Key</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Summary</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Assignee</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Priority</th>
                      <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr key={ticket.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                        <td className="p-4">
                          <button 
                            onClick={() => toggleTicketSelection(ticket.id)}
                            className={cn("transition-colors", selectedTickets.includes(ticket.id) ? "text-indigo-600" : "text-slate-300 group-hover:text-slate-400")}
                          >
                            {selectedTickets.includes(ticket.id) ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                          </button>
                        </td>
                        <td className="p-4 text-xs font-bold text-slate-400">BT-{ticket.id.slice(0, 4).toUpperCase()}</td>
                        <td className="p-4">
                          <Link to={`/tickets/${ticket.id}`} className="text-sm font-medium text-slate-900 dark:text-white hover:text-indigo-600 transition-colors">
                            {ticket.title}
                          </Link>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">
                              {ticket.assignee?.name?.[0].toUpperCase() || '?'}
                            </div>
                            <span className="text-xs text-slate-600 dark:text-slate-400">{ticket.assignee?.name || 'Unassigned'}</span>
                          </div>
                        </td>
                        <td className="p-4"><PriorityBadge priority={ticket.priority} /></td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              ticket.status === 'Done' ? "bg-emerald-500" : ticket.status === 'In Progress' ? "bg-indigo-500" : "bg-slate-300"
                            )} />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{ticket.status}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {viewMode === 'backlog' && (
              <div className="space-y-6">
                {/* Sprints grouped containers */}
                {Object.entries(
                  tickets.reduce((acc: any, t) => {
                    const sprint = t.sprint_name || 'Backlog';
                    if (!acc[sprint]) acc[sprint] = [];
                    acc[sprint].push(t);
                    return acc;
                  }, {})
                ).sort(([a], [b]) => (a === 'Backlog' ? 1 : b === 'Backlog' ? -1 : a.localeCompare(b))).map(([sprintName, sprintTickets]: [string, any]) => (
                  <div key={sprintName} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {sprintName === 'Backlog' ? <List className="w-4 h-4 text-slate-400" /> : <Calendar className="w-4 h-4 text-indigo-500" />}
                          {sprintName}
                        </h3>
                        <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] font-bold rounded-full">
                          {sprintTickets.length} issues
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {sprintName !== 'Backlog' && (
                          <button 
                            onClick={() => handleCompleteSprint(sprintName)}
                            className="px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                          >
                            Complete Sprint
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setNewTicket({ ...newTicket, sprint_name: sprintName === 'Backlog' ? '' : sprintName });
                            setIsModalOpen(true);
                          }}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 ml-2"
                        >
                          + Create issue
                        </button>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {sprintTickets.map((ticket: any) => (
                        <Link 
                          key={ticket.id} 
                          to={`/tickets/${ticket.id}`}
                          className="flex items-center gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                        >
                          <TypeBadge type={ticket.type} />
                          <span className="text-xs font-bold text-slate-400 w-16">BT-{ticket.id.slice(0, 4).toUpperCase()}</span>
                          <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate">{ticket.title}</span>
                          <PriorityBadge priority={ticket.priority} />
                          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">
                            {ticket.assignee?.name?.[0].toUpperCase() || '?'}
                          </div>
                          <StatusBadge status={ticket.status} />
                        </Link>
                      ))}
                      {sprintTickets.length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-xs italic">
                          No issues in this section.
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'roadmap' && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-500" />
                    Roadmap
                  </h3>
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-200" /> To Do</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500" /> In Progress</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Done</div>
                  </div>
                </div>
                <div className="p-6">
                  {tickets.filter(t => t.due_date).length > 0 ? (
                    <div className="space-y-6">
                      {tickets
                        .filter(t => t.due_date)
                        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                        .map(ticket => {
                          const dueDate = new Date(ticket.due_date);
                          const isOverdue = dueDate < new Date() && ticket.status !== 'Done';
                          
                          return (
                            <div key={ticket.id} className="relative">
                              <div className="flex items-center justify-between mb-2">
                                <Link to={`/tickets/${ticket.id}`} className="text-sm font-bold text-slate-900 dark:text-white hover:text-indigo-600 transition-colors">
                                  {ticket.title}
                                </Link>
                                <span className={cn("text-[10px] font-bold uppercase tracking-widest", isOverdue ? "text-rose-500" : "text-slate-400")}>
                                  Due {format(dueDate, 'MMM d, yyyy')}
                                </span>
                              </div>
                              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                                <div 
                                  className={cn(
                                    "h-full transition-all rounded-full",
                                    ticket.status === 'Done' ? "bg-emerald-500 w-full" : 
                                    ticket.status === 'In Progress' ? "bg-indigo-500 w-1/2" : 
                                    "bg-slate-300 w-1/4"
                                  )}
                                />
                              </div>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">BT-{ticket.id.slice(0, 4).toUpperCase()}</span>
                                <StatusBadge status={ticket.status} />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="py-20 text-center">
                      <Calendar className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No tickets with due dates</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">Add due dates to your tickets to see them in the roadmap.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedTickets.length > 0 && (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 z-50 animate-in fade-in slide-in-from-bottom-4">
                <span className="text-sm font-bold">{selectedTickets.length} tickets selected</span>
                <div className="h-4 w-px bg-slate-700" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Change Status:</span>
                  {['To Do', 'In Progress', 'Done'].map(status => (
                    <button
                      key={status}
                      onClick={() => handleBulkStatusChange(status)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors"
                    >
                      {status}
                    </button>
                  ))}
                </div>
                <button 
                  onClick={() => setSelectedTickets([])}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 py-20">
            <div className="p-4 bg-white dark:bg-slate-800 rounded-full mb-4 shadow-sm">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            {filtersActive ? (
              <>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No tickets match your filters</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs text-center">Try adjusting your search or filter criteria.</p>
                <button
                  onClick={() => { setSearchQuery(''); setStatusFilter(''); setPriorityFilter(''); }}
                  className="px-6 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                >
                  Clear Filters
                </button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No tickets yet</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs text-center">Get started by creating the first ticket for this project.</p>
                <button
                  onClick={() => openAddTicketModal()}
                  className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25"
                >
                  Create First Ticket
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite Team Member"
      >
        <form onSubmit={handleInviteMember} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Email Address</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
              placeholder="colleague@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
            >
              <option value="owner">Owner (Manage Project)</option>
              <option value="admin">Admin (Manage Members)</option>
              <option value="member">Member (Can edit)</option>
              <option value="viewer">Viewer (Read only)</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setInviteModalOpen(false)}
              className="flex-1 py-3 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviting}
              className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {inviting ? 'Inviting...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        title="Project Settings"
        size="lg"
      >
        <form onSubmit={handleUpdateProject} className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Project Info</p>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Project Title</label>
                    <input
                      type="text"
                      value={editProject.title}
                      onChange={(e) => setEditProject({ ...editProject, title: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 ml-1 block text-sm font-bold text-slate-700 dark:text-slate-300">Description</label>
                    <textarea
                      value={editProject.description}
                      onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
                      className="h-24 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                      placeholder="Add a short project summary"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Workflow</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Comma-separated statuses used across the board.</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                    {editProject.workflow_statuses.length} stages
                  </span>
                </div>
                <input
                  type="text"
                  value={editProject.workflow_statuses.join(', ')}
                  onChange={(e) => setEditProject({ ...editProject, workflow_statuses: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  placeholder="e.g. To Do, In Progress, Review, Done"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {editProject.workflow_statuses.map((status) => (
                    <span key={status} className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                      {status}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Team Members</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Manage access without leaving the project.</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                    {project.members?.length ?? 0} total
                  </span>
                </div>

                <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {project.members?.map((m: any) => (
                    <div key={m.user.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                          {m.user.name[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{m.user.name}</p>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{m.role}</p>
                        </div>
                      </div>
                      {project.userRole === 'owner' && m.user.id !== session?.user?.id && (
                        <button
                          type="button"
                          onClick={() => setMemberToRemove(m)}
                          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/10"
                          aria-label={`Remove ${m.user.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {project?.userRole === 'owner' && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/30 dark:bg-rose-950/10">
                  <h4 className="text-sm font-bold uppercase tracking-[0.2em] text-rose-600">Danger Zone</h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Deleting a project permanently removes its tickets, comments, and history.</p>
                  <button
                    type="button"
                    onClick={() => setDeleteProjectModalOpen(true)}
                    disabled={deleting}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 py-2.5 font-bold text-rose-600 transition-all hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/40 dark:hover:bg-rose-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    {deleting ? 'Deleting...' : 'Delete Project'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setSettingsModalOpen(false)}
              className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="flex-1 rounded-xl bg-indigo-600 py-3 font-bold text-white transition-all hover:bg-indigo-700 disabled:opacity-50"
            >
              {updating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={deleteProjectModalOpen}
        onClose={() => {
          if (!deleting) {
            setDeleteProjectModalOpen(false);
          }
        }}
        title="Delete Project"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-orange-50 p-4 dark:border-rose-900/30 dark:from-rose-950/20 dark:via-slate-900 dark:to-orange-950/10">
            <p className="text-base font-semibold text-slate-900 dark:text-white">
              Delete <span className="text-rose-600">{project?.title}</span> permanently?
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              This action cannot be undone and will delete all associated tickets, comments, and project history.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">About To Be Deleted</p>
            <div className="mt-3 flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
                style={{ backgroundColor: projectColor }}
              >
                {project?.title?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{project?.title}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {(project?.members?.length ?? 0)} members and {(tickets?.length ?? 0)} visible tickets in this view.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDeleteProjectModalOpen(false)}
              disabled={deleting}
              className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteProject}
              disabled={deleting}
              className="flex-1 rounded-xl bg-rose-600 py-3 font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete Project'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!memberToRemove}
        onClose={() => {
          if (!removingMember) {
            setMemberToRemove(null);
          }
        }}
        title="Remove Member"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-900/30 dark:bg-rose-950/10">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Remove <span className="text-rose-600">{memberToRemove?.user.name}</span> from this project?
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              They will lose access to project tickets, comments, and member-only actions immediately.
            </p>
          </div>

          {memberToRemove && (
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                {memberToRemove.user.name[0].toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{memberToRemove.user.name}</p>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{memberToRemove.role}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMemberToRemove(null)}
              disabled={removingMember}
              className="flex-1 rounded-xl border border-slate-200 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Keep Member
            </button>
            <button
              type="button"
              onClick={handleRemoveMember}
              disabled={removingMember}
              className="flex-1 rounded-xl bg-rose-600 py-3 font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
            >
              {removingMember ? 'Removing...' : 'Remove Member'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Ticket"
      >
        <form onSubmit={handleCreateTicket} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Ticket Title</label>
            <input
              type="text"
              value={newTicket.title}
              onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
              placeholder="e.g. Fix login button styling"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Description</label>
            <textarea
              value={newTicket.description}
              onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white h-32 resize-none"
              placeholder="Describe the issue..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Priority</label>
              <select
                value={newTicket.priority}
                onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Status</label>
              <select
                value={newTicket.status}
                onChange={(e) => setNewTicket({ ...newTicket, status: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
              >
                {(project?.workflow_statuses || ["To Do", "In Progress", "Done"]).map((status: string) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Type</label>
              <select
                value={newTicket.type}
                onChange={(e) => setNewTicket({ ...newTicket, type: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
              >
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="task">Task</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Assignee</label>
              <select
                value={newTicket.assignee_id}
                onChange={(e) => setNewTicket({ ...newTicket, assignee_id: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
              >
                <option value="">Unassigned</option>
                {project.members?.map((m: any) => (
                  <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Sprint</label>
              <input
                type="text"
                value={newTicket.sprint_name}
                onChange={(e) => setNewTicket({ ...newTicket, sprint_name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
                placeholder="e.g. Sprint 1"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Due Date</label>
              <input
                type="date"
                value={newTicket.due_date}
                onChange={(e) => setNewTicket({ ...newTicket, due_date: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Labels</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {newTicket.labels.map(label => (
                <span key={label} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg flex items-center gap-1">
                  {label}
                  <button type="button" onClick={() => setNewTicket({...newTicket, labels: newTicket.labels.filter(l => l !== label)})}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && labelInput.trim()) {
                  e.preventDefault();
                  if (!newTicket.labels.includes(labelInput.trim())) {
                    setNewTicket({...newTicket, labels: [...newTicket.labels, labelInput.trim()]});
                  }
                  setLabelInput('');
                }
              }}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
              placeholder="Type label and press Enter"
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
              {creating ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
