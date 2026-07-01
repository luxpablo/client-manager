'use client';

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  Plus,
  Send,
  User,
  X
} from 'lucide-react';
import { Ticket, Customer } from '@/lib/db';
import { useToast } from '@/components/Toaster';

interface TicketsTabProps {
  user: { name: string; username: string; role: string };
  onLogAction: (action: string, details: string) => void;
  customers?: Customer[];
}

const emptyForm = { customerId: '', customerName: '', title: '', priority: 'Medium', message: '' };

export default function TicketsTab({ user, onLogAction, customers = [] }: TicketsTabProps) {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<(Ticket & { customer?: Customer })[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  const [activeTktId, setActiveTktId] = useState<string | null>(null);
  const [activeTkt, setActiveTkt] = useState<(Ticket & { customer?: Customer }) | null>(null);
  const [replyDraft, setReplyDraft] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (statusFilter !== 'all') q.set('status', statusFilter);
      const res = await fetch(`/api/admin/tickets?${q.toString()}`);
      if (res.ok) setTickets(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTickets(); }, [search, statusFilter]);

  const loadTicketDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/tickets/${id}`);
      if (res.ok) { const data = await res.json(); setActiveTkt(data); setActiveTktId(id); }
    } catch (e) { console.error(e); }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTktId || !replyDraft.trim()) return;
    try {
      const res = await fetch(`/api/admin/tickets/${activeTktId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyDraft })
      });
      if (res.ok) { setReplyDraft(''); loadTicketDetails(activeTktId); fetchTickets(); }
    } catch (e) { console.error(e); }
  };

  const handleCloseTicket = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Closed' })
      });
      if (res.ok) { toast('success', 'Ticket closed.'); loadTicketDetails(id); fetchTickets(); }
    } catch (e) { console.error(e); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/tickets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: form.customerId,
          customerName: form.customerName || 'Client',
          title: form.title,
          priority: form.priority,
          message: form.message
        })
      });
      if (res.ok) {
        toast('success', 'Ticket created.');
        setShowCreate(false); setForm(emptyForm);
        fetchTickets();
      } else {
        toast('error', 'Failed to create ticket.');
      }
    } catch (e) { console.error(e); }
    finally { setCreating(false); }
  };

  return (
    <div className="space-y-6 h-[80vh] flex flex-col justify-between">
      {/* Title */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Support Ticket Console</h1>
          <p className="text-xs text-muted-foreground/70">Communicate with customers, review priority tickets, and resolve service issues.</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg text-xs font-semibold text-white transition shadow shadow-blue-500/10">
          <Plus className="w-4 h-4" /> <span>New Ticket</span>
        </button>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex gap-6 min-h-0">
        {/* Sidebar list */}
        <div className="w-1/3 bg-background border border-border rounded-2xl flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border bg-muted/40 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground/70" />
              <input type="text" placeholder="Search ticket title, client..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-muted border border-border rounded-lg text-[11px] text-zinc-200 placeholder-zinc-500 focus:border-blue-500/60 transition" />
            </div>
            <div className="flex gap-2">
              {(['all', 'Open', 'Pending', 'Answered', 'Closed'] as const).map(status => (
                <button key={status} onClick={() => setStatusFilter(status)}
                  className={`px-2 py-1 rounded text-[9px] font-bold uppercase border transition ${
                    statusFilter === status
                      ? 'bg-blue-950/45 text-blue-300 border-blue-800/30'
                      : 'bg-muted text-muted-foreground border-transparent hover:text-zinc-200'
                  }`}>{status}</button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border/40">
            {loading ? (
              <div className="p-10 text-center text-xs text-muted-foreground/70 animate-pulse">Syncing tickets...</div>
            ) : tickets.map(t => {
              const isActive = activeTktId === t.id;
              return (
                <div key={t.id} onClick={() => loadTicketDetails(t.id)}
                  className={`p-3.5 cursor-pointer hover:bg-primary/5 transition text-xs space-y-1.5 ${isActive ? 'bg-blue-950/15 border-l-2 border-blue-500' : ''}`}>
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-white truncate max-w-[130px]">{t.title}</span>
                    <span className={`inline-block px-1.5 py-0.25 rounded text-[7px] font-bold uppercase tracking-wider ${
                      t.priority === 'Critical' || t.priority === 'High' || t.priority === 'Urgent'
                        ? 'bg-red-950/40 text-red-400 border border-red-800/30'
                        : 'bg-blue-950/40 text-blue-400 border border-blue-800/30'
                    }`}>{t.priority}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground/70 font-mono">
                    <span>{t.customer?.name}</span>
                    <span>{new Date(t.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-[9px] text-muted-foreground/70 font-mono">srv-{t.id.slice(-6)}</span>
                    <span className={`inline-block px-1.5 py-0.25 rounded text-[8px] font-bold uppercase tracking-wider ${
                      t.status === 'Open' ? 'bg-red-950/40 text-red-400 border border-red-800/30'
                        : t.status === 'Answered' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30'
                        : 'bg-zinc-900 text-muted-foreground border border-zinc-700/30'
                    }`}>{t.status}</span>
                  </div>
                </div>
              );
            })}
            {!loading && tickets.length === 0 && (
              <div className="p-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <MessageSquare className="w-10 h-10 text-blue-400/60" />
                  <h3 className="text-sm font-bold text-white">No Tickets Yet</h3>
                  <p className="text-xs text-muted-foreground/70 max-w-[280px]">
                    Support tickets let you communicate with clients about issues or requests.
                  </p>
                  <button onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg text-xs font-semibold text-white transition shadow shadow-blue-500/10 mt-1">
                    <Plus className="w-4 h-4" /> Create Your First Ticket
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 bg-background border border-border rounded-2xl flex flex-col overflow-hidden justify-between">
          {activeTktId && activeTkt ? (
            <>
              <div className="p-4 border-b border-border bg-zinc-950/50 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">{activeTkt.title}</h3>
                  <p className="text-[10px] text-muted-foreground/70 font-mono mt-1">
                    Client: {activeTkt.customer?.name} ({activeTkt.customer?.email})
                  </p>
                </div>
                <div className="flex gap-2">
                  {activeTkt.status !== 'Closed' && (
                    <button onClick={() => handleCloseTicket(activeTkt.id)}
                      className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/30 text-muted-foreground hover:text-white rounded text-[10px] font-bold uppercase tracking-wider transition cursor-pointer">Close Ticket</button>
                  )}
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
                {activeTkt.messages.map((msg, mIdx) => {
                  const isStaff = msg.sender === 'staff';
                  return (
                    <div key={mIdx} className={`flex ${isStaff ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                      <div className={`max-w-[70%] p-3.5 rounded-2xl border ${
                        isStaff ? 'bg-blue-950/30 border-blue-800/40 text-blue-100 rounded-tr-none'
                          : 'bg-muted/60 border-border/50 text-zinc-100 rounded-tl-none'
                      }`}>
                        <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70 font-bold mb-1 uppercase tracking-wider font-mono">
                          <User className="w-3 h-3 text-blue-400" />
                          <span>{msg.name}</span>
                          <span>•</span>
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="leading-relaxed text-[11px] whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {activeTkt.status !== 'Closed' ? (
                <form onSubmit={handleSendReply} className="p-3 bg-zinc-950/50 border-t border-border flex gap-3 items-center shrink-0">
                  <textarea value={replyDraft} onChange={e => setReplyDraft(e.target.value)} rows={1} required
                    placeholder={`Reply as ${user.name}...`}
                    className="flex-1 px-4 py-2.5 bg-[#110e20] border border-border rounded-lg text-xs text-zinc-200 placeholder-zinc-500 resize-none h-10 max-h-20" />
                  <button type="submit"
                    className="p-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-lg transition shadow active:scale-95 cursor-pointer shrink-0">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-zinc-950/80 border-t border-border text-center text-xs text-muted-foreground/70 font-semibold uppercase tracking-widest shrink-0">
                  This support thread has been resolved and closed.
                </div>
              )}
            </>
          ) : (
            <div className="m-auto text-center p-10 text-muted-foreground/70 space-y-2">
              <MessageSquare className="w-8 h-8 text-blue-950 mx-auto" />
              <p className="text-xs font-semibold uppercase tracking-widest">Select support ticket</p>
              <p className="text-[10px] text-muted-foreground/50 max-w-[220px]">
                Choose an open ticket from the sidebar to review customer messages and record operations.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Ticket Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">New Support Ticket</h2>
              <button onClick={() => { setShowCreate(false); setForm(emptyForm); }} className="p-1 text-muted-foreground/70 hover:text-white rounded cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Customer</label>
                <select value={form.customerId} onChange={e => setForm(prev => ({ ...prev, customerId: e.target.value }))}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-300">
                  <option value="">— Select existing customer —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Or type customer name</label>
                <input value={form.customerName} onChange={e => setForm(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="e.g. John Doe" disabled={!!form.customerId}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 placeholder-zinc-500 disabled:opacity-40" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Brief issue summary" required
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 placeholder-zinc-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-300">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Initial Message</label>
                <textarea value={form.message} onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={3} placeholder="Describe the issue or request..."
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 placeholder-zinc-500 resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-border/40">
                <button type="button" onClick={() => { setShowCreate(false); setForm(emptyForm); }}
                  className="px-4 py-2 text-xs text-muted-foreground/70 hover:text-white bg-muted hover:bg-muted/80 rounded-lg transition cursor-pointer">Cancel</button>
                <button type="submit" disabled={creating || !form.title.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg transition disabled:opacity-50">
                  {creating ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
