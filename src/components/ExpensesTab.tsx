'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, DollarSign, Search, Filter, Edit3, Wallet } from 'lucide-react';
import { Expense } from '@/lib/db';
import { useToast } from '@/components/Toaster';
import ConfirmModal from '@/components/ConfirmModal';

interface Props { userRole: string; onLogAction: (a: string, d: string) => void; currency?: string; }

export default function ExpensesTab({ userRole, onLogAction, currency = 'USD' }: Props) {
  const sym = currency === 'INR' ? '\u20B9' : '$';
  const { toast } = useToast();
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; message: string; variant?: 'danger' | 'warning' | 'default'; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [newItem, setNewItem] = useState({ category: 'Hosting', description: '', amount: 0, vendor: '', paymentMethod: 'Bank Transfer', date: new Date().toISOString().split('T')[0], notes: '' });
  const [editingItem, setEditingItem] = useState<Expense | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const qs: string[] = [];
      if (search) qs.push('search=' + encodeURIComponent(search));
      if (categoryFilter !== 'all') qs.push('category=' + encodeURIComponent(categoryFilter));
      const res = await fetch('/api/admin/expenses' + (qs.length ? '?' + qs.join('&') : ''));
      if (res.ok) setItems(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [search, categoryFilter]);

  const openEdit = (item: Expense) => {
    setEditingItem(item);
    setNewItem({
      category: item.category,
      description: item.description,
      amount: item.amount,
      vendor: item.vendor,
      paymentMethod: item.paymentMethod,
      date: new Date(item.date).toISOString().split('T')[0],
      notes: item.notes || '',
    });
    setIsCreating(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingItem ? `/api/admin/expenses/${editingItem.id}` : '/api/admin/expenses';
      const method = editingItem ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newItem) });
      if (res.ok) { setIsCreating(false); setEditingItem(null); setNewItem({ category: 'Hosting', description: '', amount: 0, vendor: '', paymentMethod: 'Bank Transfer', date: new Date().toISOString().split('T')[0], notes: '' }); loadData(); }
    } catch (e) { console.error(e); }
  };

  const handleDelete = (id: string, desc: string) => {
    setConfirmState({ open: true, title: 'Delete Expense', message: `Delete expense "${desc}"?`, variant: 'danger', onConfirm: async () => { setConfirmState(p => ({ ...p, open: false })); const res = await fetch(`/api/admin/expenses/${id}`, { method: 'DELETE' }); if (res.ok) loadData(); } });
  };

  const totalAmount = items.reduce((s, i) => s + i.amount, 0);
  const categories = [...new Set(items.map(i => i.category))];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Expenses</h1>
          <p className="text-xs text-muted-foreground/70">Track operational costs and vendor payments.</p>
        </div>
        <button onClick={() => setIsCreating(true)} className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg text-xs font-semibold text-white transition shadow">
          <Plus className="w-4 h-4" /> <span>Add Expense</span>
        </button>
      </div>

      {/* Summary + Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="bg-background border border-border rounded-xl px-5 py-3">
          <span className="text-[10px] uppercase text-muted-foreground/70 font-bold">Total</span>
          <p className="text-xl font-bold text-white font-mono">{sym}{totalAmount.toFixed(2)}</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground/70" />
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-8 pr-3 py-2 bg-muted/50 border border-border/80 rounded-lg text-xs text-zinc-200 placeholder-zinc-500" />
          </div>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-muted/50 border border-border/80 rounded-lg text-xs text-zinc-300 px-3 py-2">
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50 bg-zinc-950/30 text-muted-foreground/70 uppercase text-[10px] tracking-wider font-bold">
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Description</th>
                <th className="text-left p-3">Vendor</th>
                <th className="text-left p-3">Payment</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr><td colSpan={7} className="text-center p-6 text-muted-foreground/70 animate-pulse">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Wallet className="w-10 h-10 text-blue-400/60" />
                    <h3 className="text-sm font-bold text-white">No Expenses Yet</h3>
                    <p className="text-xs text-muted-foreground/70 max-w-[280px]">
                      Track operational costs by recording your first business expense.
                    </p>
                    <button onClick={() => setIsCreating(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg text-xs font-semibold text-white transition shadow shadow-blue-500/10 mt-1">
                      <Plus className="w-4 h-4" /> Record Your First Expense
                    </button>
                  </div>
                </td></tr>
              ) : items.map(item => (
                <tr key={item.id} className="hover:bg-primary/5 transition">
                  <td className="p-3 text-zinc-300">{new Date(item.date).toLocaleDateString()}</td>
                  <td className="p-3"><span className="px-2 py-0.5 bg-blue-950/30 text-blue-300 rounded text-[10px] font-mono">{item.category}</span></td>
                  <td className="p-3 text-white font-medium">{item.description}</td>
                  <td className="p-3 text-muted-foreground">{item.vendor}</td>
                  <td className="p-3 text-muted-foreground">{item.paymentMethod}</td>
                  <td className="p-3 text-right text-white font-mono font-bold">{sym}{item.amount.toFixed(2)}</td>
                  <td className="p-3 text-right flex gap-1 justify-end">
                    <button onClick={() => openEdit(item)} className="p-1.5 bg-muted border border-border hover:border-blue-900/35 text-muted-foreground/70 hover:text-blue-400 rounded transition cursor-pointer">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(item.id, item.description)} className="p-1.5 bg-muted border border-border hover:border-red-900/35 text-muted-foreground/70 hover:text-red-400 rounded transition cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-[#03000a]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-border bg-zinc-950/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase">Record Expense</h3>
              <button onClick={() => { setIsCreating(false); setEditingItem(null); }} className="text-muted-foreground/70 hover:text-zinc-300 text-xs font-bold uppercase">Cancel</button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Category</label>
                  <select value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300">
                    <option value="Hosting">Hosting</option>
                    <option value="Bandwidth">Bandwidth</option>
                    <option value="Software">Software</option>
                    <option value="Domain">Domain</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Office">Office</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Amount ({sym})</label>
                  <input type="number" step="0.01" required value={newItem.amount} onChange={e => setNewItem({ ...newItem, amount: Number(e.target.value) })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Description</label>
                <input type="text" required value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200" placeholder="What was this expense for?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Vendor</label>
                  <input type="text" required value={newItem.vendor} onChange={e => setNewItem({ ...newItem, vendor: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Payment Method</label>
                  <select value={newItem.paymentMethod} onChange={e => setNewItem({ ...newItem, paymentMethod: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300">
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="PayPal">PayPal</option>
                    <option value="Crypto">Crypto</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Date</label>
                <input type="date" required value={newItem.date} onChange={e => setNewItem({ ...newItem, date: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300" />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Notes</label>
                <textarea value={newItem.notes} onChange={e => setNewItem({ ...newItem, notes: e.target.value })} rows={2} className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200 resize-none" />
              </div>
              <button type="submit" className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-lg font-semibold tracking-wider uppercase transition shadow">Save Expense</button>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal open={confirmState.open} title={confirmState.title} message={confirmState.message} variant={confirmState.variant} confirmLabel="Delete" cancelLabel="Cancel" onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState(p => ({ ...p, open: false }))} />
    </div>
  );
}
