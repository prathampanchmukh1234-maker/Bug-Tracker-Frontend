import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PriorityBadge, StatusBadge, TypeBadge, cn } from '../components/Badge';
import { Modal } from '../components/Modal';
import { Clock, User, MessageSquare, ArrowLeft, Trash2, Send, Plus, CheckSquare, Link2, History, ChevronRight, BarChart3, Users, Square, Settings, Eye, EyeOff } from 'lucide-react';
import { formatDistanceToNow, isPast, isToday, format } from 'date-fns';
import toast from 'react-hot-toast';
import { apiUrl } from '../utils/api';

export const TicketDetail: React.FC = () => {
  const { id } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [updatingPriority, setUpdatingPriority] = useState(false);
  const [togglingWatch, setTogglingWatch] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    priority: '',
    status: '',
    type: '',
    assignee_id: '',
    sprint_name: '',
    labels: [] as string[],
    due_date: '',
    estimate_hours: 0,
    logged_hours: 0
  });
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'comments' | 'history'>('comments');
  const [history, setHistory] = useState<any[]>([]);
  const [isWatching, setIsWatching] = useState(false);
  
  const [isSubtaskModalOpen, setIsSubtaskModalOpen] = useState(false);
  const [newSubtask, setNewSubtask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'To Do',
    type: 'task',
    assignee_id: '',
    project_id: '',
    parent_ticket_id: ''
  });
  const [creatingSubtask, setCreatingSubtask] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const fetchData = async () => {
    if (!session || !id) return;
    try {
      const [tRes, cRes, hRes, aRes] = await Promise.all([
        fetch(apiUrl(`/api/tickets/${id}`), {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        fetch(apiUrl(`/api/comments?ticketId=${id}`), {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        fetch(apiUrl(`/api/tickets/${id}/history`), {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        fetch(apiUrl(`/api/attachments?ticketId=${id}`), {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
      ]);

      if (tRes.ok) {
        const data = await tRes.json();
        setTicket(data);
        setUserRole(data.userRole);
        setEditData({
          title: data.title,
          description: data.description || '',
          priority: data.priority,
          status: data.status,
          type: data.type,
          assignee_id: data.assignee_id || '',
          sprint_name: data.sprint_name || '',
          labels: data.labels || [],
          due_date: data.due_date || '',
          estimate_hours: data.estimate_hours || 0,
          logged_hours: data.logged_hours || 0
        });
        
        // Fetch project to get members for the edit modal
        const pRes = await fetch(apiUrl(`/api/projects/${data.project_id}`), {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (pRes.ok) {
          const projectData = await pRes.json();
          setProjectMembers(projectData.members || []);
        }
      } else {
        const contentType = tRes.headers.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
          const errData = await tRes.json();
          setError(errData.error || 'Failed to fetch ticket');
        } else {
          setError(`Failed to fetch ticket (Status: ${tRes.status})`);
        }
      }
      
      if (cRes.ok) {
        const contentType = cRes.headers.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
          setComments(await cRes.json());
        }
      }
      if (hRes.ok) {
        const contentType = hRes.headers.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
          setHistory(await hRes.json());
        }
      }
      if (aRes.ok) {
        const contentType = aRes.headers.get('Content-Type');
        if (contentType && contentType.includes('application/json')) {
          setAttachments(await aRes.json());
        }
      }
    } catch (err: any) {
      console.error('Error fetching ticket data:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, session]);

  const handleQuickUpdate = async (field: string, value: any) => {
    try {
      const response = await fetch(apiUrl(`/api/tickets/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ ...editData, [field]: value })
      });

      if (response.ok) {
        toast.success('Updated');
        fetchData();
      } else {
        throw new Error('Update failed');
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      const response = await fetch(apiUrl(`/api/comments/${commentId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (response.ok) {
        toast.success('Comment deleted');
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const response = await fetch(apiUrl(`/api/tickets/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(editData)
      });

      if (response.ok) {
        toast.success('Record updated');
        setIsEditModalOpen(false);
        fetchData();
      } else {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to update record');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch(apiUrl('/api/comments'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ ticket_id: id, text: newComment })
      });

      if (response.ok) {
        toast.success('Comment posted!');
        setNewComment('');
        fetchData();
      } else {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to post comment');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;
    try {
      const response = await fetch(apiUrl(`/api/tickets/${id}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (response.ok) {
        toast.success('Ticket deleted');
        const projectId = ticket?.project?.id || ticket?.project_id;
        setTicket(null); // Clear state before navigation
        navigate(projectId ? `/projects/${projectId}` : '/dashboard', { replace: true });
      } else {
        const errData = await response.json();
        toast.error(errData.error || 'Failed to delete ticket');
      }
    } catch (error) {
      toast.error('Failed to delete ticket');
    }
  };

  const handleCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingSubtask(true);
    try {
      const response = await fetch(apiUrl('/api/tickets'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(newSubtask)
      });

      if (response.ok) {
        toast.success('Subtask created!');
        setIsSubtaskModalOpen(false);
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create subtask');
      }
    } catch (error) {
      toast.error('Failed to create subtask');
    } finally {
      setCreatingSubtask(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(apiUrl(`/api/tickets/${id}/status`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        toast.success(`Status updated to ${newStatus}`);
        fetchData();
      } else {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to update status');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update ticket status');
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    setUpdatingPriority(true);
    try {
      const response = await fetch(apiUrl(`/api/tickets/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ priority: newPriority })
      });

      if (response.ok) {
        toast.success(`Priority updated to ${newPriority}`);
        fetchData();
      } else {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to update priority');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to update ticket priority');
    } finally {
      setUpdatingPriority(false);
    }
  };

  const handleToggleWatch = async () => {
    setTogglingWatch(true);
    try {
      const response = await fetch(apiUrl(`/api/tickets/${id}/watch`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (response.ok) {
        setTicket({ ...ticket, isWatching: !ticket.isWatching });
        toast.success(ticket.isWatching ? 'Stopped watching' : 'Now watching ticket');
      }
    } catch (error: any) {
      toast.error('Failed to toggle watch status');
    } finally {
      setTogglingWatch(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ticketId', id);

    try {
      const response = await fetch(apiUrl('/api/attachments'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: formData
      });

      if (response.ok) {
        toast.success('File uploaded');
        fetchData();
      } else {
        const err = await response.json();
        throw new Error(err.error || 'Upload failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="animate-pulse space-y-4">
    <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
    <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded" />
  </div>;

  if (error) return (
    <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Error Loading Ticket</h3>
      <p className="text-slate-500 dark:text-slate-400 mb-6">{error}</p>
      <button
        onClick={() => navigate(-1)}
        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
      >
        Go Back
      </button>
    </div>
  );

  if (!ticket) return (
    <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Ticket Not Found</h3>
      <p className="text-slate-500 dark:text-slate-400 mb-6">The ticket you are looking for does not exist or you don't have access.</p>
      <button
        onClick={() => navigate(-1)}
        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
      >
        Go Back
      </button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ticket #{ticket.id.slice(0, 8)}</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <Link to={`/projects/${ticket.project_id}`} className="text-[10px] font-bold text-indigo-600 hover:underline uppercase tracking-widest">
                {ticket.project?.title || 'Project'}
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{ticket.title}</h1>
          </div>
        </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleWatch}
              disabled={togglingWatch}
              className={cn(
                "px-4 py-2 flex items-center gap-2 rounded-xl font-bold transition-all border shadow-sm",
                ticket.isWatching 
                  ? "bg-slate-50 dark:bg-slate-800 border-indigo-200 dark:border-indigo-900/50 text-indigo-600" 
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              )}
            >
              {ticket.isWatching ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{ticket.isWatching ? 'Stop Watching' : 'Watch'}</span>
            </button>
            {userRole !== 'viewer' && (
              <>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
                >
                  Edit Ticket
                </button>
                <button
                  onClick={handleDeleteTicket}
                  className="p-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-all"
                  title="Delete Ticket"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">Description</h3>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                {ticket.description || 'No description provided.'}
              </p>
            </div>
          </section>

          {/* Subtasks */}
          <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-500" />
                Subtasks
              </h3>
              <button 
                onClick={() => {
                  setNewSubtask({
                    title: '',
                    description: '',
                    priority: 'medium',
                    status: 'To Do',
                    type: 'task',
                    assignee_id: '',
                    project_id: ticket.project_id,
                    parent_ticket_id: ticket.id
                  });
                  setIsSubtaskModalOpen(true);
                }}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                + Add Subtask
              </button>
            </div>
            {ticket.subtasks && ticket.subtasks.length > 0 ? (
              <div className="space-y-2">
                {ticket.subtasks.map((sub: any) => (
                  <Link 
                    key={sub.id} 
                    to={`/tickets/${sub.id}`}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                  >
                     <StatusBadge status={sub.status} />
                     <span className="text-xs font-bold text-slate-400 w-16">BT-{sub.id.slice(0, 4).toUpperCase()}</span>
                     <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate">{sub.title}</span>
                     {sub.assignee && (
                       <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">
                         {sub.assignee.name[0].toUpperCase()}
                       </div>
                     )}
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No subtasks yet.</p>
            )}
          </section>

          {/* Linked Issues */}
          <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Link2 className="w-4 h-4 text-amber-500" />
                Linked Issues
              </h3>
            </div>
            {ticket.links && ticket.links.length > 0 ? (
              <div className="space-y-2">
                {ticket.links.map((link: any) => (
                  <Link 
                    key={link.id} 
                    to={`/tickets/${link.target.id}`}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                  >
                     <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full uppercase">{link.link_type}</span>
                     <span className="text-xs font-bold text-slate-400 w-16">BT-{link.target.id.slice(0, 4).toUpperCase()}</span>
                     <span className="text-sm text-slate-700 dark:text-slate-300 flex-1 truncate">{link.target.title}</span>
                     <StatusBadge status={link.target.status} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No linked issues.</p>
            )}
          </section>

          {/* Attachments */}
          <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-500" />
                Attachments
              </h3>
              {userRole !== 'viewer' && (
                <label className="text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer">
                  + Add File
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                </label>
              )}
            </div>
            {attachments.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {attachments.map((file) => (
                  <a 
                    key={file.id} 
                    href={file.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-800 text-left"
                  >
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded flex items-center justify-center">
                      <Send className="w-4 h-4 text-indigo-600 -rotate-45" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{file.file_name}</p>
                      <p className="text-[10px] text-slate-400">{formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}</p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No attachments yet.</p>
            )}
          </section>

          <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex border-b border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => setActiveTab('comments')}
                className={cn(
                  "px-6 py-4 text-sm font-bold transition-all border-b-2",
                  activeTab === 'comments' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                Comments ({comments.length})
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={cn(
                  "px-6 py-4 text-sm font-bold transition-all border-b-2",
                  activeTab === 'history' ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
                )}
              >
                History
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'comments' ? (
                <div className="space-y-6">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-4 group">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                        {comment.author?.name?.[0].toUpperCase() || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{comment.author?.name}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          {comment.author_id === session?.user?.id && (
                            <button 
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-1 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{comment.text}</p>
                      </div>
                    </div>
                  ))}

                  {userRole !== 'viewer' ? (
                    <form onSubmit={handleAddComment} className="flex gap-4 mt-6">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Write a comment..."
                          className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white text-sm resize-none h-24"
                        />
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={submitting || !newComment.trim()}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/25"
                          >
                            <Send className="w-4 h-4" />
                            <span>{submitting ? 'Posting...' : 'Post Comment'}</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                      View-only access
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {history.map((item) => (
                    <div key={item.id} className="flex gap-4 group">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                        {item.author?.name?.[0].toUpperCase() || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{item.author?.name}</span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <div className="py-12 text-center">
                      <History className="w-8 h-8 text-slate-200 dark:text-slate-800 mx-auto mb-3" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">No activity history yet.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Details */}
        <div className="space-y-6">
          <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-50 dark:border-slate-800 pb-4">Details</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</span>
                <select 
                  value={ticket.status}
                  onChange={(e) => handleQuickUpdate('status', e.target.value)}
                  disabled={userRole === 'viewer'}
                  className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer hover:text-indigo-600 disabled:cursor-default disabled:hover:text-slate-700"
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Done">Done</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Priority</span>
                <select 
                  value={ticket.priority}
                  onChange={(e) => handleQuickUpdate('priority', e.target.value)}
                  disabled={userRole === 'viewer'}
                  className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer hover:text-indigo-600 disabled:cursor-default disabled:hover:text-slate-700"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Type</span>
                <TypeBadge type={ticket.type} />
              </div>

              <div className="pt-4 border-t border-slate-50 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Time Tracking
                  </span>
                  <button 
                    onClick={() => {
                      setEditData({
                        ...editData,
                        estimate_hours: ticket.estimate_hours || 0,
                        logged_hours: ticket.logged_hours || 0
                      });
                      setIsEditModalOpen(true);
                    }}
                    className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded transition-colors"
                  >
                    <Settings className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all" 
                      style={{ width: `${Math.min(100, (ticket.logged_hours / (ticket.estimate_hours || 1)) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-indigo-600">{ticket.logged_hours || 0}h logged</span>
                    <span className="text-slate-400 text-right">{ticket.estimate_hours || 0}h estimated</span>
                  </div>
                </div>
              </div>

              {ticket.due_date && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Due Date</span>
                  <span className={cn(
                    "text-sm font-bold",
                    isPast(new Date(ticket.due_date)) && !isToday(new Date(ticket.due_date)) && ticket.status !== 'Done' ? "text-rose-600" : "text-slate-700 dark:text-slate-300"
                  )}>
                    {format(new Date(ticket.due_date), 'MMM d, yyyy')}
                  </span>
                </div>
              )}

              <div className="pt-4 border-t border-slate-50 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assignee</span>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      {ticket.assignee?.name?.[0].toUpperCase() || '?'}
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{ticket.assignee?.name || 'Unassigned'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reporter</span>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-400">
                      {ticket.reporter?.name?.[0].toUpperCase() || '?'}
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{ticket.reporter?.name}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50 dark:border-slate-800">
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Created</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">{new Date(ticket.created_at).toLocaleString()}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Ticket"
      >
        <form onSubmit={handleUpdateTicket} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Title</label>
            <input
              type="text"
              value={editData.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Description</label>
            <textarea
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white h-32 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Priority</label>
              <select
                value={editData.priority}
                onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
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
                value={editData.status}
                onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
              >
                {(ticket.project?.workflow_statuses || ["To Do", "In Progress", "Done"]).map((status: string) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Type</label>
              <select
                value={editData.type}
                onChange={(e) => setEditData({ ...editData, type: e.target.value })}
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
                value={editData.assignee_id}
                onChange={(e) => setEditData({ ...editData, assignee_id: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
              >
                <option value="">Unassigned</option>
                {projectMembers.map((m: any) => (
                  <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Estimate (Hours)</label>
              <input
                type="number"
                step="0.5"
                value={editData.estimate_hours || 0}
                onChange={(e) => setEditData({ ...editData, estimate_hours: parseFloat(e.target.value) })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Logged (Hours)</label>
              <input
                type="number"
                step="0.5"
                value={editData.logged_hours || 0}
                onChange={(e) => setEditData({ ...editData, logged_hours: parseFloat(e.target.value) })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1 py-3 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating}
              className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {updating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isSubtaskModalOpen}
        onClose={() => setIsSubtaskModalOpen(false)}
        title="Create Subtask"
      >
        <form onSubmit={handleCreateSubtask} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Title</label>
            <input
              type="text"
              value={newSubtask.title}
              onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
              required
              placeholder="Subtask summary"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Description</label>
            <textarea
              value={newSubtask.description}
              onChange={(e) => setNewSubtask({ ...newSubtask, description: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white h-24 resize-none"
              placeholder="What needs to be done?"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Priority</label>
              <select
                value={newSubtask.priority}
                onChange={(e) => setNewSubtask({ ...newSubtask, priority: e.target.value })}
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
                value={newSubtask.status}
                onChange={(e) => setNewSubtask({ ...newSubtask, status: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
              >
                {(ticket?.project?.workflow_statuses || ["To Do", "In Progress", "Done"]).map((status: string) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ml-1">Assignee</label>
            <select
              value={newSubtask.assignee_id}
              onChange={(e) => setNewSubtask({ ...newSubtask, assignee_id: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white"
            >
              <option value="">Unassigned</option>
              {projectMembers.map((m: any) => (
                <option key={m.user.id} value={m.user.id}>{m.user.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsSubtaskModalOpen(false)}
              className="flex-1 py-3 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingSubtask}
              className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {creatingSubtask ? 'Creating...' : 'Create Subtask'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
