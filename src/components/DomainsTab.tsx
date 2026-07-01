'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Globe, Search } from 'lucide-react';
import { Domain, Customer } from '@/lib/db';
import { useToast } from '@/components/Toaster';
import ConfirmModal from '@/components/ConfirmModal';

interface Props { userRole: string; onLogAction: (a: string, d: string) => void; currency?: string; customers?: Customer[]; }

export default function DomainsTab({ userRole, onLogAction, customers = [] }: Props) {
  const { toast } = useToast();
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; message: string; variant?: 'danger' | 'warning' | 'default'; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [items, setItems] = useState<(Domain & { customer?: Customer })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingItem, setEditingItem] = useState<Domain | null>(null);
  const [newItem, setNewItem] = useState({ domain: '', registrar: 'Namecheap', customerId: '', registrationDate: new Date().toISOString().split('T')[0], expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0], autoRenew: true, dnsProvider: 'Cloudflare', notes: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const qs: string[] = [];
      if (search) qs.push('search=' + encodeURIComponent(search));
      if (statusFilter !== 'all') qs.push('status=' + encodeURIComponent(statusFilter));
      const res = await fetch('/api/admin/domains' + (qs.length ? '?' + qs.join('&') : ''));
      if (res.ok) {
        const data = await res.json();
        const enriched = data.map((d: Domain) => ({ ...d, customer: customers.find(c => c.id === d.customerId) }));
        setItems(enriched);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [search, statusFilter, customers]);

  const openEdit = (item: Domain) => {
    setNewItem({
      domain: item.domain, registrar: item.registrar, customerId: item.customerId || '',
      registrationDate: new Date(item.registrationDate).toISOString().split('T')[0],
      expiryDate: new Date(item.expiryDate).toISOString().split('T')[0],
      autoRenew: item.autoRenew, dnsProvider: item.dnsProvider || 'Cloudflare', notes: item.notes || ''
    });
    setEditingItem(item);
    setIsCreating(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingItem ? `/api/admin/domains/${editingItem.id}` : '/api/admin/domains';
      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newItem) });
      if (res.ok) { setIsCreating(false); setEditingItem(null); setNewItem({ domain: '', registrar: 'Namecheap', customerId: '', registrationDate: new Date().toISOString().split('T')[0], expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0], autoRenew: true, dnsProvider: 'Cloudflare', notes: '' }); loadData(); }
    } catch (e) { console.error(e); }
  };

  const handleDelete = (id: string, domain: string) => {
    setConfirmState({ open: true, title: 'Delete Domain', message: `Remove domain "${domain}"?`, variant: 'danger', onConfirm: async () => { setConfirmState(p => ({ ...p, open: false })); const res = await fetch(`/api/admin/domains/${id}`, { method: 'DELETE' }); if (res.ok) loadData(); } });
  };

  const now = new Date();
  const getStatus = (expiry: string) => {
    const d = new Date(expiry);
    if (d <= now) return { label: 'Expired', color: 'text-red-400 bg-red-950/30' };
    if (d <= new Date(Date.now() + 30 * 86400000)) return { label: 'Expiring', color: 'text-amber-400 bg-amber-950/30' };
    return { label: 'Active', color: 'text-emerald-400 bg-emerald-950/30' };
  };

  const daysLeft = (expiry: string) => Math.ceil((new Date(expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const active = items.filter(i => getStatus(i.expiryDate).label === 'Active').length;
  const expiring = items.filter(i => getStatus(i.expiryDate).label === 'Expiring').length;
  const expired = items.filter(i => getStatus(i.expiryDate).label === 'Expired').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Domains</h1>
          <p className="text-xs text-muted-foreground/70">Manage domain registrations and DNS.</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg text-xs font-semibold text-white transition shadow">
          <Plus className="w-4 h-4" /> <span>Add Domain</span>
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 bg-background border border-border rounded-xl">
          <p className="text-lg font-bold text-white">{items.length}</p>
          <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Total</p>
        </div>
        <div className="p-3 bg-background border border-border rounded-xl">
          <p className="text-lg font-bold text-emerald-400">{active}</p>
          <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Active</p>
        </div>
        <div className="p-3 bg-background border border-border rounded-xl">
          <p className="text-lg font-bold text-amber-400">{expiring}</p>
          <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Expiring</p>
        </div>
        <div className="p-3 bg-background border border-border rounded-xl">
          <p className="text-lg font-bold text-red-400">{expired}</p>
          <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Expired</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:w-64">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground/70" />
          <input type="text" placeholder="Search domains..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 bg-muted/50 border border-border/80 rounded-lg text-xs text-zinc-200 placeholder-zinc-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-muted/50 border border-border/80 rounded-lg text-xs text-zinc-300 px-3 py-2">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="expiring">Expiring (30d)</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center text-xs text-muted-foreground/70 p-10 animate-pulse">Loading domains...</div>
        ) : items.length === 0 ? (
          <div className="col-span-full text-center text-xs text-muted-foreground/70 p-10">No domains found.</div>
        ) : items.map(item => {
          const status = getStatus(item.expiryDate);
          const days = daysLeft(item.expiryDate);
          return (
            <div key={item.id} className="bg-background border border-border hover:border-blue-500/30 rounded-2xl p-5 space-y-3 shadow-xl group transition duration-300">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-950/40 border border-blue-800/30 flex items-center justify-center text-blue-400"><Globe className="w-4 h-4" /></div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono leading-tight">{item.domain}</h3>
                    <span className="text-[9px] text-muted-foreground/70 font-mono">{item.registrar}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => openEdit(item)} className="p-1.5 bg-muted border border-border hover:border-blue-900/35 text-muted-foreground/70 hover:text-blue-400 rounded cursor-pointer"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(item.id, item.domain)} className="p-1.5 bg-muted border border-border hover:border-red-900/35 text-muted-foreground/70 hover:text-red-400 rounded cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>

              <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase inline-block ${status.color}`}>{status.label}</div>

              <div className="text-[10px] text-muted-foreground font-mono space-y-1">
                <div className="flex justify-between">
                  <span>Customer:</span>
                  <span className="text-zinc-300 truncate max-w-[140px]">{item.customer?.name || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Registered:</span>
                  <span className="text-zinc-300">{new Date(item.registrationDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Expires:</span>
                  <span className="text-zinc-300">{new Date(item.expiryDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>DNS:</span>
                  <span className="text-zinc-300">{item.dnsProvider || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Auto-Renew:</span>
                  <span className={item.autoRenew ? 'text-emerald-400' : 'text-muted-foreground/70'}>{item.autoRenew ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border/30">
                  <span>Days Left:</span>
                  <span className={`font-bold ${days > 30 ? 'text-emerald-400' : days > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                    {days > 0 ? `${days}d` : 'EXPIRED'}
                  </span>
                </div>
              </div>

              {item.notes && (
                <p className="text-[9px] text-muted-foreground/60 italic border-t border-border/30 pt-2">{item.notes}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Create/Edit Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-[#03000a]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-border bg-zinc-950/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase">{editingItem ? 'Edit Domain' : 'Register Domain'}</h3>
              <button onClick={() => { setIsCreating(false); setEditingItem(null); }} className="text-muted-foreground/70 hover:text-zinc-300 text-xs font-bold uppercase cursor-pointer">Cancel</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Domain Name</label>
                <input type="text" required value={newItem.domain} onChange={e => setNewItem({ ...newItem, domain: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200" placeholder="example.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Registrar</label>
                  <select value={newItem.registrar} onChange={e => setNewItem({ ...newItem, registrar: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300">
                    <option value="Namecheap">Namecheap</option>
                    <option value="GoDaddy">GoDaddy</option>
                    <option value="Cloudflare">Cloudflare</option>
                    <option value="Google Domains">Google Domains</option>
                    <option value="Porkbun">Porkbun</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Customer</label>
                  <select value={newItem.customerId} onChange={e => setNewItem({ ...newItem, customerId: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300">
                    <option value="">— None —</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Registration Date</label>
                  <input type="date" required value={newItem.registrationDate} onChange={e => setNewItem({ ...newItem, registrationDate: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Expiry Date</label>
                  <input type="date" required value={newItem.expiryDate} onChange={e => setNewItem({ ...newItem, expiryDate: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">DNS Provider</label>
                  <select value={newItem.dnsProvider} onChange={e => setNewItem({ ...newItem, dnsProvider: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300">
                    <option value="Cloudflare">Cloudflare</option>
                    <option value="Namecheap">Namecheap</option>
                    <option value="AWS Route53">AWS Route53</option>
                    <option value="DigitalOcean">DigitalOcean</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newItem.autoRenew} onChange={e => setNewItem({ ...newItem, autoRenew: e.target.checked })} className="accent-blue-500" />
                    <span className="text-[10px] uppercase text-muted-foreground/70 font-semibold">Auto-Renew</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Notes</label>
                <textarea value={newItem.notes} onChange={e => setNewItem({ ...newItem, notes: e.target.value })} rows={2} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200 resize-none" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-lg font-semibold tracking-wider uppercase transition shadow cursor-pointer">Save Domain</button>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal open={confirmState.open} title={confirmState.title} message={confirmState.message} variant={confirmState.variant} confirmLabel="Delete" cancelLabel="Cancel" onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState(p => ({ ...p, open: false }))} />
    </div>
  );
}
