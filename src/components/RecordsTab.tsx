'use client';

import React, { useMemo, useState } from 'react';
import { Search, Download, Plus, X } from 'lucide-react';
import { Customer, Service, Invoice } from '@/lib/db';

interface RecordsTabProps {
  customers: Customer[];
  services: (Service & { customer?: Customer })[];
  invoices: (Invoice & { customer?: Customer; service?: Service })[];
  currency?: string;
  onRefresh?: () => void;
}

type RecordRow = {
  customerName: string;
  email: string;
  discord: string;
  serviceType: string;
  planName: string;
  cpu: string;
  ram: string;
  storage: string;
  location: string;
  price: number;
  billingCycle: string;
  purchaseDate: string;
  renewalDate: string;
  paymentStatus: string;
  invoiceNo: string;
  transactionId: string;
  notes: string;
};

const emptyForm = {
  customerName: '', email: '', discord: '',
  serviceType: 'VPS', planName: '', cpu: '', ram: '', storage: '',
  location: '', sellingPrice: 0, billingCycle: 'Monthly',
  issueDate: new Date().toISOString().slice(0, 10),
  nextRenewalDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  paymentStatus: 'Pending', invoiceNo: '', transactionId: '', notes: ''
};

export default function RecordsTab({ customers, services, invoices, currency = 'USD', onRefresh }: RecordsTabProps) {
  const sym = currency === 'INR' ? '\u20B9' : '$';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const records: RecordRow[] = useMemo(() => {
    const rows: RecordRow[] = [];
    services.forEach(s => {
      const cust = customers.find(c => c.id === s.customerId);
      const invs = invoices.filter(i => i.serviceId === s.id);
      const latestInv = invs.length > 0 ? invs.reduce((a, b) => new Date(a.issueDate) > new Date(b.issueDate) ? a : b) : null;
      rows.push({
        customerName: cust?.name || '—',
        email: cust?.email || '—',
        discord: cust?.discord || '—',
        serviceType: s.type,
        planName: s.planName,
        cpu: s.cpu,
        ram: s.ram,
        storage: s.storage,
        location: s.location,
        price: s.sellingPrice,
        billingCycle: s.billingCycle,
        purchaseDate: new Date(s.issueDate).toLocaleDateString(),
        renewalDate: new Date(s.nextRenewalDate).toLocaleDateString(),
        paymentStatus: latestInv?.status || '—',
        invoiceNo: latestInv?.invoiceNumber || '—',
        transactionId: latestInv?.transactionId || '—',
        notes: s.internalNotes || '—',
      });
    });
    return rows;
  }, [services, customers, invoices]);

  const filtered = useMemo(() => {
    return records.filter(r => {
      const match = !search || r.customerName.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase()) || r.planName.toLowerCase().includes(search.toLowerCase()) || r.invoiceNo.toLowerCase().includes(search.toLowerCase()) || r.transactionId.toLowerCase().includes(search.toLowerCase());
      const status = statusFilter === 'all' || r.paymentStatus.toLowerCase() === statusFilter;
      return match && status;
    });
  }, [records, search, statusFilter]);

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = 'Customer Name,Email,Discord,Service,Plan,CPU,RAM,Storage,Location,Price,Billing Cycle,Purchase Date,Renewal Date,Payment Status,Invoice No.,Transaction ID,Notes\n';
    const rows = filtered.map(r =>
      `"${r.customerName}","${r.email}","${r.discord}","${r.serviceType}","${r.planName}","${r.cpu}","${r.ram}","${r.storage}","${r.location}","${sym}${r.price.toFixed(2)}","${r.billingCycle}","${r.purchaseDate}","${r.renewalDate}","${r.paymentStatus}","${r.invoiceNo}","${r.transactionId}","${r.notes.replace(/"/g, '""')}"`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Records_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'sellingPrice' ? Number(value) : value }));
  };

  const handleSubmit = async () => {
    if (!form.customerName.trim() || !form.planName.trim()) return;
    setSaving(true);
    try {
      // 1. Find or create customer
      let customerId: string;
      const existing = customers.find(c => c.name.toLowerCase() === form.customerName.trim().toLowerCase());
      if (existing) {
        customerId = existing.id;
      } else {
        const custRes = await fetch('/api/admin/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.customerName.trim(), email: form.email, discord: form.discord,
            phone: '', address: '', notes: ''
          })
        });
        if (!custRes.ok) throw new Error('Failed to create customer');
        const newCust = await custRes.json();
        if (typeof newCust === 'object' && newCust.id) customerId = newCust.id;
        else throw new Error('Customer ID not returned');
      }

      // 2. Create service
      const serviceRes = await fetch('/api/admin/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          type: form.serviceType,
          planName: form.planName,
          cpu: form.cpu, ram: form.ram, storage: form.storage,
          bandwidth: '', location: form.location,
          provider: '', username: form.customerName.trim().toLowerCase().replace(/\s+/g, ''),
          passwordHash: '', panelUrl: '',
          purchaseCost: 0,
          sellingPrice: form.sellingPrice,
          billingCycle: form.billingCycle,
          issueDate: form.issueDate,
          nextRenewalDate: form.nextRenewalDate,
          expiryDate: '',
          autoRenewal: true, status: 'Active',
          internalNotes: form.notes
        })
      });
      if (!serviceRes.ok) throw new Error('Failed to create service');
      const newService = await serviceRes.json();
      const serviceId = typeof newService === 'object' && newService.id ? newService.id : null;
      if (!serviceId) throw new Error('Service ID not returned');

      // 3. Create invoice
      if (form.invoiceNo) {
        await fetch('/api/admin/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceNumber: form.invoiceNo,
            customerId,
            serviceId,
            amount: form.sellingPrice,
            tax: 0, discount: 0,
            paymentMethod: 'Manual',
            transactionId: form.transactionId || '',
            issueDate: form.issueDate,
            dueDate: form.nextRenewalDate,
            paidDate: form.paymentStatus === 'Paid' ? form.issueDate : '',
            status: form.paymentStatus,
            notes: ''
          })
        });
      }

      setShowModal(false);
      setForm(emptyForm);
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error('Manual entry error:', e);
      alert('Failed to create record. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Master Records</h1>
          <p className="text-xs text-muted-foreground/70">Consolidated view of all customers, services, and invoices.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg text-xs font-semibold text-white transition shadow shadow-blue-500/10">
            <Plus className="w-4 h-4" /> <span>Manual Entry</span>
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 rounded-lg text-xs font-semibold text-white transition shadow shadow-emerald-500/10">
            <Download className="w-4 h-4" /> <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-3 bg-background border border-border rounded-xl">
          <p className="text-lg font-bold text-white font-mono">{records.length}</p>
          <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Total Services</p>
        </div>
        <div className="p-3 bg-background border border-border rounded-xl">
          <p className="text-lg font-bold text-white font-mono">{sym}{records.reduce((s, r) => s + r.price, 0).toFixed(0)}</p>
          <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Total Monthly Rev</p>
        </div>
        <div className="p-3 bg-background border border-border rounded-xl">
          <p className="text-lg font-bold text-white font-mono">{records.filter(r => r.paymentStatus === 'Paid').length}</p>
          <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Paid</p>
        </div>
        <div className="p-3 bg-background border border-border rounded-xl">
          <p className="text-lg font-bold text-white font-mono">{records.filter(r => r.paymentStatus === 'Pending' || r.paymentStatus === '—').length}</p>
          <p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Unpaid/Pending</p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-background/75 border border-border/50 rounded-xl">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/70" />
          <input type="text" placeholder="Search by name, email, plan, invoice..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:border-blue-500/60 transition" />
        </div>
        <div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-300">
            <option value="all">All Payment Statuses</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="flex items-center justify-end text-[10px] text-muted-foreground/70 font-mono">
          {filtered.length} records
        </div>
      </div>

      {/* Table */}
      <div className="bg-background border border-border rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[9px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                <th className="p-3">Customer</th>
                <th className="p-3">Email</th>
                <th className="p-3">Discord</th>
                <th className="p-3">Service</th>
                <th className="p-3">Plan</th>
                <th className="p-3">CPU</th>
                <th className="p-3">RAM</th>
                <th className="p-3">Storage</th>
                <th className="p-3">Location</th>
                <th className="p-3 text-right">Price</th>
                <th className="p-3">Cycle</th>
                <th className="p-3">Purchase</th>
                <th className="p-3">Renewal</th>
                <th className="p-3 text-center">Pay Status</th>
                <th className="p-3">Invoice</th>
                <th className="p-3">Txn ID</th>
                <th className="p-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-[10px]">
              {filtered.map((r, i) => (
                <tr key={i} className="hover:bg-primary/5 transition">
                  <td className="p-3 font-semibold text-white whitespace-nowrap">{r.customerName}</td>
                  <td className="p-3 text-muted-foreground font-mono">{r.email}</td>
                  <td className="p-3 text-blue-400 font-mono">{r.discord}</td>
                  <td className="p-3 font-semibold text-blue-400">{r.serviceType}</td>
                  <td className="p-3 text-zinc-200 whitespace-nowrap">{r.planName}</td>
                  <td className="p-3 text-muted-foreground font-mono">{r.cpu}</td>
                  <td className="p-3 text-muted-foreground font-mono">{r.ram}</td>
                  <td className="p-3 text-muted-foreground font-mono">{r.storage}</td>
                  <td className="p-3 text-muted-foreground">{r.location}</td>
                  <td className="p-3 text-right font-mono text-white font-bold whitespace-nowrap">{sym}{r.price.toFixed(2)}</td>
                  <td className="p-3 text-muted-foreground font-mono">{r.billingCycle}</td>
                  <td className="p-3 text-muted-foreground font-mono">{r.purchaseDate}</td>
                  <td className="p-3 text-muted-foreground font-mono">{r.renewalDate}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                      r.paymentStatus === 'Paid' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30' :
                      r.paymentStatus === 'Pending' ? 'bg-amber-950/40 text-amber-400 border border-amber-800/30' :
                      r.paymentStatus === 'Failed' ? 'bg-red-950/40 text-red-400 border border-red-800/30' :
                      'bg-zinc-950/40 text-muted-foreground border border-zinc-800/30'
                    }`}>{r.paymentStatus}</span>
                  </td>
                  <td className="p-3 font-mono text-blue-300">{r.invoiceNo}</td>
                  <td className="p-3 font-mono text-muted-foreground/70 max-w-[100px] truncate" title={r.transactionId}>{r.transactionId}</td>
                  <td className="p-3 text-muted-foreground/70 max-w-[120px] truncate text-[9px]" title={r.notes}>{r.notes}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={17} className="p-8 text-center text-muted-foreground/70 font-mono">No records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Manual Record Entry</h2>
              <button onClick={() => { setShowModal(false); setForm(emptyForm); }} className="p-1 text-muted-foreground/70 hover:text-white rounded cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Customer Info */}
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Customer Name *</label>
                <input name="customerName" value={form.customerName} onChange={handleInput} placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 placeholder-zinc-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Email</label>
                <input name="email" value={form.email} onChange={handleInput} placeholder="email@example.com"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 placeholder-zinc-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Discord</label>
                <input name="discord" value={form.discord} onChange={handleInput} placeholder="user#0000"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 placeholder-zinc-500" />
              </div>

              {/* Service Info */}
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Service Type</label>
                <select name="serviceType" value={form.serviceType} onChange={handleInput} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-300">
                  <option value="VPS">VPS</option>
                  <option value="Web Hosting">Web Hosting</option>
                  <option value="Dedicated">Dedicated</option>
                  <option value="Game Server">Game Server</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Plan Name *</label>
                <input name="planName" value={form.planName} onChange={handleInput} placeholder="e.g. Ryzen VPS-2"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 placeholder-zinc-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Location</label>
                <input name="location" value={form.location} onChange={handleInput} placeholder="e.g. New York, US"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 placeholder-zinc-500" />
              </div>

              {/* Resources */}
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">CPU</label>
                <input name="cpu" value={form.cpu} onChange={handleInput} placeholder="e.g. 4 vCPU"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 placeholder-zinc-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">RAM</label>
                <input name="ram" value={form.ram} onChange={handleInput} placeholder="e.g. 8 GB"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 placeholder-zinc-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Storage</label>
                <input name="storage" value={form.storage} onChange={handleInput} placeholder="e.g. 120 GB SSD"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 placeholder-zinc-500" />
              </div>

              {/* Billing */}
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Price ({sym})</label>
                <input name="sellingPrice" type="number" value={form.sellingPrice} onChange={handleInput}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 placeholder-zinc-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Billing Cycle</label>
                <select name="billingCycle" value={form.billingCycle} onChange={handleInput} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-300">
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Semi-Annual">Semi-Annual</option>
                  <option value="Annual">Annual</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Purchase Date</label>
                <input name="issueDate" type="date" value={form.issueDate} onChange={handleInput}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200" />
              </div>

              {/* Renewal & Payment */}
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Renewal Date</label>
                <input name="nextRenewalDate" type="date" value={form.nextRenewalDate} onChange={handleInput}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Payment Status</label>
                <select name="paymentStatus" value={form.paymentStatus} onChange={handleInput} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-300">
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Invoice No.</label>
                <input name="invoiceNo" value={form.invoiceNo} onChange={handleInput} placeholder="e.g. INV-001"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 placeholder-zinc-500" />
              </div>

              {/* Txn & Notes */}
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Transaction ID</label>
                <input name="transactionId" value={form.transactionId} onChange={handleInput} placeholder="e.g. TXN-abc123"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 placeholder-zinc-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-1">Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleInput} rows={2} placeholder="Internal notes..."
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 placeholder-zinc-500 resize-none" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border/40">
              <button onClick={() => { setShowModal(false); setForm(emptyForm); }}
                className="px-4 py-2 text-xs text-muted-foreground/70 hover:text-white bg-muted hover:bg-muted/80 rounded-lg transition cursor-pointer">Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !form.customerName.trim() || !form.planName.trim()}
                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg transition disabled:opacity-50">{
                  saving ? 'Creating...' : 'Create Record'
                }</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
