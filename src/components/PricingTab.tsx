'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Sparkles, DollarSign, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { PricingPlan } from '@/lib/db';
import { useToast } from '@/components/Toaster';

export default function PricingTab() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'shared', description: '', monthlyPrice: '', yearlyPrice: '', setupFee: '0',
    features: '', popular: false, status: 'Active' as const,
  });

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/pricingPlans');
      if (res.ok) setPlans(await res.json());
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.monthlyPrice) { toast('error', 'Name and monthly price required'); return; }
    const features = form.features.split('\n').filter(f => f.trim());
    const res = await fetch('/api/admin/pricingPlans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, monthlyPrice: form.monthlyPrice, yearlyPrice: form.yearlyPrice, setupFee: form.setupFee, features }),
    });
    if (res.ok) {
      toast('success', `Plan "${form.name}" created`);
      setShowForm(false);
      setForm({ name: '', type: 'shared', description: '', monthlyPrice: '', yearlyPrice: '', setupFee: '0', features: '', popular: false, status: 'Active' });
      fetchPlans();
    } else { toast('error', 'Failed to create plan'); }
  };

  const handleDelete = async (id: string, name: string) => {
    const res = await fetch(`/api/admin/pricingPlans/${id}`, { method: 'DELETE' });
    if (res.ok) { toast('success', `Deleted "${name}"`); fetchPlans(); }
    else { toast('error', 'Failed to delete plan'); }
  };

  const totalMonthly = plans.reduce((s, p) => s + p.monthlyPrice, 0);
  const totalYearly = plans.reduce((s, p) => s + p.yearlyPrice, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-blue-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wide">Pricing Plans</h2>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> Add Plan
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
          <p className="text-[10px] text-zinc-500 font-mono">Total Plans</p>
          <p className="text-lg font-bold text-white">{plans.length}</p>
        </div>
        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
          <p className="text-[10px] text-zinc-500 font-mono">Monthly Total</p>
          <p className="text-lg font-bold text-white">${totalMonthly.toLocaleString()}</p>
        </div>
        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
          <p className="text-[10px] text-zinc-500 font-mono">Yearly Total</p>
          <p className="text-lg font-bold text-white">${totalYearly.toLocaleString()}</p>
        </div>
        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
          <p className="text-[10px] text-zinc-500 font-mono">Active Plans</p>
          <p className="text-lg font-bold text-white">{plans.filter(p => p.status === 'Active').length}</p>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-background border border-border rounded-2xl p-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Plan name *" required
              className="p-2 bg-muted border border-border rounded-lg text-xs text-white" />
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="p-2 bg-muted border border-border rounded-lg text-xs text-zinc-300">
              <option value="shared">Shared Hosting</option>
              <option value="vps">VPS</option>
              <option value="dedicated">Dedicated</option>
              <option value="game">Game Server</option>
              <option value="other">Other</option>
            </select>
            <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Short description"
              className="p-2 bg-muted border border-border rounded-lg text-xs text-white" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 font-mono block mb-1">Monthly Price ($)</label>
              <input type="number" step="0.01" value={form.monthlyPrice} onChange={e => setForm({ ...form, monthlyPrice: e.target.value })} required
                className="w-full p-2 bg-muted border border-border rounded-lg text-xs text-white" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 font-mono block mb-1">Yearly Price ($)</label>
              <input type="number" step="0.01" value={form.yearlyPrice} onChange={e => setForm({ ...form, yearlyPrice: e.target.value })}
                className="w-full p-2 bg-muted border border-border rounded-lg text-xs text-white" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 font-mono block mb-1">Setup Fee ($)</label>
              <input type="number" step="0.01" value={form.setupFee} onChange={e => setForm({ ...form, setupFee: e.target.value })}
                className="w-full p-2 bg-muted border border-border rounded-lg text-xs text-white" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 font-mono block mb-1">Features (one per line)</label>
            <textarea value={form.features} onChange={e => setForm({ ...form, features: e.target.value })} rows={3} placeholder="1 CPU Core&#10;1 GB RAM&#10;20 GB SSD"
              className="w-full p-2 bg-muted border border-border rounded-lg text-xs text-white resize-none" />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input type="checkbox" checked={form.popular} onChange={e => setForm({ ...form, popular: e.target.checked })} className="accent-blue-500" />
              Mark as Popular
            </label>
          </div>
          <button type="submit" className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition flex items-center gap-2 cursor-pointer">
            <Save className="w-3.5 h-3.5" /> Create Pricing Plan
          </button>
        </form>
      )}

      {loading ? (
        <div className="animate-pulse space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-white/5 rounded-xl" />)}</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold text-zinc-400">No pricing plans yet</p>
          <p className="text-[10px] text-zinc-600 mt-1">Create your first plan to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {plans.map(plan => (
            <div key={plan.id} className="bg-background border border-border rounded-2xl p-5 hover:border-blue-500/20 transition">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{plan.name}</h3>
                      {plan.popular && <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-[9px] font-bold rounded-full border border-blue-500/20">Popular</span>}
                      <span className={`px-2 py-0.5 text-[9px] font-mono rounded-full ${plan.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/20'}`}>{plan.status}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{plan.type} — {plan.description || 'No description'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDelete(plan.id, plan.name)} className="p-1.5 text-zinc-500 hover:text-red-400 transition cursor-pointer" title="Delete plan">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-6 text-xs">
                <div>
                  <p className="text-[10px] text-zinc-500 font-mono">Monthly</p>
                  <p className="font-bold text-white">${plan.monthlyPrice.toFixed(2)}<span className="text-zinc-500 font-mono text-[10px]">/mo</span></p>
                </div>
                {plan.yearlyPrice > 0 && (
                  <div>
                    <p className="text-[10px] text-zinc-500 font-mono">Yearly</p>
                    <p className="font-bold text-white">${plan.yearlyPrice.toFixed(2)}<span className="text-zinc-500 font-mono text-[10px]">/yr</span></p>
                  </div>
                )}
                {plan.setupFee > 0 && (
                  <div>
                    <p className="text-[10px] text-zinc-500 font-mono">Setup Fee</p>
                    <p className="font-bold text-white">${plan.setupFee.toFixed(2)}</p>
                  </div>
                )}
              </div>
              {plan.features.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {plan.features.map((f, i) => (
                    <span key={i} className="px-2 py-0.5 bg-white/[0.03] border border-white/5 rounded text-[10px] text-zinc-400">{f}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {plans.length > 0 && (
        <div className="bg-background border border-border rounded-2xl p-5">
          <h3 className="text-xs font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            Plan Preview — Customer-Facing Display
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.filter(p => p.status === 'Active').slice(0, 3).map(plan => (
              <div key={plan.id} className={`relative rounded-xl p-5 border text-center ${plan.popular ? 'border-blue-500 bg-blue-950/20' : 'border-white/10 bg-white/[0.02]'}`}>
                {plan.popular && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-[9px] font-bold rounded-full">Most Popular</span>}
                <h4 className="text-sm font-bold text-white mt-2">{plan.name}</h4>
                <p className="text-[10px] text-zinc-500 mt-1 mb-4">{plan.description}</p>
                <p className="text-3xl font-bold text-white">${plan.monthlyPrice}<span className="text-xs text-zinc-500 font-mono">/mo</span></p>
                {plan.yearlyPrice > 0 && <p className="text-[10px] text-zinc-500 mt-1">${plan.yearlyPrice}/year</p>}
                <ul className="mt-4 space-y-2 text-left">
                  {plan.features.slice(0, 5).map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-[11px] text-zinc-400">
                      <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button className="w-full mt-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold rounded-lg transition cursor-pointer">
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
