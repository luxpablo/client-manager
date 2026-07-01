'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  KeyRound,
  Eye,
  EyeOff,
  Server,
  Cpu,
  HardDrive,
  Calendar,
  AlertTriangle,
  Globe,
  Settings,
  Layers
} from 'lucide-react';
import { Customer, Service, Server as ServerType } from '@/lib/db';
import { useToast } from '@/components/Toaster';

interface ServicesTabProps {
  userRole: string;
  onLogAction: (action: string, details: string) => void;
  currency?: string;
}

export default function ServicesTab({ userRole, onLogAction, currency = 'USD' }: ServicesTabProps) {
  const { toast } = useToast();
  const sym = currency === 'INR' ? '\u20B9' : '$';
  const [services, setServices] = useState<(Service & { customer?: Customer })[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [servers, setServers] = useState<ServerType[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Password Reveal States
  const [revealedPasswords, setRevealedPasswords] = useState<{ [key: string]: boolean }>({});
  
  // Create Service State
  const [isCreating, setIsCreating] = useState(false);
  const [newSrv, setNewSrv] = useState({
    customerId: '',
    type: 'VPS',
    planName: '',
    cpu: '',
    ram: '',
    storage: '',
    bandwidth: 'Premium Unmetered',
    location: 'Helsinki, Finland',
    ipv4: '',
    ipv6: '',
    username: 'root',
    password: '',
    panelUrl: '',
    panelUsername: '',
    panelPassword: '',
    provider: 'Hetzner',
    nodeName: '',
    hostMachine: '',
    purchaseCost: '5.00',
    sellingPrice: '10.00',
    billingCycle: 'Monthly',
    nextRenewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    autoRenewal: true,
    internalNotes: '',
    serverId: ''
  });
  const [createError, setCreateError] = useState('');

  // Service Edit/Details State
  const [selectedSrv, setSelectedSrv] = useState<Service | null>(null);
  const [internalNoteDraft, setInternalNoteDraft] = useState('');

  const fetchServices = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (typeFilter !== 'all') q.set('type', typeFilter);
      if (statusFilter !== 'all') q.set('status', statusFilter);

      const res = await fetch(`/api/admin/services?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setServices(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const cRes = await fetch('/api/admin/customers');
      if (cRes.ok) setCustomers(await cRes.json());

      const sRes = await fetch('/api/admin/servers');
      if (sRes.ok) setServers(await sRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchServices();
    fetchMeta();
  }, [search, typeFilter, statusFilter]);

  // Calculate countdown days
  const getCountdown = (expiryDateStr: string) => {
    const expiry = new Date(expiryDateStr);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get countdown color
  const getCountdownBadge = (expiryDateStr: string, status: string) => {
    if (status === 'Suspended' || status === 'Terminated') {
      return (
        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-zinc-900 text-muted-foreground border border-zinc-700/50">
          Inactive
        </span>
      );
    }

    const days = getCountdown(expiryDateStr);

    if (days <= 0) {
      return (
        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-red-950/40 text-red-400 border border-red-800/30">
          Expired ({Math.abs(days)}d Overdue)
        </span>
      );
    } else if (days < 15) {
      return (
        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-950/40 text-amber-400 border border-amber-800/30">
          {days} Days Left
        </span>
      );
    } else {
      return (
        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950/40 text-emerald-400 border border-emerald-800/30">
          {days} Days Left
        </span>
      );
    }
  };

  // Toggle revealed password (logs audit activity on reveal)
  const togglePasswordReveal = (id: string, srvName: string, passType: string) => {
    const isRevealed = !revealedPasswords[id];
    setRevealedPasswords({ ...revealedPasswords, [id]: isRevealed });

    if (isRevealed) {
      onLogAction('Credentials Reveal', `Revealed root password of service ${id} (${srvName}) for staff auditing purposes.`);
    }
  };

  // Submit service provisioning
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!newSrv.customerId) {
      setCreateError('Please select a customer.');
      return;
    }

    try {
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSrv)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create service');
      }
      setIsCreating(false);
      fetchServices();
    } catch (err: any) {
      setCreateError(err.message);
    }
  };

  // Save Service Notes
  // Service lifecycle actions
  const handleServiceAction = async (action: string) => {
    if (!selectedSrv) return;
    try {
      const res = await fetch(`/api/admin/services/${selectedSrv.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        toast('success', `Service ${action}ed successfully.`);
        fetchServices();
        setSelectedSrv(null);
      } else {
        const data = await res.json();
        toast('error', data.error || `Failed to ${action} service.`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedSrv) return;
    try {
      const res = await fetch(`/api/admin/services/${selectedSrv.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ internalNotes: internalNoteDraft })
      });
      if (res.ok) {
        toast('success', 'Service notes saved successfully.');
        fetchServices();
        setSelectedSrv(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Active Services List</h1>
          <p className="text-xs text-muted-foreground/70">Overview of all VPS, Game Servers, and Dedicated node deployments.</p>
        </div>
        {!['Moderator', 'Support'].includes(userRole) && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg text-xs font-semibold text-white transition shadow shadow-blue-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>Deploy Service</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-background/75 border border-border/50 rounded-xl">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/70" />
          <input
            type="text"
            placeholder="Search by ID, IP, client name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:border-blue-500/60 transition"
          />
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-300"
          >
            <option value="all">All Service Types</option>
            <option value="VPS">VPS</option>
            <option value="Dedicated Server">Dedicated Servers</option>
            <option value="Minecraft Hosting">Minecraft Servers</option>
            <option value="FiveM Hosting">FiveM Servers</option>
            <option value="Bot Hosting">Bot Containers</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-300"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
            <option value="Expired">Expired</option>
          </select>
        </div>

        <div className="flex items-center justify-end text-[10px] text-muted-foreground/70 font-mono">
          Deployments: {services.length} instances
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-background border border-border rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-10 text-center text-xs text-muted-foreground/70 animate-pulse">Scanning server nodes...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                  <th className="p-4">Service ID</th>
                  <th className="p-4">Client</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Specs Summary</th>
                  <th className="p-4">Primary IP</th>
                  <th className="p-4">Billing Cycle</th>
                  <th className="p-4 text-right">{currency === 'INR' ? 'INR' : 'USD'}</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Term Countdown</th>
                  <th className="p-4">Credentials</th>
                  <th className="p-4 text-center">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {services.map((s) => (
                  <tr key={s.id} className="hover:bg-primary/5 transition">
                    <td className="p-4 font-mono text-muted-foreground font-semibold">{s.id}</td>
                    <td className="p-4">
                      <div className="font-bold text-white">{s.customer?.name}</div>
                      <div className="text-[10px] text-muted-foreground/70 font-mono mt-0.5">{s.customer?.email}</div>
                    </td>
                    <td className="p-4 font-semibold text-blue-400">{s.type}</td>
                    <td className="p-4">
                      <div className="text-zinc-200">{s.planName}</div>
                      <div className="text-[9px] text-muted-foreground/70 mt-1 font-mono">
                        {s.cpu} CPU • {s.ram} RAM • {s.storage}
                      </div>
                    </td>
                    <td className="p-4 font-mono text-zinc-300">
                      <div>{s.ipv4 || '—'}</div>
                      <div className="text-[9px] text-muted-foreground/70 mt-0.5">{s.location}</div>
                    </td>
                    <td className="p-4 font-mono text-muted-foreground">{s.billingCycle}</td>
                    <td className="p-4 text-right font-mono text-white font-bold">{sym}{s.sellingPrice.toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        s.status === 'Active'
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30'
                          : s.status === 'Suspended'
                          ? 'bg-amber-950/40 text-amber-400 border border-amber-800/30'
                          : 'bg-red-950/40 text-red-400 border border-red-800/30'
                      }`}>{s.status}</span>
                    </td>
                    <td className="p-4 text-center">{getCountdownBadge(s.expiryDate, s.status)}</td>
                    <td className="p-4 font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase">{s.username}:</span>
                        <span className="text-zinc-100 font-semibold">
                          {revealedPasswords[s.id] ? s.passwordHash : '••••••••'}
                        </span>
                        <button
                          onClick={() => togglePasswordReveal(s.id, s.planName, 'root')}
                          className="p-1 rounded text-muted-foreground/70 hover:text-blue-400 hover:bg-muted transition shrink-0 cursor-pointer"
                        >
                          {revealedPasswords[s.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedSrv(s);
                          setInternalNoteDraft(s.internalNotes || '');
                        }}
                        className="p-1.5 bg-muted border border-border hover:border-blue-800/40 rounded-lg text-muted-foreground hover:text-blue-400 transition"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {services.length === 0 && (
                  <tr>
                    <td colSpan={11} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Layers className="w-10 h-10 text-blue-400/60" />
                        <h3 className="text-sm font-bold text-white">No Services Yet</h3>
                        <p className="text-xs text-muted-foreground/70 max-w-[280px]">
                          Deploy hosting services for your clients to start generating revenue.
                        </p>
                        {!['Moderator', 'Support'].includes(userRole) && (
                          <button onClick={() => setIsCreating(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg text-xs font-semibold text-white transition shadow shadow-blue-500/10 mt-1">
                            <Plus className="w-4 h-4" /> Provision Your First Service
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provisioning deploying Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-[#03000a]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
            <div className="p-5 border-b border-border bg-zinc-950/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Provision Hosting Service</h3>
              <button onClick={() => setIsCreating(false)} className="text-muted-foreground/70 hover:text-zinc-300 text-xs font-bold uppercase">
                Cancel
              </button>
            </div>

            {createError && (
              <div className="m-5 p-3 bg-red-950/30 border border-red-500/30 rounded-lg text-xs text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateService} className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
              {/* Customer Selector */}
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Assign to Customer Account</label>
                <select
                  required
                  value={newSrv.customerId}
                  onChange={(e) => setNewSrv({ ...newSrv, customerId: e.target.value })}
                  className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300"
                >
                  <option value="">Select a customer profile</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.companyName || 'Individual'}) - {c.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Type and Specs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Service Type</label>
                  <select
                    value={newSrv.type}
                    onChange={(e) => setNewSrv({ ...newSrv, type: e.target.value as any })}
                    className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300"
                  >
                    <option value="VPS">Cloud VPS</option>
                    <option value="Dedicated Server">Dedicated Server</option>
                    <option value="Minecraft Hosting">Minecraft Hosting</option>
                    <option value="FiveM Hosting">FiveM Hosting</option>
                    <option value="Bot Hosting">Bot Container</option>
                    <option value="Database Hosting">Database Instance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Plan Name</label>
                  <input
                    type="text"
                    required
                    value={newSrv.planName}
                    onChange={(e) => setNewSrv({ ...newSrv, planName: e.target.value })}
                    className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200"
                    placeholder="e.g. Extreme 32GB RAM / Ryzen 9"
                  />
                </div>
              </div>

              {/* Hardware specifications */}
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="block text-[9px] uppercase text-muted-foreground/70 mb-1 font-semibold">CPU Allocation</label>
                  <input
                    type="text"
                    required
                    value={newSrv.cpu}
                    onChange={(e) => setNewSrv({ ...newSrv, cpu: e.target.value })}
                    className="w-full p-2 bg-muted border border-border rounded-lg text-zinc-200"
                    placeholder="e.g. 4 Cores"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-muted-foreground/70 mb-1 font-semibold">RAM Limit</label>
                  <input
                    type="text"
                    required
                    value={newSrv.ram}
                    onChange={(e) => setNewSrv({ ...newSrv, ram: e.target.value })}
                    className="w-full p-2 bg-muted border border-border rounded-lg text-zinc-200"
                    placeholder="e.g. 16 GB"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-muted-foreground/70 mb-1 font-semibold">Storage Space</label>
                  <input
                    type="text"
                    required
                    value={newSrv.storage}
                    onChange={(e) => setNewSrv({ ...newSrv, storage: e.target.value })}
                    className="w-full p-2 bg-muted border border-border rounded-lg text-zinc-200"
                    placeholder="e.g. 100 GB NVMe"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-muted-foreground/70 mb-1 font-semibold">Bandwidth Cap</label>
                  <input
                    type="text"
                    required
                    value={newSrv.bandwidth}
                    onChange={(e) => setNewSrv({ ...newSrv, bandwidth: e.target.value })}
                    className="w-full p-2 bg-muted border border-border rounded-lg text-zinc-200"
                  />
                </div>
              </div>

              {/* Hardware Assignment Node */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Node Assignment</label>
                  <select
                    value={newSrv.serverId}
                    onChange={(e) => {
                      const selectedNode = servers.find((sv) => sv.id === e.target.value);
                      setNewSrv({
                        ...newSrv,
                        serverId: e.target.value,
                        hostMachine: selectedNode ? selectedNode.name : '',
                        nodeName: selectedNode ? selectedNode.name : ''
                      });
                    }}
                    className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300"
                  >
                    <option value="">Do not assign node (Virtual/Cloud)</option>
                    {servers.map((srv) => (
                      <option key={srv.id} value={srv.id}>
                        {srv.name} ({srv.provider} - {srv.location})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Location / DC</label>
                  <input
                    type="text"
                    required
                    value={newSrv.location}
                    onChange={(e) => setNewSrv({ ...newSrv, location: e.target.value })}
                    className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200"
                  />
                </div>
              </div>

              {/* IPs & Credentials */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] uppercase text-muted-foreground/70 mb-1 font-semibold">IPv4 Address</label>
                  <input
                    type="text"
                    value={newSrv.ipv4}
                    onChange={(e) => setNewSrv({ ...newSrv, ipv4: e.target.value })}
                    className="w-full p-2 bg-muted border border-border rounded-lg text-zinc-200"
                    placeholder="127.0.0.1"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-muted-foreground/70 mb-1 font-semibold">Username</label>
                  <input
                    type="text"
                    value={newSrv.username}
                    onChange={(e) => setNewSrv({ ...newSrv, username: e.target.value })}
                    className="w-full p-2 bg-muted border border-border rounded-lg text-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-muted-foreground/70 mb-1 font-semibold">Root Password</label>
                  <input
                    type="text"
                    required
                    value={newSrv.password}
                    onChange={(e) => setNewSrv({ ...newSrv, password: e.target.value })}
                    className="w-full p-2 bg-muted border border-border rounded-lg text-zinc-200"
                    placeholder="Enter root password"
                  />
                </div>
              </div>

              {/* Purchase vs Selling Pricing */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] uppercase text-muted-foreground/70 mb-1 font-semibold">Purchase Cost ({sym})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newSrv.purchaseCost}
                    onChange={(e) => setNewSrv({ ...newSrv, purchaseCost: e.target.value })}
                    className="w-full p-2 bg-muted border border-border rounded-lg text-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-muted-foreground/70 mb-1 font-semibold">Selling Price ({sym})</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newSrv.sellingPrice}
                    onChange={(e) => setNewSrv({ ...newSrv, sellingPrice: e.target.value })}
                    className="w-full p-2 bg-muted border border-border rounded-lg text-zinc-200"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-muted-foreground/70 mb-1 font-semibold">Billing Cycle</label>
                  <select
                    value={newSrv.billingCycle}
                    onChange={(e) => setNewSrv({ ...newSrv, billingCycle: e.target.value })}
                    className="w-full p-2 bg-muted border border-border rounded-lg text-zinc-300"
                  >
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Semi-Annual">Semi-Annual</option>
                    <option value="Annual">Annual</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-lg font-semibold tracking-wider uppercase transition shadow"
                >
                  Deploy Container / Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Internal Notes edit modal */}
      {selectedSrv && (
        <div className="fixed inset-0 bg-[#03000a]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="p-5 border-b border-border bg-zinc-950/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Service Configurations</h3>
              <button onClick={() => setSelectedSrv(null)} className="text-muted-foreground/70 hover:text-zinc-300 text-xs font-bold uppercase">
                Close
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 bg-[#110e20] border border-border/40 rounded-xl space-y-1.5 font-mono">
                <p className="text-[10px] text-muted-foreground/70 font-bold uppercase">Specs Details</p>
                <p className="text-white font-bold">{selectedSrv.planName} <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ml-1 ${
                  selectedSrv.status === 'Active'
                    ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30'
                    : selectedSrv.status === 'Suspended'
                    ? 'bg-amber-950/40 text-amber-400 border border-amber-800/30'
                    : 'bg-red-950/40 text-red-400 border border-red-800/30'
                }`}>{selectedSrv.status}</span></p>
                <p className="text-muted-foreground">RAM: {selectedSrv.ram} • CPU: {selectedSrv.cpu} • Cost: {sym}{selectedSrv.purchaseCost}/mo</p>
                <p className="text-blue-400">Profit: {sym}{(selectedSrv.sellingPrice - selectedSrv.purchaseCost).toFixed(2)}/mo</p>
              </div>

              {!['Moderator', 'Support'].includes(userRole) && (
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Lifecycle Actions</label>
                <div className="flex gap-2">
                  {selectedSrv.status !== 'Active' && selectedSrv.status !== 'Terminated' && (
                    <button onClick={() => handleServiceAction('renew')} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition">
                      Renew
                    </button>
                  )}
                  {selectedSrv.status === 'Active' && (
                    <button onClick={() => handleServiceAction('suspend')} className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition">
                      Suspend
                    </button>
                  )}
                  {selectedSrv.status !== 'Terminated' && (
                    <button onClick={() => handleServiceAction('terminate')} className="px-3 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition">
                      Terminate
                    </button>
                  )}
                </div>
              </div>
              )}

              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Internal Operations Notes</label>
                <textarea
                  value={internalNoteDraft}
                  onChange={(e) => setInternalNoteDraft(e.target.value)}
                  rows={4}
                  className="w-full p-3 bg-[#110e20] border border-border rounded-lg text-zinc-200 resize-none"
                  placeholder="Record credentials changes, node transfer records..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSelectedSrv(null)}
                  className="px-4 py-2 bg-muted border border-border text-muted-foreground hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNotes}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
