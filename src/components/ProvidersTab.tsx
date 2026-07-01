'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Plus,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  Cpu,
  Coins,
  Settings
} from 'lucide-react';
import { ProviderRecord } from '@/lib/db';
import { useToast } from '@/components/Toaster';
import ConfirmModal from '@/components/ConfirmModal';

interface ProvidersTabProps {
  userRole: string;
  onLogAction: (action: string, details: string) => void;
  currency?: string;
}

export default function ProvidersTab({ userRole, onLogAction, currency = 'USD' }: ProvidersTabProps) {
  const sym = currency === 'INR' ? '\u20B9' : '$';
  const { toast } = useToast();
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; message: string; variant?: 'danger' | 'warning' | 'default'; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Reveal States
  const [revealed, setRevealed] = useState<{ [key: string]: boolean }>({});

  // Create Provider State
  const [isCreating, setIsCreating] = useState(false);
  const [newProv, setNewProv] = useState({
    name: 'Hetzner',
    loginUrl: 'https://robot.hetzner.com',
    username: '',
    password: '',
    monthlyCost: 0,
    renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: ''
  });

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/providers');
      if (res.ok) {
        setProviders(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProv)
      });
      if (res.ok) {
        setIsCreating(false);
        setNewProv({
          name: 'Hetzner',
          loginUrl: 'https://robot.hetzner.com',
          username: '',
          password: '',
          monthlyCost: 0,
          renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: ''
        });
        fetchProviders();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProvider = async (id: string, name: string) => {
    if (!['Founder', 'Admin'].includes(userRole)) {
      toast('error', 'Forbidden. Access denied.');
      return;
    }
    setConfirmState({
      open: true,
      title: 'Delete Provider',
      message: `Are you sure you want to remove provider ${name}?`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, open: false }));
        try {
          const res = await fetch(`/api/admin/providers/${id}`, { method: 'DELETE' });
          if (res.ok) {
            fetchProviders();
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
    return;
  };

  const toggleReveal = (id: string, name: string) => {
    const isRevealed = !revealed[id];
    setRevealed({ ...revealed, [id]: isRevealed });
    if (isRevealed) {
      onLogAction('Credentials Reveal', `Revealed account login credentials for Provider: ${name}.`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Provider Records</h1>
          <p className="text-xs text-muted-foreground/70">Track and manage credentials for wholesale server provider portals.</p>
        </div>
        {['Founder', 'Admin'].includes(userRole) && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg text-xs font-semibold text-white transition shadow shadow-blue-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>Add Provider</span>
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 text-center text-xs text-muted-foreground/70 p-10 animate-pulse">Syncing provider accounts...</div>
        ) : providers.length === 0 ? (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-center">
            <Globe className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <h3 className="text-sm font-bold text-white mb-1">No Providers Yet</h3>
            <p className="text-xs text-muted-foreground/70 max-w-md mb-6">Add your first hosting provider (Hetzner, OVH, etc.) to track credentials and billing.</p>
            {['Founder', 'Admin'].includes(userRole) && (
              <button onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg text-xs font-bold text-white transition shadow cursor-pointer">
                <Plus className="w-4 h-4" /> Add Your First Provider
              </button>
            )}
          </div>
        ) : (
          providers.map((prov) => (
            <div
              key={prov.id}
              className="bg-background border border-border hover:border-blue-500/30 rounded-2xl p-5 space-y-4 shadow-xl relative group transition duration-300"
            >
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-950/40 border border-blue-800/30 flex items-center justify-center text-blue-400">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">{prov.name}</h3>
                    <a
                      href={prov.loginUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] text-blue-400 font-mono mt-0.5 hover:underline flex items-center gap-0.5"
                    >
                      <span>Console Link</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
                {['Founder', 'Admin'].includes(userRole) && (
                  <button
                    onClick={() => handleDeleteProvider(prov.id, prov.name)}
                    className="p-1.5 bg-muted border border-border hover:border-red-900/35 text-muted-foreground/70 hover:text-red-400 rounded transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Credentials */}
              <div className="p-3 bg-[#110e20] border border-border/40 rounded-xl space-y-2 text-xs font-mono">
                <div className="flex justify-between border-b border-border/30 pb-1.5">
                  <span className="text-[9px] uppercase text-muted-foreground/70">Username:</span>
                  <span className="text-zinc-300 font-semibold">{prov.username}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] uppercase text-muted-foreground/70">Password:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-zinc-300 font-semibold">
                      {revealed[prov.id] ? prov.passwordHash : '••••••••'}
                    </span>
                    <button
                      onClick={() => toggleReveal(prov.id, prov.name)}
                      className="p-1 text-muted-foreground/70 hover:text-blue-400 rounded cursor-pointer"
                    >
                      {revealed[prov.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sub billing stats */}
              <div className="bg-[#110e20]/20 p-3 rounded-lg border border-border/20 font-mono text-[9px] text-muted-foreground space-y-1.5">
                <div className="flex justify-between">
                  <span>Monthly Cost:</span>
                  <span className="text-white font-bold">{sym}{prov.monthlyCost.toFixed(2)}/mo</span>
                </div>
                <div className="flex justify-between">
                  <span>Renewal Date:</span>
                  <span className="text-blue-400">{new Date(prov.renewalDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Billing Cycle:</span>
                  <span className="text-zinc-300 font-bold uppercase">Monthly</span>
                </div>
              </div>

              {/* Notes */}
              {prov.notes && (
                <div className="text-[10px] text-muted-foreground italic bg-background/60 p-2.5 rounded border border-border/30">
                  Notes: {prov.notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Provider Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-[#03000a]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="p-5 border-b border-border bg-zinc-950/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Log Provider Console</h3>
              <button onClick={() => setIsCreating(false)} className="text-muted-foreground/70 hover:text-zinc-300 text-xs font-bold uppercase">
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateProvider} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Provider Name</label>
                <select
                  value={newProv.name}
                  onChange={(e) => {
                    const urls: { [key: string]: string } = {
                      Hetzner: 'https://robot.hetzner.com',
                      OVH: 'https://ca.ovh.com/manager',
                      Contabo: 'https://my.contabo.com',
                      Netcup: 'https://www.customercontrol.de',
                      HostHatch: 'https://manage.hosthatch.com'
                    };
                    setNewProv({
                      ...newProv,
                      name: e.target.value,
                      loginUrl: urls[e.target.value] || 'https://'
                    });
                  }}
                  className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300"
                >
                  <option value="Hetzner">Hetzner</option>
                  <option value="OVH">OVH</option>
                  <option value="Contabo">Contabo</option>
                  <option value="Netcup">Netcup</option>
                  <option value="HostHatch">HostHatch</option>
                  <option value="ReliableSite">ReliableSite</option>
                  <option value="ColoCrossing">ColoCrossing</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Login Console URL</label>
                <input
                  type="url"
                  required
                  value={newProv.loginUrl}
                  onChange={(e) => setNewProv({ ...newProv, loginUrl: e.target.value })}
                  className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Console Username</label>
                  <input
                    type="text"
                    required
                    value={newProv.username}
                    onChange={(e) => setNewProv({ ...newProv, username: e.target.value })}
                    className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200"
                    placeholder="Enter login user"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Console Password</label>
                  <input
                    type="text"
                    required
                    value={newProv.password}
                    onChange={(e) => setNewProv({ ...newProv, password: e.target.value })}
                    className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200"
                    placeholder="Enter login pass"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Monthly Cost ({sym})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProv.monthlyCost}
                    onChange={(e) => setNewProv({ ...newProv, monthlyCost: Number(e.target.value) })}
                    className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Renewal Date</label>
                  <input
                    type="date"
                    required
                    value={newProv.renewalDate}
                    onChange={(e) => setNewProv({ ...newProv, renewalDate: e.target.value })}
                    className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Notes</label>
                <textarea
                  value={newProv.notes}
                  onChange={(e) => setNewProv({ ...newProv, notes: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200 resize-none"
                  placeholder="Record provider agreements..."
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-lg font-semibold tracking-wider uppercase transition shadow"
                >
                  Save Provider Record
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