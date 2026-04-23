import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Menu, Bug, Bell, CheckCircle2, MessageSquare, UserPlus, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { apiUrl } from '../utils/api';
import { cn } from '../components/Badge';
import { formatDistanceToNow } from 'date-fns';

interface NavbarProps {
  onMenuToggle?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuToggle }) => {
  const { user, session, signOut } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const profileName = user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';

  const fetchNotifications = async () => {
    try {
      if (!session?.access_token) return;

      const response = await fetch(apiUrl('/api/notifications'), {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setNotificationsLoaded(true);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    if (!user || !showNotifications) return;

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, showNotifications, session?.access_token]);

  const handleMarkAsRead = async (id: string, ticketId?: string) => {
    try {
      if (!session?.access_token) return;
      await fetch(apiUrl(`/api/notifications/${id}/read`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
      
      if (ticketId) {
        setShowNotifications(false);
        navigate(`/tickets/${ticketId}`);
      }
    } catch (error) {
      console.error('Failed to mark read:', error);
    }
  };

  const markAllRead = async () => {
    try {
      if (!session?.access_token) return;
      await fetch(apiUrl('/api/notifications/mark-all-read'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Failed to mark all read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'assignment': return <UserPlus className="w-4 h-4 text-indigo-500" />;
      case 'status_change': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'mention': return <MessageSquare className="w-4 h-4 text-amber-500" />;
      default: return <Info className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <nav className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 md:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMenuToggle}
          className="inline-flex md:hidden items-center justify-center rounded-xl p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <div className="p-2 bg-indigo-600 rounded-xl group-hover:rotate-12 transition-transform">
            <Bug className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">BugTracker<span className="text-indigo-600">Pro</span></span>
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {user && (
          <div className="flex items-center gap-2 sm:gap-3 md:gap-5">
            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                }}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notifications</h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllRead}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        <div className="divide-y divide-slate-50 dark:divide-slate-800">
                          {notifications.map(n => (
                            <div 
                              key={n.id}
                              onClick={() => handleMarkAsRead(n.id, n.ticket_id)}
                              className={cn(
                                "p-4 flex gap-3 cursor-pointer transition-colors",
                                n.is_read ? "opacity-60" : "bg-indigo-50/30 dark:bg-indigo-900/10"
                              )}
                            >
                              <div className="mt-0.5">{getNotificationIcon(n.type)}</div>
                              <div className="flex-1">
                                <p className="text-xs text-slate-700 dark:text-slate-300 leading-normal">{n.message}</p>
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                                </span>
                              </div>
                              {!n.is_read && <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2" />}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <Bell className="w-8 h-8 text-slate-200 dark:text-slate-800 mx-auto mb-2" />
                          <p className="text-xs text-slate-400">All caught up!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {profileName || user.email?.split('@')[0]}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Member
              </span>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold">
              {(profileName || user.email || '?')[0].toUpperCase()}
            </div>
            <button
              onClick={() => signOut()}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-all"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};
