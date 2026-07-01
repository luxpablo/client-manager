'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  FileDown,
  User,
  Building,
  Mail,
  Phone,
  MessageSquare,
  Globe,
  Notebook,
  Trash2,
  Calendar,
  AlertCircle,
  FileText,
  Upload,
  X
} from 'lucide-react';
import { Customer, Service, Invoice, Ticket } from '@/lib/db';
import { useToast } from '@/components/Toaster';
import ConfirmModal from '@/components/ConfirmModal';

interface CustomersTabProps {
  userRole: string;
  onLogAction: (action: string, details: string) => void;
  currency?: string;
}

export default function CustomersTab({ userRole, onLogAction, currency = 'USD' }: CustomersTabProps) {
  const { toast } = useToast();
  const sym = currency === 'INR' ? '\u20B9' : '$';
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; message: string; variant?: 'danger' | 'warning' | 'default'; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Detail Modal State
  const [selectedCustId, setSelectedCustId] = useState<string | null>(null);
  const [customerTimeline, setCustomerTimeline] = useState<any[]>([]);
  const [selectedCust, setSelectedCust] = useState<(Customer & { services: Service[]; invoices: Invoice[]; tickets: Ticket[] }) | null>(null);
  const [detailTab, setDetailTab] = useState<'profile' | 'services' | 'billing' | 'tickets' | 'logs' | 'timeline'>('profile');
  const [staffNoteDraft, setStaffNoteDraft] = useState('');
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketForm, setTicketForm] = useState({ title: '', priority: 'Medium', message: '' });
  const [creatingTicket, setCreatingTicket] = useState(false);

  // Create Customer State
  const [isCreating, setIsCreating] = useState(false);
  const [newCust, setNewCust] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    discord: '',
    country: 'United States',
    notes: '',
    staffNotes: ''
  });
  const [createError, setCreateError] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (statusFilter !== 'all') q.set('status', statusFilter);
      if (countryFilter !== 'all') q.set('country', countryFilter);

      const res = await fetch(`/api/admin/customers?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, statusFilter, countryFilter]);

  // Load single customer details
  const loadCustDetails = async (id: string) => {
    try {
      const [res, logsRes] = await Promise.all([
        fetch(`/api/admin/customers/${id}`),
        fetch('/api/admin/logs')
      ]);
      let custName = '';
      if (res.ok) {
        const data = await res.json();
        custName = data.name || '';
        setSelectedCust(data);
        setStaffNoteDraft(data.staffNotes || '');
        setSelectedCustId(id);
      }
      if (logsRes.ok) {
        const logs = await logsRes.json();
        setCustomerTimeline(logs.filter((l: any) =>
          l.details?.toLowerCase().includes(custName.toLowerCase()) ||
          l.details?.toLowerCase().includes(id.toLowerCase())
        ));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Update staff notes or status
  const handleUpdateNotes = async () => {
    if (!selectedCustId || !selectedCust) return;
    try {
      const res = await fetch(`/api/admin/customers/${selectedCustId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffNotes: staffNoteDraft })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedCust((prev) => prev ? { ...prev, staffNotes: updated.staffNotes } : null);
        toast('success', 'Staff notes updated successfully.');
        fetchCustomers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = (newStatus: 'Active' | 'Suspended') => {
    if (!selectedCustId || !selectedCust) return;
    const msg = newStatus === 'Suspended' 
      ? 'Suspended customers will automatically have all their active container services suspended too. Continue?'
      : 'Activate this customer profile?';
    setConfirmState({
      open: true,
      title: newStatus === 'Suspended' ? 'Suspend Customer' : 'Activate Customer',
      message: msg,
      variant: newStatus === 'Suspended' ? 'warning' : 'default',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, open: false }));
        try {
          const res = await fetch(`/api/admin/customers/${selectedCustId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
          });
          if (res.ok) {
            const updated = await res.json();
            setSelectedCust((prev) => prev ? { ...prev, status: updated.status } : null);
            loadCustDetails(selectedCustId);
            fetchCustomers();
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  // Delete Customer
  const handleDeleteCustomer = (id: string) => {
    if (!['Founder', 'Admin'].includes(userRole)) {
      toast('error', 'Deleting records is restricted to Admins & Founders.');
      return;
    }
    setConfirmState({
      open: true,
      title: 'Delete Customer',
      message: 'WARNING: Deleting a customer will cascade delete all their service records, invoices, and support history. This cannot be undone. Proceed?',
      variant: 'danger',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, open: false }));
        try {
          const res = await fetch(`/api/admin/customers/${id}`, { method: 'DELETE' });
          if (res.ok) {
            setSelectedCustId(null);
            setSelectedCust(null);
            fetchCustomers();
            toast('success', 'Customer deleted permanently.');
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  // Create Customer Submit
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCust)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create customer');
      }
      setIsCreating(false);
      setNewCust({
        name: '',
        companyName: '',
        email: '',
        phone: '',
        discord: '',
        country: 'United States',
        notes: '',
        staffNotes: ''
      });
      fetchCustomers();
    } catch (err: any) {
      setCreateError(err.message);
    }
  };

  // Export Customer List as CSV
  const handleExportCSV = () => {
    if (customers.length === 0) return;
    const headers = 'ID,Name,Company,Email,Phone,Discord,Country,Status,JoinedDate,TotalSpending\n';
    const rows = customers
      .map(
        (c) =>
            `"${c.id}","${c.name}","${c.companyName || ''}","${c.email}","${c.phone || ''}","${c.discord || ''}","${c.country}","${c.status}","${new Date(
            c.joinDate
          ).toLocaleDateString()}","${sym}${c.totalSpending.toFixed(2)}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ZCMS_Customers_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Customer Database</h1>
          <p className="text-xs text-muted-foreground/70">Manage client directory profiles, billing history, and staff notations.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-blue-950/20 border border-border hover:border-blue-800/30 rounded-lg text-xs font-semibold text-zinc-300 transition"
          >
            <FileDown className="w-4 h-4 text-blue-400" />
            <span>Export CSV</span>
          </button>
          <label className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-blue-950/20 border border-border hover:border-blue-800/30 rounded-lg text-xs font-semibold text-zinc-300 transition cursor-pointer">
            <Upload className="w-4 h-4 text-blue-400" />
            <span>Import CSV</span>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                const lines = text.split('\n').filter(Boolean);
                if (lines.length < 2) { toast('error', 'CSV must have a header row and at least one data row.'); e.target.value = ''; return; }
                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                let imported = 0;
                for (let i = 1; i < lines.length; i++) {
                  const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                  const obj: any = {};
                  headers.forEach((h, idx) => { obj[h] = vals[idx] || ''; });
                  if (!obj.name || !obj.email) continue;
                  try {
                    const res = await fetch('/api/admin/customers', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: obj.name,
                        companyName: obj.company || obj.companyname || '',
                        email: obj.email,
                        phone: obj.phone || '',
                        discord: obj.discord || '',
                        country: obj.country || 'United States',
                        notes: obj.notes || '',
                        staffNotes: obj.staffnotes || ''
                      })
                    });
                    if (res.ok) imported++;
                  } catch {}
                }
                toast('success', `Imported ${imported} customers from CSV.`);
                fetchCustomers();
              }}
            />
          </label>
          {!['Moderator', 'Support'].includes(userRole) && (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg text-xs font-semibold text-white transition shadow shadow-blue-500/10"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
          )}
        </div>
      </div>

      {/* Directory Filter Console */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-background/75 border border-border/50 rounded-xl">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/70" />
          <input
            type="text"
            placeholder="Search by name, email, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:border-blue-500/60 transition"
          />
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
          </select>
        </div>

        <div>
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-300"
          >
            <option value="all">All Countries</option>
            <option value="United States">United States</option>
            <option value="Germany">Germany</option>
            <option value="United Kingdom">United Kingdom</option>
            <option value="Russia">Russia</option>
            <option value="Japan">Japan</option>
          </select>
        </div>

        <div className="flex items-center justify-end text-[10px] text-muted-foreground/70 font-mono">
          Found {customers.length} Accounts
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-background border border-border rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-10 text-center text-xs text-muted-foreground/70 animate-pulse">Loading directory entries...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                  <th className="p-4">Customer ID</th>
                  <th className="p-4">Client Name</th>
                  <th className="p-4">Company Name</th>
                  <th className="p-4">Email Address</th>
                  <th className="p-4">Discord Handle</th>
                  <th className="p-4">Country</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Spending</th>
                  <th className="p-4">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => loadCustDetails(c.id)}
                    className="hover:bg-blue-950/10 cursor-pointer transition"
                  >
                    <td className="p-4 font-mono text-muted-foreground font-semibold">{c.id}</td>
                    <td className="p-4 font-bold text-white">{c.name}</td>
                    <td className="p-4 text-muted-foreground">{c.companyName || '—'}</td>
                    <td className="p-4 text-muted-foreground font-mono">{c.email}</td>
                    <td className="p-4 text-blue-400 font-mono font-medium">{c.discord || '—'}</td>
                    <td className="p-4 text-muted-foreground">{c.country}</td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          c.status === 'Active'
                            ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30'
                            : 'bg-red-950/40 text-red-400 border border-red-800/30'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono text-white font-bold">{sym}{c.totalSpending.toFixed(2)}</td>
                    <td className="p-4 text-muted-foreground/70 font-mono">{new Date(c.joinDate).toLocaleDateString()}</td>
                  </tr>
                ))}

                {customers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Globe className="w-10 h-10 text-blue-400/60" />
                        <h3 className="text-sm font-bold text-white">No Customers Yet</h3>
                        <p className="text-xs text-muted-foreground/70 max-w-[280px]">
                          Start building your client directory by adding your first customer account.
                        </p>
                        {!['Moderator', 'Support'].includes(userRole) && (
                          <button onClick={() => setIsCreating(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg text-xs font-semibold text-white transition shadow shadow-blue-500/10 mt-1">
                            <Plus className="w-4 h-4" /> Add Your First Customer
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

      {/* Customer Create Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-[#03000a]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative">
            <div className="p-5 border-b border-border bg-zinc-950/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Register New Customer</h3>
              <button onClick={() => setIsCreating(false)} className="text-muted-foreground/70 hover:text-zinc-300 text-xs uppercase font-bold">
                Close
              </button>
            </div>

            {createError && (
              <div className="m-5 p-3 bg-red-950/30 border border-red-500/30 rounded-lg text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newCust.name}
                    onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                    className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Company Name</label>
                  <input
                    type="text"
                    value={newCust.companyName}
                    onChange={(e) => setNewCust({ ...newCust, companyName: e.target.value })}
                    className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200"
                    placeholder="Enter company LLC"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newCust.email}
                    onChange={(e) => setNewCust({ ...newCust, email: e.target.value })}
                    className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Phone Number</label>
                  <input
                    type="text"
                    value={newCust.phone}
                    onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                    className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200"
                    placeholder="+1 555-0100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Discord Username</label>
                  <input
                    type="text"
                    value={newCust.discord}
                    onChange={(e) => setNewCust({ ...newCust, discord: e.target.value })}
                    className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200"
                    placeholder="username#0000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Country</label>
                  <select
                    value={newCust.country}
                    onChange={(e) => setNewCust({ ...newCust, country: e.target.value })}
                    className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300"
                  >
                    <option value="United States">United States</option>
                    <option value="Germany">Germany</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Russia">Russia</option>
                    <option value="Japan">Japan</option>
                    <option value="Canada">Canada</option>
                    <option value="Singapore">Singapore</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Public Notes</label>
                <textarea
                  value={newCust.notes}
                  onChange={(e) => setNewCust({ ...newCust, notes: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200 resize-none"
                  placeholder="Billing terms or customer details..."
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Internal Staff Notes</label>
                <textarea
                  value={newCust.staffNotes}
                  onChange={(e) => setNewCust({ ...newCust, staffNotes: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200 resize-none"
                  placeholder="Private notes (visible to staff only)..."
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-lg font-semibold tracking-wider uppercase transition shadow"
                >
                  Provision Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Detail Drawer/Modal */}
      {selectedCustId && selectedCust && (
        <div className="fixed inset-0 bg-[#03000a]/80 backdrop-blur-sm flex items-center justify-end z-50">
          <div className="bg-background border-l border-border w-full max-w-2xl h-screen flex flex-col justify-between shadow-2xl overflow-hidden animate-slide-in">
            {/* Header Info */}
            <div className="p-6 border-b border-border bg-muted/60 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-blue-400 font-semibold text-xs">{selectedCust.id}</span>
                  <span
                    className={`inline-block px-1.5 py-0.25 rounded text-[8px] font-bold uppercase tracking-wider ${
                      selectedCust.status === 'Active'
                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30'
                        : 'bg-red-950/40 text-red-400 border border-red-800/30'
                    }`}
                  >
                    {selectedCust.status}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">{selectedCust.name}</h2>
                <p className="text-xs text-muted-foreground/70">{selectedCust.companyName || 'Individual'}</p>
              </div>

              <div className="flex gap-2">
                {selectedCust.status === 'Active' ? (
                  <button
                    onClick={() => handleUpdateStatus('Suspended')}
                    className="px-2.5 py-1.5 bg-red-950/40 text-red-400 border border-red-900/30 rounded-lg text-[10px] font-bold uppercase tracking-wider transition"
                  >
                    Suspend Customer
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpdateStatus('Active')}
                    className="px-2.5 py-1.5 bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 rounded-lg text-[10px] font-bold uppercase tracking-wider transition"
                  >
                    Activate Profile
                  </button>
                )}

                <button
                  onClick={() => handleDeleteCustomer(selectedCust.id)}
                  className="p-1.5 bg-muted hover:bg-red-950/20 text-muted-foreground/70 hover:text-red-400 border border-border hover:border-red-900/30 rounded-lg transition"
                  title="Purge Profile"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setSelectedCustId(null);
                    setSelectedCust(null);
                  }}
                  className="px-2 py-1 bg-muted border border-border text-muted-foreground hover:text-white rounded-lg text-xs uppercase font-semibold"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-border bg-zinc-950/30 px-6 font-semibold text-[10px] uppercase tracking-wider">
              {(['profile', 'services', 'billing', 'tickets', 'timeline'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDetailTab(tab)}
                  className={`py-3 px-4 border-b-2 transition ${
                    detailTab === tab
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-muted-foreground/70 hover:text-zinc-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs">
              {detailTab === 'profile' && (
                <div className="space-y-6">
                  {/* Grid Contact Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-[#110e20]/40 border border-border/30 rounded-lg space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-semibold block">Email Address</span>
                      <div className="flex items-center gap-2 font-mono text-zinc-200">
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                        <span>{selectedCust.email}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-[#110e20]/40 border border-border/30 rounded-lg space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-semibold block">Discord Handle</span>
                      <div className="flex items-center gap-2 font-mono text-blue-400 font-semibold">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{selectedCust.discord || '—'}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-[#110e20]/40 border border-border/30 rounded-lg space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-semibold block">Phone Number</span>
                      <div className="flex items-center gap-2 font-mono text-zinc-200">
                        <Phone className="w-3.5 h-3.5 text-blue-400" />
                        <span>{selectedCust.phone || '—'}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-[#110e20]/40 border border-border/30 rounded-lg space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-semibold block">Location</span>
                      <div className="flex items-center gap-2 text-zinc-200">
                        <Globe className="w-3.5 h-3.5 text-blue-400" />
                        <span>{selectedCust.country}</span>
                      </div>
                    </div>
                  </div>

                  {/* Public Notes */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">Public Client Notes</span>
                    <div className="p-3.5 bg-muted/60 border border-border/40 rounded-xl text-zinc-300 leading-relaxed">
                      {selectedCust.notes || 'No public notes exist for this account.'}
                    </div>
                  </div>

                  {/* Internal Staff Notes */}
                  <div className="space-y-2 border-t border-border/50 pt-5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold flex items-center gap-1.5">
                      <Notebook className="w-3.5 h-3.5 text-blue-400" />
                      Internal Staff Notes (Private)
                    </span>
                    <textarea
                      value={staffNoteDraft}
                      onChange={(e) => setStaffNoteDraft(e.target.value)}
                      rows={3}
                      className="w-full p-3 bg-[#110e20] border border-border rounded-lg text-zinc-200 resize-none"
                      placeholder="Add private staff notes..."
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleUpdateNotes}
                        className="py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold uppercase tracking-wider transition"
                      >
                        Save Staff Memos
                      </button>
                    </div>
                  </div>

                  {/* Timeline Summary info */}
                  <div className="border-t border-border/50 pt-5 grid grid-cols-2 gap-4 text-center font-mono">
                    <div className="bg-[#110e20]/20 p-2.5 rounded-lg border border-border/20">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground/70">Member Since</p>
                      <p className="text-xs font-bold text-white mt-1">{new Date(selectedCust.joinDate).toLocaleDateString()}</p>
                    </div>
                    <div className="bg-[#110e20]/20 p-2.5 rounded-lg border border-border/20">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground/70">Gross Spent</p>
                      <p className="text-xs font-bold text-emerald-400 mt-1">{sym}{selectedCust.totalSpending.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}

              {detailTab === 'services' && (
                <div className="space-y-3">
                  {selectedCust.services.map((srv) => (
                    <div key={srv.id} className="p-3 bg-[#110e20]/50 border border-border/40 rounded-xl flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{srv.type}</span>
                          <span className="text-[10px] text-muted-foreground">• {srv.planName}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground/70 font-mono mt-1">
                          IP: {srv.ipv4 || 'No IP'} • Location: {srv.location}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-white block">{sym}{srv.sellingPrice.toFixed(2)}</span>
                        <span
                          className={`inline-block px-1.5 py-0.25 rounded text-[8px] font-bold uppercase tracking-wider mt-1 ${
                            srv.status === 'Active'
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30'
                              : srv.status === 'Suspended'
                              ? 'bg-amber-950/40 text-amber-400 border border-amber-800/30'
                              : 'bg-red-950/40 text-red-400 border border-red-800/30'
                          }`}
                        >
                          {srv.status}
                        </span>
                      </div>
                    </div>
                  ))}

                  {selectedCust.services.length === 0 && (
                    <div className="text-center text-muted-foreground/70 p-8">No services provisioned for this account.</div>
                  )}
                </div>
              )}

              {detailTab === 'billing' && (
                <div className="space-y-3">
                  {selectedCust.invoices.map((inv) => (
                    <div key={inv.id} className="p-3 bg-[#110e20]/50 border border-border/40 rounded-xl flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                        <div>
                          <div className="font-bold text-white font-mono">{inv.invoiceNumber}</div>
                          <div className="text-[10px] text-muted-foreground/70 mt-1">
                            Due: {new Date(inv.dueDate).toLocaleDateString()} • Method: {inv.paymentMethod}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                          <span className="text-xs font-mono font-bold text-white block">
                          {sym}{(inv.amount + inv.tax - inv.discount).toFixed(2)}
                        </span>
                        <span
                          className={`inline-block px-1.5 py-0.25 rounded text-[8px] font-bold uppercase tracking-wider mt-1 ${
                            inv.status === 'Paid'
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30'
                              : inv.status === 'Pending'
                              ? 'bg-amber-950/40 text-amber-400 border border-amber-800/30'
                              : 'bg-red-950/40 text-red-400 border border-red-800/30'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}

                  {selectedCust.invoices.length === 0 && (
                    <div className="text-center text-muted-foreground/70 p-8">No billing/invoice history exists.</div>
                  )}
                </div>
              )}

              {detailTab === 'tickets' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] text-muted-foreground/70 font-mono">{selectedCust.tickets.length} ticket(s)</p>
                    <button onClick={() => {
                      setTicketForm({ title: '', priority: 'Medium', message: '' });
                      setShowTicketModal(true);
                    }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg text-[9px] font-bold text-white transition shadow shadow-blue-500/10 cursor-pointer">
                      <Plus className="w-3 h-3" /> New Ticket
                    </button>
                  </div>

                  {selectedCust.tickets.map((tkt) => (
                    <div key={tkt.id} className="p-3.5 bg-[#110e20]/50 border border-border/40 rounded-xl flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{tkt.title}</span>
                          <span
                            className={`inline-block px-1.5 py-0.25 rounded text-[7px] font-bold uppercase tracking-wider ${
                              tkt.priority === 'Critical' || tkt.priority === 'High'
                                ? 'bg-red-950/40 text-red-400 border border-red-800/30'
                                : 'bg-blue-950/40 text-blue-400 border border-blue-800/30'
                            }`}
                          >
                            {tkt.priority}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                          Created: {new Date(tkt.createdAt).toLocaleDateString()} • Responses: {tkt.messages.length}
                        </p>
                      </div>
                      <div>
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                            tkt.status === 'Open'
                              ? 'bg-red-950/40 text-red-400 border border-red-800/30'
                              : tkt.status === 'Answered'
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30'
                              : 'bg-zinc-900 text-muted-foreground border border-zinc-700/30'
                          }`}
                        >
                          {tkt.status}
                        </span>
                      </div>
                    </div>
                  ))}

                  {selectedCust.tickets.length === 0 && (
                    <div className="text-center text-muted-foreground/70 p-8">No support tickets have been opened by this account.</div>
                  )}
                </div>
              )}

              {detailTab === 'timeline' && (
                <div className="space-y-1">
                  {customerTimeline.length === 0 ? (
                    <div className="text-center text-muted-foreground/70 p-8">No activity recorded yet.</div>
                  ) : (
                    customerTimeline.map((entry: any, i: number) => (
                      <div key={i} className="flex gap-3 p-2.5 rounded-lg hover:bg-[#110e20]/30 transition">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-blue-300">{entry.action}</span>
                            <span className="text-[9px] text-muted-foreground/50">by {entry.staffName}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">{entry.details}</p>
                          <p className="text-[8px] text-muted-foreground/50 mt-0.5">{new Date(entry.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        variant={confirmState.variant}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, open: false }))}
      />

      {/* Create Ticket from Customer */}
      {showTicketModal && selectedCust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">New Ticket — {selectedCust.name}</h2>
              <button onClick={() => { setShowTicketModal(false); }} className="p-1 text-muted-foreground/70 hover:text-white rounded cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!ticketForm.title.trim()) return;
              setCreatingTicket(true);
              try {
                const res = await fetch('/api/admin/tickets', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    customerId: selectedCust.id,
                    title: ticketForm.title,
                    priority: ticketForm.priority,
                    message: ticketForm.message
                  })
                });
                if (res.ok) {
                  toast('success', 'Ticket created.');
                  setShowTicketModal(false);
                  loadCustDetails(selectedCust.id);
                } else {
                  toast('error', 'Failed to create ticket.');
                }
              } catch (e) { console.error(e); }
              finally { setCreatingTicket(false); }
            }} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Title *</label>
                <input value={ticketForm.title} onChange={e => setTicketForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Brief issue summary" required
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 placeholder-zinc-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Priority</label>
                <select value={ticketForm.priority} onChange={e => setTicketForm(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-300">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Message</label>
                <textarea value={ticketForm.message} onChange={e => setTicketForm(prev => ({ ...prev, message: e.target.value }))}
                  rows={3} placeholder="Describe the issue..."
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 placeholder-zinc-500 resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-border/40">
                <button type="button" onClick={() => setShowTicketModal(false)}
                  className="px-4 py-2 text-xs text-muted-foreground/70 hover:text-white bg-muted hover:bg-muted/80 rounded-lg transition cursor-pointer">Cancel</button>
                <button type="submit" disabled={creatingTicket || !ticketForm.title.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg transition disabled:opacity-50">
                  {creatingTicket ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
