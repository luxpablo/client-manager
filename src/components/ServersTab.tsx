'use client';

import React, { useState, useEffect } from 'react';
import {
  Server, Plus, Cpu, Layers, Calendar, DollarSign, Locate, Wrench, Activity, HardDrive, Trash2, Search, Edit3
} from 'lucide-react';
import { useToast } from '@/components/Toaster';
import ConfirmModal from '@/components/ConfirmModal';

interface ServerNode {
  id: string;
  name: string;
  provider: string;
  location: string;
  cpu: number;
  ram: number;
  storage: number;
  ips: string[];
  monthlyCost: number;
  renewalDate: string;
  status: 'Active' | 'Maintenance' | 'Suspended';
  allocatedCores: number;
  allocatedRam: number;
  allocatedStorage: number;
  remainingCores: number;
  remainingRam: number;
  remainingStorage: number;
  activeServicesCount: number;
}

interface ServersTabProps {
  userRole: string;
  onLogAction: (action: string, details: string) => void;
  currency?: string;
}

export default function ServersTab({ userRole, onLogAction, currency = 'USD' }: ServersTabProps) {
  const sym = currency === 'INR' ? '\u20B9' : '$';
  const { toast } = useToast();
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; message: string; variant?: 'danger' | 'warning' | 'default'; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [servers, setServers] = useState<ServerNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Create/Edit Server State
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', provider: 'Hetzner', location: 'Helsinki, Finland',
    cpu: 64, ram: 256, storage: 4000, ips: '', monthlyCost: 119,
    renewalDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  });

  const fetchServers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/servers');
      if (res.ok) setServers(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchServers(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', provider: 'Hetzner', location: 'Helsinki, Finland', cpu: 64, ram: 256, storage: 4000, ips: '', monthlyCost: 119, renewalDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] });
    setIsCreating(true);
  };

  const openEdit = (srv: ServerNode) => {
    setEditingId(srv.id);
    setForm({ name: srv.name, provider: srv.provider, location: srv.location, cpu: srv.cpu, ram: srv.ram, storage: srv.storage, ips: srv.ips.join(', '), monthlyCost: srv.monthlyCost, renewalDate: srv.renewalDate.split('T')[0] });
    setIsCreating(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `/api/admin/servers/${editingId}` : '/api/admin/servers';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) {
        setIsCreating(false);
        setEditingId(null);
        fetchServers();
        toast('success', editingId ? 'Node updated.' : 'Node created.');
      }
    } catch (e) { console.error(e); }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    if (['Moderator', 'Support'].includes(userRole)) { toast('error', 'Forbidden.'); return; }
    const nextStatus = currentStatus === 'Active' ? 'Maintenance' : 'Active';
    const res = await fetch(`/api/admin/servers/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: nextStatus }) });
    if (res.ok) { fetchServers(); onLogAction('Server Status Changed', `Set ${servers.find(s => s.id === id)?.name} to ${nextStatus}.`); }
  };

  const handleDeleteServer = async (id: string, name: string) => {
    if (!['Founder', 'Admin'].includes(userRole)) { toast('error', 'Only Founder/Admin can delete nodes.'); return; }
    setConfirmState({ open: true, title: 'Delete Server', message: `Delete ${name}? All hosted containers will be unassigned.`, variant: 'danger', onConfirm: async () => {
      setConfirmState(p => ({ ...p, open: false }));
      const res = await fetch(`/api/admin/servers/${id}`, { method: 'DELETE' });
      if (res.ok) { fetchServers(); toast('success', `${name} deleted.`); onLogAction('Server Deleted', `Removed ${name}.`); }
    }});
  };

  // Calculate stats
  const filtered = servers.filter(s => {
    const match = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.provider.toLowerCase().includes(search.toLowerCase()) || s.location.toLowerCase().includes(search.toLowerCase()) || s.ips.some(ip => ip.includes(search));
    const status = filterStatus === 'all' || s.status === filterStatus;
    return match && status;
  });
  const totalMonthlyCost = filtered.reduce((sum, s) => sum + s.monthlyCost, 0);
  const totalCores = filtered.reduce((sum, s) => sum + s.cpu, 0);
  const totalRam = filtered.reduce((sum, s) => sum + s.ram, 0);
  const totalStorage = filtered.reduce((sum, s) => sum + s.storage, 0);
  const usedCores = filtered.reduce((sum, s) => sum + s.allocatedCores, 0);
  const usedRam = filtered.reduce((sum, s) => sum + s.allocatedRam, 0);
  const usedStorage = filtered.reduce((sum, s) => sum + s.allocatedStorage, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Physical Node Inventory</h1>
          <p className="text-xs text-muted-foreground/70">Manage hosting hardware nodes, check resource allocations, and plan server upgrades.</p>
        </div>
        {['Founder', 'Admin'].includes(userRole) && (
          <button onClick={openCreate} className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg text-xs font-semibold text-white transition shadow shadow-blue-500/10">
            <Plus className="w-4 h-4" /> <span>Add Node</span>
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-5 gap-4">
        <div className="p-3 bg-background border border-border rounded-xl"><p className="text-lg font-bold text-white font-mono">{filtered.length}</p><p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Nodes</p></div>
        <div className="p-3 bg-background border border-border rounded-xl"><p className="text-lg font-bold text-white font-mono">{sym}{totalMonthlyCost.toFixed(0)}</p><p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Monthly Cost</p></div>
        <div className="p-3 bg-background border border-border rounded-xl"><p className="text-lg font-bold text-white font-mono">{usedCores}/{totalCores}</p><p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Cores</p></div>
        <div className="p-3 bg-background border border-border rounded-xl"><p className="text-lg font-bold text-white font-mono">{usedRam}GB/{totalRam}GB</p><p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">RAM</p></div>
        <div className="p-3 bg-background border border-border rounded-xl"><p className="text-lg font-bold text-white font-mono">{(usedStorage / 1024).toFixed(1)}TB/{(totalStorage / 1024).toFixed(1)}TB</p><p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Storage</p></div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-background/75 border border-border/50 rounded-xl">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/70" />
          <input type="text" placeholder="Search by name, provider, IP..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:border-blue-500/60 transition" />
        </div>
        <div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-300">
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
        <div className="flex items-center justify-end text-[10px] text-muted-foreground/70 font-mono">
          Aggregate Cost: {sym}{totalMonthlyCost.toFixed(2)}/mo
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 text-center text-xs text-muted-foreground/70 p-10 animate-pulse">Syncing nodes metrics...</div>
        ) : filtered.length === 0 ? (
          <div className="col-span-3 text-center p-12">
            <div className="flex flex-col items-center gap-3">
              <Server className="w-10 h-10 text-blue-400/60" />
              <h3 className="text-sm font-bold text-white">No Servers Yet</h3>
              <p className="text-xs text-muted-foreground/70 max-w-[280px]">
                Add a physical or virtual node to start deploying services for your clients.
              </p>
              {['Founder', 'Admin'].includes(userRole) && (
                <button onClick={openCreate}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg text-xs font-semibold text-white transition shadow shadow-blue-500/10 mt-1">
                  <Plus className="w-4 h-4" /> Add Your First Server
                </button>
              )}
            </div>
          </div>
        ) : (
          filtered.map((srv) => {
            const cpuPercent = Math.min(100, Math.round((srv.allocatedCores / srv.cpu) * 100));
            const ramPercent = Math.min(100, Math.round((srv.allocatedRam / srv.ram) * 100));
            const storagePercent = Math.min(100, Math.round((srv.allocatedStorage / srv.storage) * 100));
            return (
              <div key={srv.id} className="bg-background border border-border hover:border-blue-500/30 rounded-2xl p-5 space-y-4 shadow-xl relative group transition duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Server className="w-4 h-4 text-blue-400" />
                      {srv.name}
                    </h3>
                    <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono">{srv.provider} &bull; {srv.location}</p>
                  </div>
                  <span className={`inline-block px-1.5 py-0.25 rounded text-[8px] font-bold uppercase tracking-wider ${srv.status === 'Active' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30' : srv.status === 'Maintenance' ? 'bg-amber-950/40 text-amber-400 border border-amber-800/30 animate-pulse' : 'bg-red-950/40 text-red-400 border border-red-800/30'}`}>{srv.status}</span>
                </div>

                <div className="space-y-3 border-t border-border/40 pt-3 text-xs">
                  {[
                    { label: 'Cores allocated', used: srv.allocatedCores, total: srv.cpu, pct: cpuPercent },
                    { label: 'Memory (RAM)', used: `${srv.allocatedRam.toFixed(1)} GB`, total: `${srv.ram} GB`, pct: ramPercent },
                    { label: 'Storage SSD/HDD', used: `${(srv.allocatedStorage / 1024).toFixed(1)} TB`, total: `${(srv.storage / 1024).toFixed(1)} TB`, pct: storagePercent },
                  ].map((bar, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-[9px] font-mono text-muted-foreground"><span>{bar.label}</span><span>{bar.used} / {bar.total} ({bar.pct}%)</span></div>
                      <div className="h-1.5 bg-background rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all duration-500 ${bar.pct > 85 ? 'bg-red-500' : bar.pct > 65 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${bar.pct}%` }} /></div>
                    </div>
                  ))}
                </div>

                <div className="bg-muted/60 p-3 rounded-lg border border-border/30 font-mono text-[9px] text-muted-foreground space-y-1.5">
                  <div className="flex justify-between"><span>IP Pool:</span><span className="text-zinc-300 truncate max-w-[130px]">{srv.ips.join(', ')}</span></div>
                  <div className="flex justify-between"><span>Active Services:</span><span className="text-white font-bold">{srv.activeServicesCount} containers</span></div>
                  <div className="flex justify-between"><span>Monthly Cost:</span><span className="text-white font-bold">{sym}{srv.monthlyCost.toFixed(2)}/mo</span></div>
                  <div className="flex justify-between"><span>Next Renewal:</span><span className="text-blue-400">{new Date(srv.renewalDate).toLocaleDateString()}</span></div>
                </div>

                <div className="flex gap-2 pt-2">
                  {['Founder', 'Admin'].includes(userRole) && (
                    <button onClick={() => openEdit(srv)} className="p-1.5 bg-muted hover:bg-blue-950/20 border border-border hover:border-blue-800/30 text-muted-foreground hover:text-blue-400 rounded transition cursor-pointer"><Edit3 className="w-4 h-4" /></button>
                  )}
                  <button onClick={() => handleToggleStatus(srv.id, srv.status)} className="flex-1 py-1.5 bg-muted hover:bg-blue-950/20 border border-border hover:border-blue-800/30 text-zinc-300 text-[10px] uppercase font-bold rounded transition flex items-center justify-center gap-1 cursor-pointer">
                    <Wrench className="w-3.5 h-3.5" /><span>{srv.status === 'Active' ? 'Maintenance' : 'Activate'}</span>
                  </button>
                  {['Founder', 'Admin'].includes(userRole) && (
                    <button onClick={() => handleDeleteServer(srv.id, srv.name)} className="p-1.5 bg-red-950/25 hover:bg-red-950/40 text-red-500 border border-red-900/30 hover:border-red-900/50 rounded transition cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-[#03000a]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="p-5 border-b border-border bg-zinc-950/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">{editingId ? 'Edit Node' : 'Log Physical Node'}</h3>
              <button onClick={() => setIsCreating(false)} className="text-muted-foreground/70 hover:text-zinc-300 text-xs font-bold uppercase">Cancel</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Node Hostname</label>
                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200" placeholder="e.g. HEL-NODE-04" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Provider</label>
                  <select value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300">
                    <option value="Hetzner">Hetzner Robot</option><option value="OVH">OVH Cloud</option><option value="Contabo">Contabo</option>
                    <option value="Netcup">Netcup</option><option value="ReliableSite">ReliableSite</option><option value="ColoCrossing">ColoCrossing</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Location / DC</label>
                  <input type="text" required value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] uppercase text-muted-foreground/70 mb-1 font-semibold">CPU (Cores)</label>
                  <input type="number" required value={form.cpu} onChange={e => setForm({ ...form, cpu: Number(e.target.value) })} className="w-full p-2 bg-muted border border-border rounded-lg text-zinc-200" />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-muted-foreground/70 mb-1 font-semibold">RAM (GB)</label>
                  <input type="number" required value={form.ram} onChange={e => setForm({ ...form, ram: Number(e.target.value) })} className="w-full p-2 bg-muted border border-border rounded-lg text-zinc-200" />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-muted-foreground/70 mb-1 font-semibold">Storage (GB)</label>
                  <input type="number" required value={form.storage} onChange={e => setForm({ ...form, storage: Number(e.target.value) })} className="w-full p-2 bg-muted border border-border rounded-lg text-zinc-200" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">IP Pool (comma separated)</label>
                <textarea value={form.ips} onChange={e => setForm({ ...form, ips: e.target.value })} rows={2} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200 resize-none font-mono text-[10px]" placeholder="135.181.9.40, 135.181.9.41" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Monthly Cost ({sym})</label>
                  <input type="number" step="0.01" required value={form.monthlyCost} onChange={e => setForm({ ...form, monthlyCost: Number(e.target.value) })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Renewal Date</label>
                  <input type="date" required value={form.renewalDate} onChange={e => setForm({ ...form, renewalDate: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300" />
                </div>
              </div>
              <div className="pt-2">
                <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-lg font-semibold tracking-wider uppercase transition shadow">
                  {editingId ? 'Update Node' : 'Deploy Node Host'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
}
