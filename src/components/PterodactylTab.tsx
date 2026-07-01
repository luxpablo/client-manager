'use client';

import React, { useState, useEffect } from 'react';
import { Server, RefreshCw, Users, Grid3X3, Play, Pause, Search, CheckCircle, XCircle, Disc3, Download } from 'lucide-react';
import { useToast } from '@/components/Toaster';
import { SystemSettings } from '@/lib/db';
import ConfirmModal from '@/components/ConfirmModal';

interface Props { userRole: string; onLogAction: (a: string, d: string) => void; }

export default function PterodactylTab({ userRole, onLogAction }: Props) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [servers, setServers] = useState<any[]>([]);
  const [nodes, setNodes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState('servers');
  const [search, setSearch] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [configUrl, setConfigUrl] = useState('');
  const [configKey, setConfigKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; message: string; variant?: 'danger' | 'warning' | 'default'; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const fetchSettings = async () => {
    const res = await fetch('/api/admin/settings');
    if (res.ok) {
      const data = await res.json();
      setSettings(data);
      setConfigUrl(data.integrations?.pterodactyl?.baseUrl || '');
      setConfigKey(data.integrations?.pterodactyl?.apiKey || '');
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const testConnection = async () => {
    if (!configUrl || !configKey) { toast('error', 'Configure URL and API key first.'); return; }
    try {
      const res = await fetch('/api/admin/pterodactyl/test');
      const data = await res.json();
      setConnected(data.connected);
      toast(data.connected ? 'success' : 'error', data.connected ? 'Connected to Pterodactyl.' : data.error || 'Connection failed.');
    } catch { setConnected(false); toast('error', 'Connection failed.'); }
  };

  const saveConfig = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = { ...settings, integrations: { ...settings.integrations, pterodactyl: { baseUrl: configUrl, apiKey: configKey, enabled: true } } };
      const res = await fetch('/api/admin/settings/all', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
      if (res.ok) { toast('success', 'Pterodactyl config saved.'); fetchSettings(); } else toast('error', 'Save failed.');
    } catch { toast('error', 'Save failed.'); }
    finally { setSaving(false); }
  };

  const syncData = async (type: string) => {
    setSyncing(type);
    try {
      const res = await fetch('/api/admin/pterodactyl/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) });
      const data = await res.json();
      if (res.ok) {
        if (type === 'servers') setServers(data);
        else if (type === 'nodes') setNodes(data);
        else if (type === 'users') setUsers(data);
        toast('success', `${type} synced (${data.length} records).`);
      } else toast('error', data.error || `Sync failed (${res.status}).`);
    } catch { toast('error', 'Sync failed.'); }
    finally { setSyncing(null); }
  };

  const syncAll = async () => {
    for (const type of ['servers', 'nodes', 'users']) {
      await syncData(type);
    }
    toast('success', 'All Pterodactyl data synced.');
  };

  const toggleServer = async (serverId: number, name: string, suspended: boolean) => {
    const action = suspended ? 'unsuspend' : 'suspend';
    setConfirmState({
      open: true, title: `${suspended ? 'Unsuspend' : 'Suspend'} Server`,
      message: `${suspended ? 'Unsuspend' : 'Suspend'} server "${name}"?`,
      variant: 'warning',
      onConfirm: async () => {
        setConfirmState(p => ({ ...p, open: false }));
        try {
          const res = await fetch('/api/admin/pterodactyl/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ serverId, action }) });
          if (res.ok) { toast('success', `Server ${suspended ? 'unsuspended' : 'suspended'}.`); syncData('servers'); }
          else toast('error', 'Action failed.');
        } catch { toast('error', 'Action failed.'); }
      }
    });
  };

  const cfg = settings?.integrations?.pterodactyl;
  const isConfigured = cfg?.baseUrl && cfg?.apiKey;

  const filteredServers = servers.filter((s: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const name = s.name || s.attributes?.name || '';
    const node = s.node_name || s.attributes?.relationships?.node?.attributes?.name || '';
    return name.toLowerCase().includes(q) || node.toLowerCase().includes(q);
  });

  const navTabs = [
    { id: 'servers', label: 'Servers', icon: Server, count: servers.length },
    { id: 'nodes', label: 'Nodes', icon: Grid3X3, count: nodes.length },
    { id: 'users', label: 'Users', icon: Users, count: users.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Disc3 className="w-5 h-5 text-blue-400" />
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Pterodactyl Panel</h1>
            <p className="text-xs text-muted-foreground/70">Manage game servers, nodes, and users.</p>
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
              <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1 font-semibold">Panel URL</label>
              <input type="url" value={configUrl} onChange={e => setConfigUrl(e.target.value)} className="w-full p-2.5 bg-muted border border-border rounded-lg text-xs text-zinc-200" placeholder="https://panel.example.com" />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1 font-semibold">API Key</label>
              <input type="password" value={configKey} onChange={e => setConfigKey(e.target.value)} className="w-full p-2.5 bg-muted border border-border rounded-lg text-xs text-zinc-200 font-mono" placeholder="ptla_..." />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={saveConfig} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[10px] font-bold uppercase rounded-lg transition cursor-pointer">{saving ? 'Saving...' : 'Save'}</button>
            <button onClick={testConnection} className="px-4 py-2 bg-muted hover:bg-zinc-800 border border-border text-zinc-300 text-[10px] font-bold uppercase rounded-lg transition cursor-pointer">Test Connection</button>
          </div>
        </div>
      )}

      {/* Sync Cards */}
      <div className="grid grid-cols-3 gap-4">
        {navTabs.map(tab => (
          <button key={tab.id} onClick={() => { setActiveSection(tab.id); syncData(tab.id); }}
            disabled={syncing === tab.id || !isConfigured}
            className={`bg-background border rounded-2xl p-5 text-left transition disabled:opacity-40 cursor-pointer group ${activeSection === tab.id ? 'border-blue-500/40' : 'border-border hover:border-blue-500/30'}`}>
            <div className="flex items-center justify-between mb-3">
              <tab.icon className={`w-5 h-5 ${activeSection === tab.id ? 'text-blue-400' : 'text-muted-foreground/70'}`} />
              <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground/70 ${syncing === tab.id ? 'animate-spin text-blue-400' : 'opacity-0 group-hover:opacity-100'} transition`} />
            </div>
            <p className="text-xs text-muted-foreground/70 uppercase tracking-wider font-bold">{tab.label}</p>
            <p className="text-lg font-bold text-white font-mono mt-1">{tab.count}</p>
          </button>
        ))}
      </div>

      {/* Actions Bar */}
      {isConfigured && (
        <div className="flex gap-2">
          <button onClick={syncAll} disabled={syncing !== null} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 rounded-lg text-xs font-bold text-white transition shadow cursor-pointer">
            <RefreshCw className={`w-4 h-4 ${syncing !== null ? 'animate-spin' : ''}`} /> <span>Sync All</span>
          </button>
          {activeSection === 'servers' && servers.length > 0 && (
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground/70" />
              <input type="text" placeholder="Search servers..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-muted/50 border border-border/80 rounded-lg text-xs text-zinc-200 placeholder-zinc-500" />
            </div>
          )}
        </div>
      )}

      {/* Servers Table */}
      {activeSection === 'servers' && (
        <div className="bg-background border border-border rounded-2xl p-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Servers ({filteredServers.length})</h3>
          {filteredServers.length === 0 ? (
            <p className="text-xs text-muted-foreground/50 p-4 text-center">{isConfigured ? 'No servers found. Click the Servers card above to sync.' : 'Configure Pterodactyl to sync servers.'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border/50 text-muted-foreground/70 text-[10px] uppercase font-bold tracking-wider"><th className="text-left p-2">Name</th><th className="text-left p-2">Node</th><th className="text-left p-2">User</th><th className="text-right p-2">Resources</th><th className="text-left p-2">Status</th><th className="text-right p-2">Actions</th></tr></thead>
                <tbody className="divide-y divide-border/40">
                  {filteredServers.map((s: any, i: number) => {
                    const attrs = s.attributes || s;
                    const name = s.name || attrs.name;
                    const nodeName = s.node_name || attrs.relationships?.node?.attributes?.name || '-';
                    const userName = s.user_name || attrs.relationships?.user?.attributes?.username || '-';
                    const mem = s.memory || attrs.limits?.memory || 0;
                    const disk = s.disk || attrs.limits?.disk || 0;
                    const cpu = s.cpu || attrs.limits?.cpu || 0;
                    const suspended = s.suspended || attrs.suspended;
                    const sId = s.id || attrs.id;
                    return (
                      <tr key={i} className="hover:bg-primary/5">
                        <td className="p-2 text-white font-medium">{name}</td>
                        <td className="p-2 text-muted-foreground">{nodeName}</td>
                        <td className="p-2 text-muted-foreground">{userName}</td>
                        <td className="p-2 text-right font-mono text-[10px] text-muted-foreground">{mem}MB / {disk}MB / {cpu}%</td>
                        <td className="p-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${suspended ? 'bg-red-950/30 text-red-400' : 'bg-emerald-950/30 text-emerald-400'}`}>{suspended ? 'Suspended' : 'Active'}</span></td>
                        <td className="p-2 text-right">
                          <button onClick={() => toggleServer(sId, name, suspended)} className="p-1.5 bg-muted border border-border hover:border-blue-800/30 rounded text-muted-foreground hover:text-blue-400 transition cursor-pointer">
                            {suspended ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Nodes Table */}
      {activeSection === 'nodes' && (
        <div className="bg-background border border-border rounded-2xl p-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Nodes ({nodes.length})</h3>
          {nodes.length === 0 ? (
            <p className="text-xs text-muted-foreground/50 p-4 text-center">{isConfigured ? 'No nodes found. Click the Nodes card above to sync.' : 'Configure Pterodactyl to sync nodes.'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border/50 text-muted-foreground/70 text-[10px] uppercase font-bold tracking-wider"><th className="text-left p-2">Name</th><th className="text-left p-2">FQDN</th><th className="text-left p-2">Location</th><th className="text-right p-2">Memory</th><th className="text-right p-2">Disk</th><th className="text-right p-2">CPU</th></tr></thead>
                <tbody className="divide-y divide-border/40">
                  {nodes.map((n: any, i: number) => {
                    const attrs = n.attributes || n;
                    return (
                      <tr key={i} className="hover:bg-primary/5">
                        <td className="p-2 text-white font-medium">{n.name || attrs.name}</td>
                        <td className="p-2 text-muted-foreground font-mono text-[10px]">{n.fqdn || attrs.fqdn}</td>
                        <td className="p-2 text-muted-foreground">{n.location_id || attrs.location_id || '-'}</td>
                        <td className="p-2 text-right text-white font-mono">{(n.memory || attrs.memory || 0) / 1024}GB</td>
                        <td className="p-2 text-right text-white font-mono">{(n.disk || attrs.disk || 0) / 1024}GB</td>
                        <td className="p-2 text-right text-white font-mono">{n.cpu || attrs.cpu || 0}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Users Table */}
      {activeSection === 'users' && (
        <div className="bg-background border border-border rounded-2xl p-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Users ({users.length})</h3>
          {users.length === 0 ? (
            <p className="text-xs text-muted-foreground/50 p-4 text-center">{isConfigured ? 'No users found. Click the Users card above to sync.' : 'Configure Pterodactyl to sync users.'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border/50 text-muted-foreground/70 text-[10px] uppercase font-bold tracking-wider"><th className="text-left p-2">Username</th><th className="text-left p-2">Email</th><th className="text-left p-2">Admin</th><th className="text-left p-2">Created</th></tr></thead>
                <tbody className="divide-y divide-border/40">
                  {users.map((u: any, i: number) => {
                    const attrs = u.attributes || u;
                    return (
                      <tr key={i} className="hover:bg-primary/5">
                        <td className="p-2 text-white font-medium">{u.username || attrs.username}</td>
                        <td className="p-2 text-muted-foreground">{u.email || attrs.email}</td>
                        <td className="p-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${u.root_admin || attrs.root_admin ? 'bg-blue-950/30 text-blue-400' : 'bg-muted/30 text-muted-foreground/70'}`}>{u.root_admin || attrs.root_admin ? 'Yes' : 'No'}</span></td>
                        <td className="p-2 text-muted-foreground/70 font-mono">{new Date(u.created_at || attrs.created_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmModal open={confirmState.open} title={confirmState.title} message={confirmState.message} variant={confirmState.variant} confirmLabel="Confirm" cancelLabel="Cancel" onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState(p => ({ ...p, open: false }))} />
    </div>
  );
}
