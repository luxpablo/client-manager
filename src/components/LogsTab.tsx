'use client';

import React, { useMemo, useState } from 'react';
import { Search, Download, Trash2, X } from 'lucide-react';
import { ActivityLog } from '@/lib/db';
import ConfirmModal from '@/components/ConfirmModal';

interface LogsTabProps { logs: ActivityLog[]; }

export default function LogsTab({ logs }: LogsTabProps) {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; message: string; variant?: 'danger' | 'warning' | 'default'; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const actionTypes = useMemo(() => [...new Set(logs.map(l => l.action))], [logs]);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (search && !l.staffName.toLowerCase().includes(search.toLowerCase()) && !l.action.toLowerCase().includes(search.toLowerCase()) && !l.details.toLowerCase().includes(search.toLowerCase())) return false;
      if (actionFilter !== 'all' && l.action !== actionFilter) return false;
      const ts = new Date(l.timestamp).getTime();
      if (dateFrom && ts < new Date(dateFrom).getTime()) return false;
      if (dateTo && ts > new Date(dateTo + 'T23:59:59').getTime()) return false;
      return true;
    });
  }, [logs, search, actionFilter, dateFrom, dateTo]);

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = 'Timestamp,Staff,Action,Details,IP\n';
    const rows = filtered.map(l =>
      `"${new Date(l.timestamp).toISOString()}","${l.staffName}","${l.action}","${l.details.replace(/"/g, '""')}","${l.ipAddress || ''}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AuditLog_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setConfirmState({
      open: true, title: 'Clear Audit Log', message: 'Delete ALL activity logs? This cannot be undone.', variant: 'danger',
      onConfirm: async () => {
        setConfirmState(p => ({ ...p, open: false }));
        await fetch('/api/admin/logs', { method: 'DELETE' });
        window.location.reload();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">System Audit Ledger</h1>
          <p className="text-xs text-muted-foreground/70">Chronological history of all admin panel updates and credential accesses.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-blue-950/20 border border-border hover:border-blue-800/30 rounded-lg text-xs font-semibold text-zinc-300 transition cursor-pointer">
            <Download className="w-4 h-4 text-blue-400" /> <span>Export</span>
          </button>
          <button onClick={handleClear} className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-red-950/20 border border-border hover:border-red-800/30 rounded-lg text-xs font-semibold text-red-300 transition cursor-pointer">
            <Trash2 className="w-4 h-4 text-red-400" /> <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-background/75 border border-border/50 rounded-xl">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-3.5 h-3.5 text-muted-foreground/70" />
          <input type="text" placeholder="Search staff, action, details..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 placeholder-zinc-500" />
        </div>
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-300">
          <option value="all">All Actions</option>
          {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-300" placeholder="From" />
        </div>
        <div className="flex gap-2 items-center">
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-300" placeholder="To" />
          {(search || actionFilter !== 'all' || dateFrom || dateTo) && (
            <button onClick={() => { setSearch(''); setActionFilter('all'); setDateFrom(''); setDateTo(''); }}
              className="p-2 text-muted-foreground/70 hover:text-white cursor-pointer" title="Clear filters">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-background border border-border rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Staff</th>
                <th className="p-4">Action</th>
                <th className="p-4">Details</th>
                <th className="p-4">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs font-mono">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground/70">No audit entries found.</td></tr>
              ) : filtered.map(l => (
                <tr key={l.id} className="hover:bg-primary/5 transition">
                  <td className="p-4 text-muted-foreground/70 text-[10px] whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</td>
                  <td className="p-4 font-bold text-white font-sans">{l.staffName}</td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-950/30 text-blue-400 border border-blue-900/20">{l.action}</span>
                  </td>
                  <td className="p-4 text-muted-foreground font-sans leading-relaxed max-w-sm truncate" title={l.details}>{l.details}</td>
                  <td className="p-4 text-muted-foreground/70 text-[10px]">{l.ipAddress || '127.0.0.1'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-[10px] text-muted-foreground/70 font-mono text-right">
        Showing {filtered.length} of {logs.length} entries
      </div>

      <ConfirmModal open={confirmState.open} title={confirmState.title} message={confirmState.message} variant={confirmState.variant} confirmLabel="Delete All" cancelLabel="Cancel" onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState(p => ({ ...p, open: false }))} />
    </div>
  );
}
