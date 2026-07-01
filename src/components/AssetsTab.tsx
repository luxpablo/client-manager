'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Monitor, Search } from 'lucide-react';
import { Asset } from '@/lib/db';
import { useToast } from '@/components/Toaster';
import ConfirmModal from '@/components/ConfirmModal';

interface Props { userRole: string; onLogAction: (a: string, d: string) => void; currency?: string; }

export default function AssetsTab({ userRole, onLogAction, currency = 'USD' }: Props) {
  const sym = currency === 'INR' ? '\u20B9' : '$';
  const { toast } = useToast();
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; message: string; variant?: 'danger' | 'warning' | 'default'; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [items, setItems] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newItem, setNewItem] = useState({ type: 'Server', name: '', serialNumber: '', location: '', purchaseDate: new Date().toISOString().split('T')[0], purchaseCost: 0, warrantyExpiry: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0], assignedTo: '', status: 'Active', notes: '' });
  const [editingItem, setEditingItem] = useState<Asset | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const qs: string[] = [];
      if (search) qs.push('search=' + encodeURIComponent(search));
      if (typeFilter !== 'all') qs.push('type=' + encodeURIComponent(typeFilter));
      if (statusFilter !== 'all') qs.push('status=' + encodeURIComponent(statusFilter));
      const res = await fetch('/api/admin/assets' + (qs.length ? '?' + qs.join('&') : ''));
      if (res.ok) setItems(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openEdit = (item: Asset) => {
    setNewItem({
      type: item.type, name: item.name, serialNumber: item.serialNumber || '', location: item.location,
      purchaseDate: item.purchaseDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      purchaseCost: item.purchaseCost,
      warrantyExpiry: item.warrantyExpiry?.split('T')[0] || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      assignedTo: item.assignedTo || '', status: item.status, notes: item.notes || ''
    });
    setEditingItem(item);
    setIsCreating(true);
  };

  useEffect(() => { loadData(); }, [search, typeFilter, statusFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingItem ? `/api/admin/assets/${editingItem.id}` : '/api/admin/assets';
      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newItem) });
      if (res.ok) { setIsCreating(false); setEditingItem(null); setNewItem({ type: 'Server', name: '', serialNumber: '', location: '', purchaseDate: new Date().toISOString().split('T')[0], purchaseCost: 0, warrantyExpiry: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0], assignedTo: '', status: 'Active', notes: '' }); loadData(); }
    } catch (e) { console.error(e); }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmState({ open: true, title: 'Delete Asset', message: `Remove asset "${name}"?`, variant: 'danger', onConfirm: async () => { setConfirmState(p => ({ ...p, open: false })); const res = await fetch(`/api/admin/assets/${id}`, { method: 'DELETE' }); if (res.ok) loadData(); } });
  };

  const totalValue = items.reduce((s, i) => s + i.purchaseCost, 0);
  const types = [...new Set(items.map(i => i.type))];
  const activeCount = items.filter(i => i.status === 'Active').length;
  const maintCount = items.filter(i => i.status === 'Maintenance').length;
  const retiredCount = items.filter(i => i.status === 'Retired').length;

  const warrantyDays = (expiry?: string) => {
    if (!expiry) return null;
    return Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Assets</h1>
          <p className="text-xs text-muted-foreground/70">Track hardware, network equipment, and company property.</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg text-xs font-semibold text-white transition shadow">
          <Plus className="w-4 h-4" /> <span>Add Asset</span>
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3 bg-background border border-border rounded-xl">
          <p className="text-lg font-bold text-white">{items.length}</p>
          <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Total Assets</p>
        </div>
        <div className="p-3 bg-background border border-border rounded-xl">
          <p className="text-lg font-bold text-emerald-400">{activeCount}</p>
          <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Active</p>
        </div>
        <div className="p-3 bg-background border border-border rounded-xl">
          <p className="text-lg font-bold text-amber-400">{maintCount}</p>
          <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Maintenance</p>
        </div>
        <div className="p-3 bg-background border border-border rounded-xl">
          <p className="text-lg font-bold text-red-400">{retiredCount}</p>
          <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Retired</p>
        </div>
        <div className="p-3 bg-background border border-border rounded-xl">
          <p className="text-lg font-bold text-white font-mono">{sym}{totalValue.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Total Value</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative w-full sm:w-48">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground/70" />
          <input type="text" placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 bg-muted/50 border border-border/80 rounded-lg text-xs text-zinc-200 placeholder-zinc-500" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-muted/50 border border-border/80 rounded-lg text-xs text-zinc-300 px-3 py-2">
          <option value="all">All Types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-muted/50 border border-border/80 rounded-lg text-xs text-zinc-300 px-3 py-2">
          <option value="all">All Status</option>
          <option value="Active">Active</option>
          <option value="Maintenance">Maintenance</option>
          <option value="Retired">Retired</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 bg-zinc-950/30 text-muted-foreground/70 uppercase text-[10px] tracking-wider font-bold">
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Serial</th>
                <th className="text-left p-3">Location</th>
                <th className="text-left p-3">Assigned To</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Warranty</th>
                <th className="text-right p-3">Cost</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr><td colSpan={9} className="text-center p-6 text-muted-foreground/70 animate-pulse">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="text-center p-6 text-muted-foreground/70">No assets recorded.</td></tr>
              ) : items.map(item => {
                const wDays = warrantyDays(item.warrantyExpiry);
                return (
                  <tr key={item.id} className="hover:bg-primary/5 transition">
                    <td className="p-3 text-white font-medium">{item.name}</td>
                    <td className="p-3"><span className="px-2 py-0.5 bg-blue-950/30 text-blue-300 rounded text-[10px] font-mono">{item.type}</span></td>
                    <td className="p-3 text-muted-foreground font-mono text-[10px]">{item.serialNumber || '-'}</td>
                    <td className="p-3 text-muted-foreground">{item.location}</td>
                    <td className="p-3 text-muted-foreground">{item.assignedTo || '-'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        item.status === 'Active' ? 'text-emerald-400 bg-emerald-950/30' :
                        item.status === 'Maintenance' ? 'text-amber-400 bg-amber-950/30' :
                        'text-red-400 bg-red-950/30'
                      }`}>{item.status}</span>
                    </td>
                    <td className="p-3">
                      {wDays !== null ? (
                        <span className={`font-mono text-[10px] ${wDays > 90 ? 'text-emerald-400' : wDays > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                          {wDays > 0 ? `${wDays}d` : 'Expired'}
                        </span>
                      ) : <span className="text-muted-foreground/50">-</span>}
                    </td>
                    <td className="p-3 text-right text-white font-mono font-bold">{sym}{item.purchaseCost.toLocaleString()}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button onClick={() => openEdit(item)} className="p-1.5 bg-muted border border-border hover:border-blue-900/35 text-muted-foreground/70 hover:text-blue-400 rounded transition cursor-pointer">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(item.id, item.name)} className="ml-1 p-1.5 bg-muted border border-border hover:border-red-900/35 text-muted-foreground/70 hover:text-red-400 rounded transition cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-[#03000a]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-border bg-zinc-950/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase">{editingItem ? 'Edit Asset' : 'Register Asset'}</h3>
              <button onClick={() => { setIsCreating(false); setEditingItem(null); setNewItem({ type: 'Server', name: '', serialNumber: '', location: '', purchaseDate: new Date().toISOString().split('T')[0], purchaseCost: 0, warrantyExpiry: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0], assignedTo: '', status: 'Active', notes: '' }); }} className="text-muted-foreground/70 hover:text-zinc-300 text-xs font-bold uppercase cursor-pointer">Cancel</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Type</label>
                  <select value={newItem.type} onChange={e => setNewItem({ ...newItem, type: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300">
                    <option value="Server">Server</option>
                    <option value="Network">Network</option>
                    <option value="Workstation">Workstation</option>
                    <option value="Storage">Storage</option>
                    <option value="Peripheral">Peripheral</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Status</label>
                  <select value={newItem.status} onChange={e => setNewItem({ ...newItem, status: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300">
                    <option value="Active">Active</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Asset Name</label>
                <input type="text" required value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200" placeholder="e.g., Dell R750xs" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Serial Number</label>
                  <input type="text" value={newItem.serialNumber} onChange={e => setNewItem({ ...newItem, serialNumber: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Purchase Cost ({sym})</label>
                  <input type="number" step="0.01" required value={newItem.purchaseCost} onChange={e => setNewItem({ ...newItem, purchaseCost: Number(e.target.value) })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Location</label>
                  <input type="text" required value={newItem.location} onChange={e => setNewItem({ ...newItem, location: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Assigned To</label>
                  <input type="text" value={newItem.assignedTo} onChange={e => setNewItem({ ...newItem, assignedTo: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Purchase Date</label>
                  <input type="date" required value={newItem.purchaseDate} onChange={e => setNewItem({ ...newItem, purchaseDate: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Warranty Expiry</label>
                  <input type="date" value={newItem.warrantyExpiry} onChange={e => setNewItem({ ...newItem, warrantyExpiry: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Notes</label>
                <textarea value={newItem.notes} onChange={e => setNewItem({ ...newItem, notes: e.target.value })} rows={2} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200 resize-none" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-lg font-semibold tracking-wider uppercase transition shadow cursor-pointer">Save Asset</button>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal open={confirmState.open} title={confirmState.title} message={confirmState.message} variant={confirmState.variant} confirmLabel="Delete" cancelLabel="Cancel" onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState(p => ({ ...p, open: false }))} />
    </div>
  );
}
