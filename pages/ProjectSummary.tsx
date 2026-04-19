import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, Bug, Zap, ClipboardList } from 'lucide-react';
import { PriorityBadge, TypeBadge, StatusBadge } from '../components/Badge';
import { apiUrl } from '../utils/api';

export const ProjectSummary: React.FC = () => {
  const { id } = useParams();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!session || !id) return;
      try {
        const [pRes, tRes] = await Promise.all([
          fetch(apiUrl(`/api/projects/${id}`), {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          }),
          fetch(apiUrl(`/api/tickets?projectId=${id}`), {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          })
        ]);

        if (pRes.ok) setProject(await pRes.json());
        if (tRes.ok) setTickets(await tRes.json());
      } catch (error) {
        console.error('Error fetching summary data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, session]);

  if (loading) return <div className="animate-pulse space-y-4 p-8">
    <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />)}
    </div>
    <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
  </div>;

  if (!project) return <div className="p-8 text-center">Project not found</div>;

  const total = tickets.length;
  const open = tickets.filter(t => t.status !== 'Done').length;
  const closed = tickets.filter(t => t.status === 'Done').length;
  
  const priorityCounts = {
    critical: tickets.filter(t => t.priority === 'critical').length,
    high: tickets.filter(t => t.priority === 'high').length,
    medium: tickets.filter(t => t.priority === 'medium').length,
    low: tickets.filter(t => t.priority === 'low').length,
  };

  const typeCounts = {
    bug: tickets.filter(t => t.type === 'bug').length,
    feature: tickets.filter(t => t.type === 'feature').length,
    task: tickets.filter(t => t.type === 'task').length,
  };

  const assigneeStats = tickets.reduce((acc: any, t) => {
    const name = t.assignee?.name || 'Unassigned';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  const topAssignees = Object.entries(assigneeStats)
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 5);

  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const StatCard = ({ label, value, icon: Icon, color }: any) => (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="text-3xl font-bold text-slate-900 dark:text-white">{value}</div>
    </div>
  );

  const ProgressBar = ({ label, count, total, colorClass }: any) => (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-600 dark:text-slate-400">{label}</span>
        <span className="font-bold text-slate-900 dark:text-white">{count}</span>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full ${colorClass} transition-all duration-500`}
          style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }}
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(`/projects/${id}`)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{project.title}</h1>
          <p className="text-slate-500 dark:text-slate-400">Project Summary & Analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Issues" value={total} icon={ClipboardList} color="text-indigo-500" />
        <StatCard label="Open Issues" value={open} icon={AlertCircle} color="text-amber-500" />
        <StatCard label="Completed" value={closed} icon={CheckCircle2} color="text-emerald-500" />
        <StatCard label="Completion Rate" value={total > 0 ? `${Math.round((closed / total) * 100)}%` : '0%'} icon={Zap} color="text-indigo-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-wider">Priority Breakdown</h3>
            <div className="space-y-6">
              <ProgressBar label="Critical" count={priorityCounts.critical} total={total} colorClass="bg-rose-500" />
              <ProgressBar label="High" count={priorityCounts.high} total={total} colorClass="bg-orange-500" />
              <ProgressBar label="Medium" count={priorityCounts.medium} total={total} colorClass="bg-indigo-500" />
              <ProgressBar label="Low" count={priorityCounts.low} total={total} colorClass="bg-slate-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-wider">Recent Activity</h3>
            <div className="space-y-4">
              {recentTickets.map((ticket, i) => (
                <Link 
                  key={ticket.id} 
                  to={`/tickets/${ticket.id}`}
                  className={`flex items-center gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors ${i < recentTickets.length - 1 ? 'border-b border-slate-50 dark:border-slate-800/50' : ''}`}
                >
                  <TypeBadge type={ticket.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{ticket.title}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">{new Date(ticket.created_at).toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={ticket.status} />
                </Link>
              ))}
              {recentTickets.length === 0 && <p className="text-center py-8 text-slate-400 italic text-sm">No recent activity</p>}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-wider">Issue Types</h3>
            <div className="space-y-6">
              <ProgressBar label="Bugs" count={typeCounts.bug} total={total} colorClass="bg-rose-500" />
              <ProgressBar label="Features" count={typeCounts.feature} total={total} colorClass="bg-emerald-500" />
              <ProgressBar label="Tasks" count={typeCounts.task} total={total} colorClass="bg-indigo-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6 uppercase tracking-wider">Top Assignees</h3>
            <div className="space-y-4">
              {topAssignees.map(([name, count]: any) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {name[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{name}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{count}</span>
                </div>
              ))}
              {topAssignees.length === 0 && <p className="text-center py-4 text-slate-400 italic text-sm">No assignees</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
