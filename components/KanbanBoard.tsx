import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { TicketCard } from './TicketCard';
import { useAuth } from '../context/AuthContext';
import { Plus, MoreHorizontal } from 'lucide-react';
import { cn } from './Badge';
import toast from 'react-hot-toast';

interface KanbanBoardProps {
  projectId: string;
  tickets: any[];
  onTicketUpdate: () => void;
  onAddTicket?: (status: string) => void;
  swimlaneBy?: 'none' | 'assignee';
  workflowStatuses?: string[];
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ 
  projectId, 
  tickets, 
  onTicketUpdate, 
  onAddTicket, 
  swimlaneBy = 'none',
  workflowStatuses = ['To Do', 'In Progress', 'Done'] 
}) => {
  const { session } = useAuth();
  const [boardData, setBoardData] = useState<any>(
    workflowStatuses.reduce((acc, status) => ({ ...acc, [status]: [] }), {})
  );

  useEffect(() => {
    const priorityOrder: Record<string, number> = {
      'high': 1,
      'medium': 2,
      'low': 3
    };

    const organized = workflowStatuses.reduce((acc: any, status) => {
      acc[status] = tickets
        .filter(t => t.status === status)
        .sort((a, b) => (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99));
      return acc;
    }, {});
    setBoardData(organized);
  }, [tickets, workflowStatuses]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    
    // Extract column from compound ID (e.g. "assigneeId::columnName" -> "columnName")
    const sourceCol = source.droppableId.includes('::') ? source.droppableId.split('::')[1] : source.droppableId;
    const destCol = destination.droppableId.includes('::') ? destination.droppableId.split('::')[1] : destination.droppableId;

    if (sourceCol === destCol && destination.index === source.index) return;

    // Snapshot for rollback
    const previousBoardData = boardData;

    // Optimistic Update
    const sourceItems = [...boardData[sourceCol]];
    const [moved] = sourceItems.splice(source.index, 1);
    
    const destItems =
      sourceCol === destCol
        ? [...sourceItems]
        : [...boardData[destCol]];
    
    destItems.splice(destination.index, 0, { ...moved, status: destCol });

    setBoardData({
      ...boardData,
      [sourceCol]: sourceItems,
      [destCol]: destItems,
    });

    // API Call
    try {
      const response = await fetch(`/api/tickets/${draggableId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ status: destCol })
      });

      if (!response.ok) throw new Error('Failed to update status');
      toast.success(`Moved to ${destCol}`);
    } catch (error) {
      toast.error('Failed to update ticket status');
      setBoardData(previousBoardData); // instant rollback
    }
  };

  if (swimlaneBy === 'assignee') {
    const assignees = Array.from(new Set(tickets.map(t => t.assignee?.id || 'unassigned')));
    const assigneeNames = tickets.reduce((acc: any, t) => {
      acc[t.assignee?.id || 'unassigned'] = t.assignee?.name || 'Unassigned';
      return acc;
    }, {});

    return (
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="space-y-8 overflow-y-auto pr-2">
          {assignees.map(assigneeId => (
            <div key={assigneeId as string} className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">
                  {(assigneeNames[assigneeId as string] as string)[0].toUpperCase()}
                </div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{assigneeNames[assigneeId as string] as string}</h4>
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {workflowStatuses.map(columnId => {
                  const columnTickets = boardData[columnId].filter((t: any) => (t.assignee?.id || 'unassigned') === assigneeId);
                  return (
                    <div key={`${assigneeId}-${columnId}`} className="flex flex-col bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl p-3 border border-slate-100 dark:border-slate-800/50">
                      <Droppable droppableId={`${assigneeId}::${columnId}`}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`min-h-[50px] transition-all rounded-xl ${snapshot.isDraggingOver ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                          >
                            {columnTickets.map((ticket: any, index: number) => (
                              <TicketCard key={ticket.id} ticket={ticket} index={index} />
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </DragDropContext>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-[600px]">
        {workflowStatuses.map(columnId => (
          <div key={columnId} className="flex flex-col bg-slate-100 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  columnId === 'Done' ? "bg-emerald-500" : columnId === 'In Progress' ? "bg-indigo-500" : "bg-slate-300"
                )} />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">{columnId}</h3>
                <span className="bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {boardData[columnId].length}
                </span>
              </div>
              <button 
                onClick={() => onAddTicket?.(columnId)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-indigo-600"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <Droppable droppableId={columnId}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 min-h-[150px] transition-all rounded-xl ${snapshot.isDraggingOver ? 'bg-indigo-50/50 dark:bg-indigo-900/10 ring-2 ring-indigo-500 ring-dashed' : ''}`}
                >
                  {boardData[columnId].map((ticket: any, index: number) => (
                    <TicketCard key={ticket.id} ticket={ticket} index={index} />
                  ))}
                  {provided.placeholder}
                  
                  {boardData[columnId].length === 0 && !snapshot.isDraggingOver && (
                    <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400">
                      <p className="text-xs font-medium">No tickets</p>
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
};
