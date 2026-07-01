'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, RefreshCw, Users, FileText, Package, Server, ShoppingCart, CheckCircle, XCircle, Download } from 'lucide-react';
import { useToast } from '@/components/Toaster';
import { SystemSettings, Customer } from '@/lib/db';

interface Props { userRole: string; onLogAction: (a: string, d: string) => void; currency?: string; customers?: Customer[]; }

export default function PaymenterTab({ userRole, onLogAction, currency = 'USD', customers = [] }: Props) {
  const sym = currency === 'INR' ? '\u20B9' : '$';
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [configUrl, setConfigUrl] = useState('');
  const [configKey, setConfigKey] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    const res = await fetch('/api/admin/settings');
    if (res.ok) {
      const data = await res.json();
      setSettings(data);
      setConfigUrl(data.integrations?.paymenter?.baseUrl || '');
      setConfigKey(data.integrations?.paymenter?.apiKey || '');
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const testConnection = async () => {
    if (!configUrl || !configKey) { toast('error', 'Configure URL and API key first.'); return; }
    try {
      const res = await fetch('/api/admin/paymenter/test');
      const data = await res.json();
      setConnected(data.connected);
      toast(data.connected ? 'success' : 'error', data.connected ? 'Connected to Paymenter.' : data.error || 'Connection failed.');
    } catch { setConnected(false); toast('error', 'Connection failed.'); }
  };

  const saveConfig = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = { ...settings, integrations: { ...settings.integrations, paymenter: { baseUrl: configUrl, apiKey: configKey, enabled: true } } };
      const res = await fetch('/api/admin/settings/all', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated),
      });
      if (res.ok) { toast('success', 'Paymenter config saved.'); fetchSettings(); }
      else toast('error', 'Failed to save config.');
    } catch { toast('error', 'Save failed.'); }
    finally { setSaving(false); }
  };

  const syncData = async (type: string) => {
    setSyncing(type);
    try {
      const res = await fetch(`/api/admin/paymenter/sync`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (res.ok) {
        if (type === 'users') setUsers(data);
        else if (type === 'invoices') setInvoices(data);
        else if (type === 'products') setProducts(data);
        else if (type === 'services') setServices(data);
        else if (type === 'orders') setOrders(data);
        toast('success', `${type} synced (${data.length} records).`);
      } else toast('error', data.error || `Sync failed (${res.status}).`);
    } catch { toast('error', 'Sync failed.'); }
    finally { setSyncing(null); }
  };

  const syncAll = async () => {
    for (const type of ['users', 'products', 'invoices', 'services', 'orders']) {
      await syncData(type);
    }
    toast('success', 'All data synced.');
  };

  const importUsersAsCustomers = async () => {
    setImporting(true);
    let count = 0;
    for (const u of users) {
      const exists = customers.some(c => c.email === u.email);
      if (exists) continue;
      try {
        const res = await fetch('/api/admin/customers', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${u.first_name} ${u.last_name}`.trim(),
            email: u.email, discord: '', phone: '', address: '', notes: 'Imported from Paymenter'
          })
        });
        if (res.ok) count++;
      } catch {}
    }
    toast('success', `Imported ${count} new customers from Paymenter.`);
    if (count > 0) window.location.reload();
    setImporting(false);
  };

  const cfg = settings?.integrations?.paymenter;
  const isConfigured = cfg?.baseUrl && cfg?.apiKey;
  const hasData = users.length > 0 || invoices.length > 0 || products.length > 0 || services.length > 0 || orders.length > 0;

  const syncButtons = [
    { id: 'users', label: 'Users', icon: Users, count: users.length },
    { id: 'products', label: 'Products', icon: Package, count: products.length },
    { id: 'invoices', label: 'Invoices', icon: FileText, count: invoices.length },
    { id: 'services', label: 'Services', icon: Server, count: services.length },
    { id: 'orders', label: 'Orders', icon: ShoppingCart, count: orders.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="w-5 h-5 text-blue-400" />
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Paymenter Billing</h1>
            <p className="text-xs text-muted-foreground/70">Sync and manage billing data from Paymenter.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isConfigured && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              {connected === true ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : connected === false ? <XCircle className="w-3.5 h-3.5 text-red-400" /> : <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />}
              <span className="text-muted-foreground/70">{connected === true ? 'Connected' : connected === false ? 'Failed' : 'Untested'}</span>
            </div>
          )}
          <button onClick={() => setShowConfig(!showConfig)} className="px-3 py-1.5 bg-muted border border-border hover:border-blue-800/40 rounded-lg text-[10px] text-muted-foreground hover:text-blue-400 font-bold uppercase tracking-wider transition cursor-pointer">
            {showConfig ? 'Hide Config' : 'Configure'}
          </button>
        </div>
      </div>

      {/* Config Panel */}
      {showConfig && (
        <div className="bg-background border border-border rounded-2xl p-5 space-y-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Connection Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1 font-semibold">Paymenter URL</label>
              <input type="url" value={configUrl} onChange={e => setConfigUrl(e.target.value)} className="w-full p-2.5 bg-muted border border-border rounded-lg text-xs text-zinc-200" placeholder="https://billing.example.com" />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1 font-semibold">API Key</label>
              <input type="password" value={configKey} onChange={e => setConfigKey(e.target.value)} className="w-full p-2.5 bg-muted border border-border rounded-lg text-xs text-zinc-200 font-mono" placeholder="pt_..." />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={saveConfig} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[10px] font-bold uppercase rounded-lg transition cursor-pointer">{saving ? 'Saving...' : 'Save'}</button>
            <button onClick={testConnection} className="px-4 py-2 bg-muted hover:bg-zinc-800 border border-border text-zinc-300 text-[10px] font-bold uppercase rounded-lg transition cursor-pointer">Test Connection</button>
          </div>
        </div>
      )}

      {/* Sync Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {syncButtons.map(btn => (
          <button key={btn.id} onClick={() => syncData(btn.id)} disabled={syncing === btn.id || !isConfigured}
            className="bg-background border border-border hover:border-blue-500/30 rounded-2xl p-5 text-left transition disabled:opacity-40 cursor-pointer group">
            <div className="flex items-center justify-between mb-3">
              <btn.icon className="w-5 h-5 text-blue-400" />
              <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground/70 ${syncing === btn.id ? 'animate-spin text-blue-400' : 'opacity-0 group-hover:opacity-100'} transition`} />
            </div>
            <p className="text-xs text-muted-foreground/70 uppercase tracking-wider font-bold">{btn.label}</p>
            <p className="text-lg font-bold text-white font-mono mt-1">{btn.count}</p>
          </button>
        ))}
      </div>

      {/* Actions Bar */}
      {isConfigured && (
        <div className="flex gap-2">
          <button onClick={syncAll} disabled={syncing !== null} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 rounded-lg text-xs font-bold text-white transition shadow cursor-pointer">
            <RefreshCw className={`w-4 h-4 ${syncing !== null ? 'animate-spin' : ''}`} /> <span>Sync All</span>
          </button>
          {users.length > 0 && (
            <button onClick={importUsersAsCustomers} disabled={importing} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-xs font-bold text-white transition cursor-pointer">
              <Download className="w-4 h-4" /> <span>{importing ? 'Importing...' : `Import ${users.length} Users as Customers`}</span>
            </button>
          )}
        </div>
      )}

      {/* Data Tables */}
      {hasData && (
        <div className="space-y-4">
          {users.length > 0 && (
            <div className="bg-background border border-border rounded-2xl p-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Synced Users ({users.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border/50 text-muted-foreground/70 text-[10px] uppercase font-bold tracking-wider"><th className="text-left p-2">Name</th><th className="text-left p-2">Email</th><th className="text-left p-2">Created</th></tr></thead>
                  <tbody className="divide-y divide-border/40">
                    {users.map((c: any, i: number) => (
                      <tr key={i} className="hover:bg-primary/5"><td className="p-2 text-white">{c.first_name} {c.last_name}</td><td className="p-2 text-muted-foreground">{c.email}</td><td className="p-2 text-muted-foreground/70 font-mono">{new Date(c.created_at).toLocaleDateString()}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {products.length > 0 && (
            <div className="bg-background border border-border rounded-2xl p-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Synced Products ({products.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border/50 text-muted-foreground/70 text-[10px] uppercase font-bold tracking-wider"><th className="text-left p-2">Name</th><th className="text-left p-2 text-right">Price</th><th className="text-left p-2 text-right">Stock</th><th className="text-left p-2">Slug</th></tr></thead>
                  <tbody className="divide-y divide-border/40">
                    {products.map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-primary/5"><td className="p-2 text-white">{p.name}</td><td className="p-2 text-right text-white font-mono">{sym}{parseFloat(p.price || 0).toFixed(2)}</td><td className="p-2 text-right text-muted-foreground">{p.stock}</td><td className="p-2 text-muted-foreground/70 font-mono text-[10px]">{p.slug}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {invoices.length > 0 && (
            <div className="bg-background border border-border rounded-2xl p-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Synced Invoices ({invoices.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border/50 text-muted-foreground/70 text-[10px] uppercase font-bold tracking-wider"><th className="text-left p-2">ID</th><th className="text-left p-2">Status</th><th className="text-left p-2">Currency</th><th className="text-left p-2">Due</th></tr></thead>
                  <tbody className="divide-y divide-border/40">
                    {invoices.map((inv: any, i: number) => (
                      <tr key={i} className="hover:bg-primary/5"><td className="p-2 text-blue-400 font-mono">{inv.id}</td><td className="p-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${inv.status === 'paid' ? 'bg-emerald-950/30 text-emerald-400' : 'bg-yellow-950/30 text-yellow-400'}`}>{inv.status}</span></td><td className="p-2 text-zinc-300">{inv.currency_code}</td><td className="p-2 text-muted-foreground font-mono text-[10px]">{inv.due_at ? new Date(inv.due_at).toLocaleDateString() : '-'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {services.length > 0 && (
            <div className="bg-background border border-border rounded-2xl p-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Synced Services ({services.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border/50 text-muted-foreground/70 text-[10px] uppercase font-bold tracking-wider"><th className="text-left p-2">ID</th><th className="text-right p-2">Price</th><th className="text-left p-2">Currency</th><th className="text-left p-2">Status</th><th className="text-left p-2">Expires</th></tr></thead>
                  <tbody className="divide-y divide-border/40">
                    {services.map((s: any, i: number) => (
                      <tr key={i} className="hover:bg-primary/5"><td className="p-2 text-blue-400 font-mono">{s.id}</td><td className="p-2 text-right text-white font-mono">{sym}{parseFloat(s.price || 0).toFixed(2)}</td><td className="p-2 text-zinc-300">{s.currency_code}</td><td className="p-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.status === 'active' ? 'bg-emerald-950/30 text-emerald-400' : 'bg-muted/30 text-muted-foreground'}`}>{s.status}</span></td><td className="p-2 text-muted-foreground font-mono text-[10px]">{s.expires_at ? new Date(s.expires_at).toLocaleDateString() : '-'}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {orders.length > 0 && (
            <div className="bg-background border border-border rounded-2xl p-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Synced Orders ({orders.length})</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border/50 text-muted-foreground/70 text-[10px] uppercase font-bold tracking-wider"><th className="text-left p-2">ID</th><th className="text-left p-2">User</th><th className="text-left p-2">Currency</th><th className="text-left p-2">Created</th></tr></thead>
                  <tbody className="divide-y divide-border/40">
                    {orders.map((o: any, i: number) => (
                      <tr key={i} className="hover:bg-primary/5"><td className="p-2 text-blue-400 font-mono">{o.id}</td><td className="p-2 text-zinc-300">{o.user_id}</td><td className="p-2 text-zinc-300">{o.currency_code}</td><td className="p-2 text-muted-foreground/70 font-mono text-[10px]">{new Date(o.created_at).toLocaleDateString()}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {!hasData && isConfigured && (
        <div className="bg-background border border-border rounded-2xl p-10 text-center text-muted-foreground/70">
          <p className="text-xs">Click <span className="text-blue-400 font-bold">Sync All</span> or any category above to fetch data from Paymenter.</p>
        </div>
      )}

      {!isConfigured && (
        <div className="bg-background border border-border rounded-2xl p-10 text-center text-muted-foreground/70">
          <p className="text-xs">Configure your Paymenter connection in the <span className="text-blue-400 font-bold">Configure</span> panel above to get started.</p>
        </div>
      )}
    </div>
  );
}
