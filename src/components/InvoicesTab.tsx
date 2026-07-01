'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  FileDown,
  Coins,
  CheckCircle,
  Clock,
  Plus,
  Trash2,
  Calendar,
  CreditCard,
  FileText,
  Send,
  Mail
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Invoice, Customer, Service } from '@/lib/db';
import { useToast } from '@/components/Toaster';
import ConfirmModal from '@/components/ConfirmModal';

interface InvoicesTabProps {
  userRole: string;
  onLogAction: (action: string, details: string) => void;
  currency?: string;
}

export default function InvoicesTab({ userRole, onLogAction, currency = 'USD' }: InvoicesTabProps) {
  const sym = currency === 'INR' ? '\u20B9' : '$';
  const [invoices, setInvoices] = useState<(Invoice & { customer?: Customer; service?: Service })[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; message: string; variant?: 'danger' | 'warning' | 'default'; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailInv, setEmailInv] = useState<(Invoice & { customer?: Customer; service?: Service }) | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // Record Payment Modal State
  const [selectedInv, setSelectedInv] = useState<(Invoice & { customer?: Customer }) | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'PayPal' | 'Crypto' | 'Bank Transfer' | 'Razorpay' | 'Stripe' | 'Cash'>('Stripe');
  const [transactionId, setTransactionId] = useState('');

  // Manual Invoice State
  const [isCreating, setIsCreating] = useState(false);
  const [newInv, setNewInv] = useState({
    customerId: '',
    serviceId: '',
    amount: '',
    tax: '',
    discount: '',
    paymentMethod: 'Stripe' as const,
    transactionId: '',
    status: 'Pending',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    paidDate: '',
    notes: ''
  });

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (statusFilter !== 'all') q.set('status', statusFilter);

      const res = await fetch(`/api/admin/invoices?${q.toString()}`);
      if (res.ok) {
        setInvoices(await res.json());
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

      const sRes = await fetch('/api/admin/services');
      if (sRes.ok) setServices(await sRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchInvoices();
    fetchMeta();
  }, [search, statusFilter]);

  // Record manual payment settling
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInv) return;

    try {
      const res = await fetch(`/api/admin/invoices/${selectedInv.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Paid',
          paymentMethod,
          transactionId
        })
      });
      if (res.ok) {
        toast('success', 'Invoice settled and paid. Pushed service renewal dates.');
        setSelectedInv(null);
        setTransactionId('');
        fetchInvoices();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete invoice
  const handleDeleteInvoice = async (id: string, num: string) => {
    if (!['Founder', 'Admin'].includes(userRole)) {
      toast('error', 'Forbidden. Your role is restricted from deleting accounting invoices.');
      return;
    }
    setConfirmState({
      open: true,
      title: 'Delete Invoice',
      message: `Are you sure you want to permanently delete invoice ${num}?`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, open: false }));
        try {
          const res = await fetch(`/api/admin/invoices/${id}`, { method: 'DELETE' });
          if (res.ok) {
            fetchInvoices();
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
    return;
  };

  // Create Manual Invoice
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInv.customerId) {
      toast('error', 'Please select a customer.');
      return;
    }

    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newInv,
          amount: Number(newInv.amount) || 0,
          tax: Number(newInv.tax) || 0,
          discount: Number(newInv.discount) || 0,
        })
      });
      if (res.ok) {
        setIsCreating(false);
        setNewInv({
          customerId: '',
          serviceId: '',
          amount: '',
          tax: '',
          discount: '',
          paymentMethod: 'Stripe',
          transactionId: '',
          status: 'Pending',
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          paidDate: '',
          notes: ''
        });
        fetchInvoices();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // PDF Generation via jsPDF
  const generatePDF = (inv: Invoice & { customer?: Customer; service?: Service }) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const primaryColor = '#9d4edd'; // Zyphron Purple
    const darkBg = '#0c0a12';
    const lightText = '#f4f4f7';
    
    // Top banner
    doc.setFillColor(12, 10, 18);
    doc.rect(0, 0, 210, 45, 'F');

    // Logo / Branding
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(157, 78, 221); // Neon Purple
    doc.text('ZYPHRON CLOUD', 15, 20);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 156, 176);
    doc.text('Premium Enterprise Cloud Hosting Solutions', 15, 26);
    doc.text('GSTIN: GSTIN27AAACZ1122D1Z0', 15, 31);
    doc.text('support@zyphron.cloud | https://zyphron.cloud', 15, 36);

    // INVOICE text right aligned
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('INVOICE', 155, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(157, 78, 221);
    doc.text(inv.invoiceNumber, 155, 27);

    // Bill To section
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('BILL TO:', 15, 60);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(inv.customer?.name || 'Customer Name', 15, 66);
    if (inv.customer?.companyName) {
      doc.text(inv.customer.companyName, 15, 71);
    }
    doc.text(inv.customer?.email || 'N/A', 15, inv.customer?.companyName ? 76 : 71);
    doc.text(inv.customer?.country || 'N/A', 15, inv.customer?.companyName ? 81 : 76);

    // Billing Date Details
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('INVOICE DETAILS:', 130, 60);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Issue Date: ${new Date(inv.issueDate).toLocaleDateString()}`, 130, 66);
    doc.text(`Due Date: ${new Date(inv.dueDate).toLocaleDateString()}`, 130, 71);
    doc.text(`Status: ${inv.status.toUpperCase()}`, 130, 76);
    doc.text(`Payment: ${inv.paymentMethod}`, 130, 81);

    // Table Header
    doc.setFillColor(36, 29, 59);
    doc.rect(15, 95, 180, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('Item Description', 20, 100);
    doc.text('Billing Term', 110, 100);
    doc.text('Unit Price', 145, 100);
    doc.text('Total Price', 170, 100);

    // Table Row
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const itemDesc = inv.service 
      ? `${inv.service.type} - ${inv.service.planName} (${inv.service.location})`
      : 'Manual Service Configuration Setup';
    const cycle = inv.service ? inv.service.billingCycle : 'One-Time';
    
    doc.text(itemDesc, 20, 112);
    doc.text(cycle, 110, 112);
    doc.text(`${sym}${inv.amount.toFixed(2)}`, 145, 112);
    doc.text(`${sym}${inv.amount.toFixed(2)}`, 170, 112);

    // Grid divider
    doc.setDrawColor(200, 200, 200);
    doc.line(15, 120, 195, 120);

    // Calculations Section
    const rightAlignStart = 140;
    doc.setFontSize(10);
    doc.text('Subtotal:', rightAlignStart, 130);
    doc.text(`${sym}${inv.amount.toFixed(2)}`, 175, 130);

    if (inv.discount > 0) {
      doc.text('Discount:', rightAlignStart, 136);
      doc.text(`-${sym}${inv.discount.toFixed(2)}`, 175, 136);
    }

    doc.text('Tax (18% GST):', rightAlignStart, inv.discount > 0 ? 142 : 136);
    doc.text(`${sym}${inv.tax.toFixed(2)}`, 175, inv.discount > 0 ? 142 : 136);

    // Grand Total Box
    doc.setFillColor(12, 10, 18);
    doc.rect(rightAlignStart - 5, inv.discount > 0 ? 148 : 142, 60, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(157, 78, 221);
    doc.text('GRAND TOTAL:', rightAlignStart, inv.discount > 0 ? 154 : 148);
    const grandTotal = inv.amount + inv.tax - inv.discount;
    doc.text(`${sym}${grandTotal.toFixed(2)}`, 175, inv.discount > 0 ? 154 : 148);

    // Footer info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text('Thank you for choosing Zyphron Cloud Solutions! Your business is appreciated.', 15, 270);
    doc.text('This is a computer-generated transaction record and requires no physical signatures.', 15, 275);

    // Save
    doc.save(`Zyphron_Invoice_${inv.invoiceNumber}.pdf`);
    onLogAction('PDF Invoice Downloaded', `Generated and downloaded PDF file for invoice ${inv.invoiceNumber}.`);
  };

  // Send Invoice via Email
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInv) return;
    setSendingEmail(true);
    try {
      const res = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo,
          cc: emailCc || undefined,
          subject: emailSubject,
          html: emailBody.replace(/\n/g, '<br/>'),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast('success', `Invoice emailed to ${emailTo}.`);
        onLogAction('Invoice Emailed', `Sent ${emailInv.invoiceNumber} to ${emailTo}.`);
        setEmailInv(null);
      } else {
        toast('error', data.error || 'Failed to send email.');
      }
    } catch (e) {
      toast('error', 'Failed to send email.');
    } finally {
      setSendingEmail(false);
    }
  };

  const openEmailModal = (inv: Invoice & { customer?: Customer; service?: Service }) => {
    setEmailInv(inv);
    setEmailTo(inv.customer?.email || '');
    setEmailCc('');
    setEmailSubject(`Invoice ${inv.invoiceNumber} from ${inv.customer?.companyName || 'Zyphron Cloud'}`);
    setEmailBody(`Dear ${inv.customer?.name || 'Valued Customer'},\n\nPlease find attached invoice ${inv.invoiceNumber} for ${sym}${(inv.amount + inv.tax - inv.discount).toFixed(2)} due on ${new Date(inv.dueDate).toLocaleDateString()}.\n\nPayment Method: ${inv.paymentMethod}\n\nBest regards,\nZyphron Cloud Solutions`);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Invoice Center</h1>
          <p className="text-xs text-muted-foreground/70">View and settle client transaction invoices or compile PDF receipts.</p>
        </div>
        {!['Moderator', 'Support'].includes(userRole) && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg text-xs font-semibold text-white transition shadow shadow-blue-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-background/75 border border-border/50 rounded-xl">
        <div className="relative col-span-2">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground/70" />
          <input
            type="text"
            placeholder="Search by Invoice #, client name, transaction ID..."
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
            <option value="all">All Invoices</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
          </select>
        </div>

        <div className="flex items-center justify-end text-[10px] text-muted-foreground/70 font-mono">
          Ledger: {invoices.length} invoices
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-background border border-border rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-10 text-center text-xs text-muted-foreground/70 animate-pulse">Syncing accounting logs...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                  <th className="p-4">Invoice Number</th>
                  <th className="p-4">Client</th>
                  <th className="p-4">Target Service</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Payment Method</th>
                  <th className="p-4">Transaction ID</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Gross Total</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {invoices.map((inv) => {
                  const grandTotal = inv.amount + inv.tax - inv.discount;
                  return (
                    <tr key={inv.id} className="hover:bg-primary/5 transition">
                      <td className="p-4 font-mono font-bold text-blue-400">{inv.invoiceNumber}</td>
                      <td className="p-4 font-semibold text-white">{inv.customer?.name}</td>
                      <td className="p-4 text-muted-foreground font-medium">
                        {inv.service ? `${inv.service.type} - ${inv.service.planName}` : 'Manual Entry'}
                      </td>
                      <td className="p-4 font-mono text-muted-foreground">{new Date(inv.dueDate).toLocaleDateString()}</td>
                      <td className="p-4 text-muted-foreground">{inv.paymentMethod}</td>
                      <td className="p-4 font-mono text-muted-foreground/70">{inv.transactionId || '—'}</td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            inv.status === 'Paid'
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30'
                              : inv.status === 'Pending'
                              ? 'bg-amber-950/40 text-amber-400 border border-amber-800/30'
                              : 'bg-red-950/40 text-red-400 border border-red-800/30'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-white font-bold">{sym}{grandTotal.toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => generatePDF(inv)}
                            className="px-2 py-1 bg-muted border border-border hover:border-blue-800/40 rounded-lg text-muted-foreground hover:text-blue-400 transition cursor-pointer flex items-center gap-1 text-[9px] font-bold uppercase"
                            title="Download PDF">
                            <FileDown className="w-3 h-3" /> PDF
                          </button>
                          <button onClick={() => openEmailModal(inv)}
                            className="px-2 py-1 bg-muted border border-border hover:border-blue-800/40 rounded-lg text-muted-foreground hover:text-blue-400 transition cursor-pointer flex items-center gap-1 text-[9px] font-bold uppercase"
                            title="Email Invoice">
                            <Send className="w-3 h-3" /> Email
                          </button>
                          {inv.status !== 'Paid' && (
                            <button onClick={() => setSelectedInv(inv)}
                              className="px-2 py-1 bg-muted border border-border hover:border-emerald-800/40 rounded-lg text-muted-foreground hover:text-emerald-400 transition cursor-pointer flex items-center gap-1 text-[9px] font-bold uppercase"
                              title="Record Payment">
                              <Coins className="w-3 h-3" /> Pay
                            </button>
                          )}
                          <button onClick={() => handleDeleteInvoice(inv.id, inv.invoiceNumber)}
                            className="px-2 py-1 bg-muted border border-border hover:border-red-800/40 rounded-lg text-muted-foreground/70 hover:text-red-400 transition cursor-pointer flex items-center gap-1 text-[9px] font-bold uppercase"
                            title="Delete Invoice">
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {invoices.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <FileText className="w-10 h-10 text-blue-400/60" />
                        <h3 className="text-sm font-bold text-white">No Invoices Yet</h3>
                        <p className="text-xs text-muted-foreground/70 max-w-[280px]">
                          Create your first invoice to start tracking client payments and revenue.
                        </p>
                        {!['Moderator', 'Support'].includes(userRole) && (
                          <button onClick={() => setIsCreating(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-lg text-xs font-semibold text-white transition shadow shadow-blue-500/10 mt-1">
                            <Plus className="w-4 h-4" /> Create Your First Invoice
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

      {/* Manual Invoice Creation Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-[#03000a]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="p-5 border-b border-border bg-zinc-950/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Generate Manual Invoice</h3>
              <button onClick={() => setIsCreating(false)} className="text-muted-foreground/70 hover:text-zinc-300 text-xs font-bold uppercase">
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Select Customer</label>
                <select
                  required
                  value={newInv.customerId}
                  onChange={(e) => {
                    const custSrvs = services.filter((s) => s.customerId === e.target.value);
                    setNewInv({
                      ...newInv,
                      customerId: e.target.value,
                      serviceId: custSrvs[0]?.id || ''
                    });
                  }}
                  className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300"
                >
                  <option value="">Choose profile</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.companyName || 'Individual'})
                    </option>
                  ))}
                </select>
              </div>

              {newInv.customerId && (
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Link to Service (Optional)</label>
                  <select
                    value={newInv.serviceId}
                    onChange={(e) => setNewInv({ ...newInv, serviceId: e.target.value })}
                    className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300"
                  >
                    <option value="">No specific service linked</option>
                    {services
                      .filter((s) => s.customerId === newInv.customerId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.type} - {s.planName} ({sym}{s.sellingPrice}/cycle)
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] uppercase text-muted-foreground/70 mb-1 font-semibold">Amount ({sym})</label>
                  <input type="number" step="0.01" required value={newInv.amount}
                    onChange={(e) => setNewInv({ ...newInv, amount: e.target.value })}
                    className="w-full p-2 bg-muted border border-border rounded-lg text-zinc-200" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-muted-foreground/70 mb-1 font-semibold">Tax ({sym})</label>
                  <input type="number" step="0.01" value={newInv.tax}
                    onChange={(e) => setNewInv({ ...newInv, tax: e.target.value })}
                    className="w-full p-2 bg-muted border border-border rounded-lg text-zinc-200" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[9px] uppercase text-muted-foreground/70 mb-1 font-semibold">Discount ({sym})</label>
                  <input type="number" step="0.01" value={newInv.discount}
                    onChange={(e) => setNewInv({ ...newInv, discount: e.target.value })}
                    className="w-full p-2 bg-muted border border-border rounded-lg text-zinc-200" placeholder="0.00" />
                </div>
              </div>

              {newInv.amount && (
                <div className="p-2 bg-blue-950/20 border border-blue-800/30 rounded-lg text-[10px] text-blue-300 font-mono flex justify-between">
                  <span>Grand Total:</span>
                  <span className="font-bold text-white">{sym}{(Number(newInv.amount || 0) + Number(newInv.tax || 0) - Number(newInv.discount || 0)).toFixed(2)}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Issue Date</label>
                  <input type="date" required value={newInv.issueDate}
                    onChange={(e) => setNewInv({ ...newInv, issueDate: e.target.value })}
                    className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Due Date</label>
                  <input type="date" required value={newInv.dueDate}
                    onChange={(e) => setNewInv({ ...newInv, dueDate: e.target.value })}
                    className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Payment Method</label>
                  <select value={newInv.paymentMethod}
                    onChange={(e) => setNewInv({ ...newInv, paymentMethod: e.target.value as any })}
                    className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300">
                    <option value="Stripe">Stripe Card</option>
                    <option value="PayPal">PayPal Account</option>
                    <option value="Crypto">Crypto (BTC/USDT)</option>
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Wire Transfer</option>
                    <option value="Cash">Cash Ledger</option>
                    <option value="Razorpay">Razorpay Gateway</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Invoice Status</label>
                  <select value={newInv.status}
                    onChange={(e) => setNewInv({ ...newInv, status: e.target.value as any })}
                    className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300">
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>

              {newInv.status === 'Paid' && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-emerald-950/20 border border-emerald-800/30 rounded-lg">
                  <div>
                    <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Transaction ID</label>
                    <input type="text" required value={newInv.transactionId}
                      onChange={(e) => setNewInv({ ...newInv, transactionId: e.target.value })}
                      className="w-full p-2.5 bg-background border border-border rounded-lg text-zinc-200 font-mono" placeholder="txn_..." />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Paid Date</label>
                    <input type="date" required value={newInv.paidDate}
                      onChange={(e) => setNewInv({ ...newInv, paidDate: e.target.value })}
                      className="w-full p-2.5 bg-background border border-border rounded-lg text-zinc-300" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Invoice Notes (Optional)</label>
                <textarea rows={2} value={newInv.notes}
                  onChange={(e) => setNewInv({ ...newInv, notes: e.target.value })}
                  className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200 resize-none"
                  placeholder="Payment terms, internal notes..." />
              </div>

              {Number(newInv.amount) > 0 && (
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-600/10 to-cyan-500/10 border border-blue-800/30 rounded-lg">
                  <span className="text-[10px] text-muted-foreground/70 font-mono">Total Due</span>
                  <span className="text-sm font-bold text-white font-mono">{sym}{(Number(newInv.amount || 0) + Number(newInv.tax || 0) - Number(newInv.discount || 0)).toFixed(2)}</span>
                </div>
              )}

              <div className="pt-2">
                <button type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white rounded-lg font-semibold tracking-wider uppercase transition shadow">
                  Publish Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record manual transaction modal */}
      {selectedInv && (
        <div className="fixed inset-0 bg-[#03000a]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="p-5 border-b border-border bg-zinc-950/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Record Payment Transaction</h3>
              <button onClick={() => setSelectedInv(null)} className="text-muted-foreground/70 hover:text-zinc-300 text-xs font-bold uppercase">
                Cancel
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-[#110e20] border border-border/40 rounded-xl space-y-1">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-bold">Settling invoice</p>
                <p className="text-white font-bold">{selectedInv.invoiceNumber}</p>
                <p className="text-muted-foreground">Client: {selectedInv.customer?.name}</p>
                <p className="text-emerald-400 font-bold font-mono">
                  Amount Due: {sym}{(selectedInv.amount + selectedInv.tax - selectedInv.discount).toFixed(2)}
                </p>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Payment Gateway / Route</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300"
                >
                  <option value="Stripe">Stripe Card</option>
                  <option value="PayPal">PayPal Account</option>
                  <option value="Crypto">Crypto (BTC/USDT)</option>
                  <option value="Razorpay">Razorpay Gateway</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Wire Transfer</option>
                  <option value="Cash">Cash Ledger</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Transaction ID / Reference ID</label>
                <input
                  type="text"
                  required
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200 font-mono"
                  placeholder="e.g. txn_3H2eB4kd..."
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg font-semibold tracking-wider uppercase transition shadow"
                >
                  Settle Invoice & Mark Paid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Email Invoice Modal */}
      {emailInv && (
        <div className="fixed inset-0 bg-[#03000a]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative">
            <div className="p-5 border-b border-border bg-muted/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400" /> Email Invoice
              </h3>
              <button onClick={() => setEmailInv(null)} className="text-muted-foreground/70 hover:text-zinc-300 text-xs font-bold uppercase">
                Close
              </button>
            </div>
            <form onSubmit={handleSendEmail} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-[#110e20] border border-border/40 rounded-xl space-y-1">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-bold">Invoice Reference</p>
                <p className="text-white font-bold">{emailInv.invoiceNumber} — {sym}{(emailInv.amount + emailInv.tax - emailInv.discount).toFixed(2)}</p>
                <p className="text-muted-foreground">{emailInv.customer?.name} ({emailInv.customer?.email})</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">To</label>
                  <input
                    type="email" required value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200"
                    placeholder="customer@example.com"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">CC (Optional)</label>
                  <input
                    type="text" value={emailCc}
                    onChange={(e) => setEmailCc(e.target.value)}
                    className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200"
                    placeholder="billing@company.com, finance@company.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Subject</label>
                <input
                  type="text" required value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Email Body (HTML supported)</label>
                <textarea
                  required rows={8}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full p-3 bg-muted border border-border rounded-lg text-zinc-200 resize-none font-mono text-[11px]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEmailInv(null)}
                  className="px-4 py-2 bg-muted border border-border text-muted-foreground hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition"
                >Cancel</button>
                <button type="submit" disabled={sendingEmail}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition flex items-center gap-1.5"
                >
                  {sendingEmail ? 'Sending...' : <><Send className="w-3.5 h-3.5" /> Send Invoice</>}
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
