'use client';

import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare, User, CalendarDays, ChevronDown, AlertCircle, ArrowUp } from 'lucide-react';
import { Ticket } from '@/lib/db';
import { useToast } from '@/components/Toaster';

interface Props {
  user: { name: string; username: string; role: string };
  onLogAction: (a: string, d: string) => void;
}

const priorityOrder: Record<string, number> = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

export default function KanbanBoard({ user, onLogAction }: Props) {
  const { toast } = useToast();

  // tickets grouped by status
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tickets');
      if (res.ok) setTickets(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTickets(); }, []);

  const columns = [
    { id: 'Open', title: 'Open', color: 'text-blue-400 bg-blue-950/30 border-blue-900/30' },
    { id: 'Answered', title: 'In Progress', color: 'text-yellow-400 bg-yellow-950/30 border-yellow-900/30' },
    { id: 'Closed', title: 'Closed', color: 'text-muted-foreground/70 bg-zinc-950/30 border-zinc-800/30' },
  ];

  const getColumnTickets = (status: string) =>
    tickets.filter(t => t.status === status)
      .sort((a, b) => (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99));

  const moveTicket = async (ticketId: string, newStatus: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));

    try {
      await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      onLogAction('Ticket Status Changed', `Moved ticket "${ticket.title}" to ${newStatus}.`);
    } catch (e) {
      console.error(e);
      fetchTickets();
    }
  };

  const handleDragStart = (id: string) => setDragItem(id);
  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOver(status);
  };
  const handleDrop = (status: string) => {
    if (dragItem) {
      moveTicket(dragItem, status);
      setDragItem(null);
      setDragOver(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Kanban Board</h1>
        <p className="text-xs text-muted-foreground/70">Drag and drop tickets to update status.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[600px]">
        {columns.map(col => {
          const colTickets = getColumnTickets(col.id);
          return (
            <div
              key={col.id}
              onDragOver={e => handleDragOver(e, col.id)}
              onDrop={() => handleDrop(col.id)}
              onDragLeave={() => setDragOver(null)}
              className={`bg-[#0a0814]/60 border rounded-2xl p-4 transition-all duration-200 ${
                dragOver === col.id ? 'border-blue-500/50 bg-blue-950/10' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">{col.title}</h3>
                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-mono">{colTickets.length}</span>
                </div>
              </div>

              <div className="space-y-3">
                {loading ? (
                  <div className="text-center text-xs text-muted-foreground/70 p-6 animate-pulse">Loading...</div>
                ) : colTickets.length === 0 ? (
                  <div className="text-center text-xs text-muted-foreground/50 p-6 font-mono">No tickets</div>
                ) : colTickets.map(ticket => (
                  <div
                    key={ticket.id}
                    draggable
                    onDragStart={() => handleDragStart(ticket.id)}
                    className="bg-background border border-border hover:border-blue-500/30 rounded-xl p-4 space-y-3 cursor-grab active:cursor-grabbing transition group"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-xs font-bold text-white leading-snug">{ticket.title}</h4>
                      <span className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-bold font-mono uppercase ${
                        ticket.priority === 'Urgent' ? 'bg-red-950/40 text-red-400' :
                        ticket.priority === 'High' ? 'bg-orange-950/40 text-orange-400' :
                        ticket.priority === 'Medium' ? 'bg-yellow-950/40 text-yellow-400' :
                        'bg-muted/40 text-muted-foreground'
                      }`}>
                        {ticket.priority}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/70 font-mono">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="w-3 h-3" />
                        <span>{ticket.messages.length}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-3 h-3" />
                        <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
