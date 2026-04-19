import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { MessageSquare, Paperclip, Clock, User } from 'lucide-react';
import { PriorityBadge, TypeBadge } from './Badge';
import { Link } from 'react-router-dom';
import { formatDistanceToNow, isPast, isToday, format } from 'date-fns';
import { cn } from './Badge';

interface TicketCardProps {
  ticket: any;
  index: number;
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket, index }) => {
  const isOverdue = ticket.due_date && isPast(new Date(ticket.due_date)) && !isToday(new Date(ticket.due_date)) && ticket.status !== 'Done';

  return (
    <Draggable draggableId={ticket.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`
            bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 mb-2 transition-all group relative
            hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900/50
            ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-indigo-500 z-50' : 'shadow-sm'}
          `}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex flex-wrap gap-1.5">
              <TypeBadge type={ticket.type} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">BT-{ticket.id.slice(0, 4).toUpperCase()}</span>
          </div>
          
          <Link 
            to={`/tickets/${ticket.id}`} 
            className="block mb-2"
            onClick={(e) => { if (snapshot.isDragging) e.preventDefault(); }}
            style={{ pointerEvents: snapshot.isDragging ? 'none' : 'auto' }}
          >
            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
              {ticket.title}
            </h4>
          </Link>

          {ticket.labels && ticket.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {ticket.labels.map((label: string) => (
                <span key={label} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-bold rounded uppercase tracking-wider">
                  {label}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50 dark:border-slate-800/50">
            <div className="flex items-center gap-3 text-slate-400">
              <div className="flex items-center gap-1" title="Comments">
                <MessageSquare className="w-3 h-3" />
                <span className="text-[10px] font-bold">{ticket.comments?.[0]?.count ?? 0}</span>
              </div>
              {ticket.due_date && (
                <div className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded",
                  isOverdue ? "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400" : "text-slate-400"
                )} title={`Due: ${format(new Date(ticket.due_date), 'MMM d, yyyy')}`}>
                  <Clock className="w-3 h-3" />
                  <span className="text-[10px] font-bold">{format(new Date(ticket.due_date), 'MMM d')}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm" title={ticket.assignee?.name || 'Unassigned'}>
                {ticket.assignee ? (
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">{ticket.assignee.name[0].toUpperCase()}</span>
                ) : (
                  <User className="w-3 h-3 text-slate-400" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};
