'use client';

import React, { useState, useEffect } from 'react';
import { ServerCrash, FileSpreadsheet, Ticket, User, LogOut, Menu, X, Cpu, Package, AlertCircle, CheckCircle, Clock, ChevronRight, DollarSign, ExternalLink, Plus, Send, Eye } from 'lucide-react';

interface CustomerSession { id: string; email: string; name: string; }

export default function PortalPage() {
  const [session, setSession] = useState<CustomerSession | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [customerData, setCustomerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/customer/me').then(r => r.json()).then(data => {
      if (data.authenticated) { setSession(data.customer); loadPortalData(data.customer.id); }
      else { setAuthChecked(true); setLoading(false); }
    });
  }, []);

  const loadPortalData = async (customerId: string) => {
    setLoading(true);
    try {
      const [sRes, iRes, tRes, cRes] = await Promise.all([
        fetch('/api/admin/services'),
        fetch('/api/admin/invoices'),
        fetch('/api/admin/tickets'),
        fetch(`/api/admin/customers`),
      ]);
      const allServices = await sRes.json();
      const allInvoices = await iRes.json();
      const allTickets = await tRes.json();
      const allCustomers = await cRes.json();

      setServices(allServices.filter((s: any) => s.customerId === customerId));
      setInvoices(allInvoices.filter((i: any) => i.customerId === customerId));
      setTickets(allTickets.filter((t: any) => t.customerId === customerId));
      setCustomerData(allCustomers.find((c: any) => c.id === customerId));
    } catch (e) { console.error(e); }
    finally { setLoading(false); setAuthChecked(true); }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/customer/logout', { method: 'POST' });
    setSession(null);
  };

  const [showPayModal, setShowPayModal] = useState<any>(null);
  const [payLink, setPayLink] = useState('');
  const [payGateway, setPayGateway] = useState<'paypal' | 'cashfree'>('paypal');
  const [payLoading, setPayLoading] = useState(false);

  const handlePayInvoice = async (inv: any) => {
    setPayLoading(true);
    setPayLink('');
    try {
      const total = inv.amount + (inv.tax || 0) - (inv.discount || 0);
      if (payGateway === 'paypal') {
        const res = await fetch('/api/admin/payments/paypal/create', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: total, invoiceId: inv.invoiceNumber, description: `Payment for ${inv.invoiceNumber}` }),
        });
        const data = await res.json();
        if (res.ok && data.approvalLink) setPayLink(data.approvalLink);
        else alert(data.error || 'PayPal error');
      } else {
        const res = await fetch('/api/admin/payments/cashfree/create', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: total, invoiceId: inv.invoiceNumber, customerEmail: customerData?.email || session?.email, customerName: session?.name }),
        });
        const data = await res.json();
        if (res.ok) setPayLink(data.link || data.paymentSessionId);
        else alert(data.error || 'Cashfree error');
      }
    } catch { alert('Payment failed'); }
    finally { setPayLoading(false); }
  };

  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketPriority, setTicketPriority] = useState('Medium');
  const [creatingTicket, setCreatingTicket] = useState(false);

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketTitle.trim() || !ticketMessage.trim()) return;
    setCreatingTicket(true);
    try {
      const res = await fetch('/api/admin/tickets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: session!.id, title: ticketTitle, message: ticketMessage, priority: ticketPriority, customerName: session!.name }),
      });
      if (res.ok) { setTicketTitle(''); setTicketMessage(''); setTicketPriority('Medium'); alert('Ticket created!'); loadPortalData(session!.id); }
    } finally { setCreatingTicket(false); }
  };

  const [profileForm, setProfileForm] = useState({ name: '', phone: '', country: '', companyName: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  useEffect(() => {
    if (customerData) setProfileForm({ name: customerData.name || '', phone: customerData.phone || '', country: customerData.country || '', companyName: customerData.companyName || '' });
  }, [customerData]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await fetch(`/api/admin/customers/${session!.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      alert('Profile updated');
      loadPortalData(session!.id);
    } finally { setSavingProfile(false); }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#05030a] flex items-center justify-center">
        <div className="text-center">
          <Cpu className="w-10 h-10 text-blue-400 animate-pulse mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-mono">Loading portal...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginRegister onLogin={(s) => { setSession(s); loadPortalData(s.id); }} />;
  }

  const totalDue = invoices.filter(i => i.status === 'Pending').reduce((s, i) => s + i.amount + (i.tax || 0) - (i.discount || 0), 0);

  return (
    <div className="min-h-screen bg-[#05030a] text-zinc-100 flex">
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#0a0814] border-r border-white/5 flex flex-col transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-5 border-b border-white/5 flex items-center gap-3">
          <Cpu className="w-6 h-6 text-blue-400" />
          <div>
            <h2 className="text-sm font-bold text-white">Zyphron Cloud</h2>
            <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-wider">Client Portal</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Package },
            { id: 'services', label: 'My Services', icon: ServerCrash },
            { id: 'invoices', label: 'Invoices', icon: FileSpreadsheet },
            { id: 'tickets', label: 'Support Tickets', icon: Ticket },
            { id: 'profile', label: 'Profile', icon: User },
          ].map(item => (
            <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${activeTab === item.id ? 'bg-blue-950/40 text-blue-300 border border-blue-800/30' : 'text-zinc-500 hover:text-white hover:bg-zinc-900/40'}`}>
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-700 to-cyan-600 flex items-center justify-center text-[10px] text-white font-bold">{session.name[0]}</div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{session.name}</p>
              <p className="text-[9px] text-zinc-500 truncate">{session.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-red-400 hover:bg-red-950/15 transition">
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <main className="flex-1 min-h-screen overflow-y-auto">
        <header className="sticky top-0 z-20 bg-[#05030a]/80 backdrop-blur-md border-b border-white/5 px-4 lg:px-8 h-14 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-zinc-500 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-bold text-white uppercase tracking-wide">
            {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'services' ? 'My Services' : activeTab === 'invoices' ? 'Invoices' : activeTab === 'tickets' ? 'Support Tickets' : 'Profile'}
          </h1>
          <div className="text-[10px] text-zinc-600 font-mono">{session.email}</div>
        </header>

        <div className="p-4 lg:p-8 max-w-6xl mx-auto">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-white/5 rounded-lg w-1/3" />
              <div className="grid grid-cols-3 gap-4"><div className="h-24 bg-white/5 rounded-xl" /><div className="h-24 bg-white/5 rounded-xl" /><div className="h-24 bg-white/5 rounded-xl" /></div>
              <div className="h-64 bg-white/5 rounded-xl" />
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                      <p className="text-[10px] text-zinc-500 font-mono">Active Services</p>
                      <p className="text-2xl font-bold text-white mt-1">{services.filter(s => s.status === 'Active').length}</p>
                    </div>
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                      <p className="text-[10px] text-zinc-500 font-mono">Total Spent</p>
                      <p className="text-2xl font-bold text-emerald-400 mt-1">${(customerData?.totalSpending || 0).toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                      <p className="text-[10px] text-zinc-500 font-mono">Due Now</p>
                      <p className="text-2xl font-bold text-amber-400 mt-1">${totalDue.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
                    <h2 className="text-xs font-bold text-white mb-3">Recent Services</h2>
                    {services.length === 0 ? (
                      <p className="text-xs text-zinc-600 py-8 text-center">No services yet. Browse our plans to get started.</p>
                    ) : (
                      <div className="space-y-2">
                        {services.slice(0, 5).map(s => (
                          <div key={s.id} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg border border-white/5">
                            <div className="flex items-center gap-3">
                              <ServerCrash className="w-4 h-4 text-blue-400" />
                              <div>
                                <p className="text-xs font-semibold text-white">{s.planName}</p>
                                <p className="text-[10px] text-zinc-500">{s.type} — {s.location}</p>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 text-[9px] font-mono rounded-full ${s.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-500/20 text-zinc-400'}`}>{s.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
                    <h2 className="text-xs font-bold text-white mb-3">Recent Invoices</h2>
                    {invoices.length === 0 ? (
                      <p className="text-xs text-zinc-600 py-8 text-center">No invoices yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {invoices.slice(0, 5).map(inv => (
                          <div key={inv.id} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-lg border border-white/5">
                            <div className="flex items-center gap-3">
                              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                              <div>
                                <p className="text-xs font-semibold text-white font-mono">{inv.invoiceNumber}</p>
                                <p className="text-[10px] text-zinc-500">${(inv.amount + inv.tax - inv.discount).toFixed(2)} — Due {new Date(inv.dueDate).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 text-[9px] font-mono rounded-full ${inv.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' : inv.status === 'Pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-500/20 text-zinc-400'}`}>{inv.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <a href="/" className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition">
                    <ChevronRight className="w-3.5 h-3.5" /> Browse hosting plans
                  </a>
                </div>
              )}

              {activeTab === 'services' && (
                <div className="space-y-4">
                  {services.length === 0 ? (
                    <div className="text-center py-16 text-zinc-600">
                      <ServerCrash className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-semibold text-zinc-500">No services</p>
                      <p className="text-xs mt-1">Order a hosting plan to get started.</p>
                      <a href="/" className="inline-block mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold rounded-lg">Browse Plans</a>
                    </div>
                  ) : services.map(s => (
                    <div key={s.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <ServerCrash className="w-5 h-5 text-blue-400" />
                          <div>
                            <h3 className="text-sm font-bold text-white">{s.planName}</h3>
                            <p className="text-[10px] text-zinc-500">{s.type} — {s.location}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 text-[9px] font-mono rounded-full ${s.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-500/20 text-zinc-400'}`}>{s.status}</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div><p className="text-[10px] text-zinc-500">CPU</p><p className="font-semibold text-white">{s.cpu}</p></div>
                        <div><p className="text-[10px] text-zinc-500">RAM</p><p className="font-semibold text-white">{s.ram}</p></div>
                        <div><p className="text-[10px] text-zinc-500">Storage</p><p className="font-semibold text-white">{s.storage}</p></div>
                        <div><p className="text-[10px] text-zinc-500">Bandwidth</p><p className="font-semibold text-white">{s.bandwidth}</p></div>
                        <div><p className="text-[10px] text-zinc-500">IP</p><p className="font-semibold text-white font-mono">{s.ipv4 || 'N/A'}</p></div>
                        <div><p className="text-[10px] text-zinc-500">Price</p><p className="font-semibold text-emerald-400">${s.sellingPrice}/mo</p></div>
                        <div><p className="text-[10px] text-zinc-500">Next Renewal</p><p className="font-semibold text-white">{new Date(s.nextRenewalDate).toLocaleDateString()}</p></div>
                        <div><p className="text-[10px] text-zinc-500">Billing</p><p className="font-semibold text-white">{s.billingCycle}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'invoices' && (
                <div className="space-y-4">
                  {invoices.length === 0 ? (
                    <div className="text-center py-16 text-zinc-600">
                      <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-semibold text-zinc-500">No invoices</p>
                    </div>
                  ) : invoices.map(inv => {
                    const total = inv.amount + (inv.tax || 0) - (inv.discount || 0);
                    return (
                      <div key={inv.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                              <h3 className="text-sm font-bold text-white font-mono">{inv.invoiceNumber}</h3>
                              <span className={`px-2 py-0.5 text-[9px] font-mono rounded-full ${inv.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-400' : inv.status === 'Pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-500/20 text-zinc-400'}`}>{inv.status}</span>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-1">Due: {new Date(inv.dueDate).toLocaleDateString()} {inv.paidDate ? `· Paid: ${new Date(inv.paidDate).toLocaleDateString()}` : ''}</p>
                          </div>
                          <p className="text-lg font-bold text-white">${total.toFixed(2)}</p>
                        </div>
                        {inv.status === 'Pending' && (
                          <div className="flex gap-2">
                            <button onClick={() => { setShowPayModal(inv); setPayLink(''); }} className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[10px] font-bold rounded-lg hover:opacity-90 transition flex items-center gap-1 cursor-pointer">
                              <DollarSign className="w-3 h-3" /> Pay Now
                            </button>
                          </div>
                        )}
                        {showPayModal?.id === inv.id && (
                          <div className="mt-3 p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3">
                            <div className="flex gap-3">
                              <button onClick={() => setPayGateway('paypal')} className={`flex-1 p-2 rounded-lg border text-center text-xs cursor-pointer ${payGateway === 'paypal' ? 'border-blue-500 bg-blue-950/20 text-blue-300' : 'border-white/10 text-zinc-500'}`}>PayPal</button>
                              <button onClick={() => setPayGateway('cashfree')} className={`flex-1 p-2 rounded-lg border text-center text-xs cursor-pointer ${payGateway === 'cashfree' ? 'border-blue-500 bg-blue-950/20 text-blue-300' : 'border-white/10 text-zinc-500'}`}>Cashfree</button>
                            </div>
                            {payLink ? (
                              <a href={payLink} target="_blank" rel="noopener noreferrer" className="block w-full py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg text-center hover:bg-emerald-500 transition flex items-center justify-center gap-2">
                                <ExternalLink className="w-3.5 h-3.5" /> Complete Payment
                              </a>
                            ) : (
                              <button onClick={() => handlePayInvoice(inv)} disabled={payLoading} className="w-full py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold rounded-lg disabled:opacity-50 cursor-pointer">
                                {payLoading ? 'Processing...' : `Pay $${total.toFixed(2)}`}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'tickets' && (
                <div className="space-y-4">
                  <form onSubmit={createTicket} className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-3">
                    <h3 className="text-xs font-bold text-white flex items-center gap-2"><Plus className="w-4 h-4 text-blue-400" /> New Ticket</h3>
                    <input value={ticketTitle} onChange={e => setTicketTitle(e.target.value)} placeholder="Subject" required className="w-full p-2 bg-[#0a0814] border border-white/10 rounded-lg text-xs text-white" />
                    <div className="flex gap-3">
                      <select value={ticketPriority} onChange={e => setTicketPriority(e.target.value)} className="p-2 bg-[#0a0814] border border-white/10 rounded-lg text-xs text-zinc-300">
                        <option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option>
                      </select>
                    </div>
                    <textarea value={ticketMessage} onChange={e => setTicketMessage(e.target.value)} placeholder="Describe your issue..." rows={3} required className="w-full p-2 bg-[#0a0814] border border-white/10 rounded-lg text-xs text-white resize-none" />
                    <button type="submit" disabled={creatingTicket} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[10px] font-bold rounded-lg flex items-center gap-2 disabled:opacity-50 cursor-pointer">
                      <Send className="w-3.5 h-3.5" /> {creatingTicket ? 'Submitting...' : 'Submit Ticket'}
                    </button>
                  </form>

                  {tickets.length === 0 ? (
                    <div className="text-center py-12 text-zinc-600">
                      <Ticket className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-semibold text-zinc-500">No tickets</p>
                    </div>
                  ) : tickets.map(t => (
                    <div key={t.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Ticket className="w-4 h-4 text-blue-400" />
                          <h3 className="text-sm font-bold text-white">{t.title}</h3>
                          <span className={`px-2 py-0.5 text-[9px] font-mono rounded-full ${t.status === 'Open' ? 'bg-blue-500/20 text-blue-400' : t.status === 'Answered' ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-500/20 text-zinc-400'}`}>{t.status}</span>
                          <span className={`px-2 py-0.5 text-[9px] font-mono rounded-full ${t.priority === 'High' ? 'bg-red-500/20 text-red-400' : t.priority === 'Medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-500/20 text-zinc-400'}`}>{t.priority}</span>
                        </div>
                        <p className="text-[10px] text-zinc-500">{new Date(t.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="space-y-2 mt-3 max-h-40 overflow-y-auto">
                        {t.messages?.map((m: any, i: number) => (
                          <div key={i} className={`p-3 rounded-lg text-xs ${m.sender === 'staff' ? 'bg-blue-950/20 border border-blue-800/20 ml-6' : 'bg-white/[0.03] border border-white/5'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-white text-[10px]">{m.name}</span>
                              <span className="text-[9px] text-zinc-600">{new Date(m.timestamp).toLocaleString()}</span>
                            </div>
                            <p className="text-zinc-300">{m.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="max-w-lg">
                  <form onSubmit={saveProfile} className="bg-white/[0.02] border border-white/5 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-bold text-white flex items-center gap-2"><User className="w-4 h-4 text-blue-400" /> My Profile</h3>
                    <div>
                      <label className="text-[10px] text-zinc-500 font-mono block mb-1">Full Name</label>
                      <input value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} className="w-full p-2 bg-[#0a0814] border border-white/10 rounded-lg text-xs text-white" />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 font-mono block mb-1">Company</label>
                      <input value={profileForm.companyName} onChange={e => setProfileForm({ ...profileForm, companyName: e.target.value })} className="w-full p-2 bg-[#0a0814] border border-white/10 rounded-lg text-xs text-white" />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 font-mono block mb-1">Phone</label>
                      <input value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} className="w-full p-2 bg-[#0a0814] border border-white/10 rounded-lg text-xs text-white" />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 font-mono block mb-1">Country</label>
                      <input value={profileForm.country} onChange={e => setProfileForm({ ...profileForm, country: e.target.value })} className="w-full p-2 bg-[#0a0814] border border-white/10 rounded-lg text-xs text-white" />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 font-mono block mb-1">Email</label>
                      <input value={customerData?.email || ''} disabled className="w-full p-2 bg-[#0a0814] border border-white/10 rounded-lg text-xs text-zinc-500" />
                    </div>
                    <button type="submit" disabled={savingProfile} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-[10px] font-bold rounded-lg disabled:opacity-50 cursor-pointer">
                      {savingProfile ? 'Saving...' : 'Update Profile'}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function LoginRegister({ onLogin }: { onLogin: (s: CustomerSession) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', companyName: '', country: 'United States' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const url = mode === 'login' ? '/api/auth/customer/login' : '/api/auth/customer/signup';
      const body = mode === 'login' ? { email: form.email, password: form.password } : form;
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok && data.success) { onLogin(data.customer); }
      else { setError(data.error || 'Something went wrong'); }
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#05030a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Cpu className="w-10 h-10 text-blue-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-white">Zyphron Cloud</h1>
          <p className="text-xs text-zinc-500 mt-1">Client Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#0a0814] border border-white/5 rounded-2xl p-6 space-y-4">
          <div className="flex bg-white/[0.03] rounded-lg p-1">
            <button type="button" onClick={() => setMode('login')} className={`flex-1 py-2 text-xs font-bold rounded-md transition cursor-pointer ${mode === 'login' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white'}`}>Sign In</button>
            <button type="button" onClick={() => setMode('register')} className={`flex-1 py-2 text-xs font-bold rounded-md transition cursor-pointer ${mode === 'register' ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white'}`}>Register</button>
          </div>

          {mode === 'register' && (
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full Name" required
              className="w-full p-2.5 bg-[#05030a] border border-white/10 rounded-lg text-xs text-white" />
          )}
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email Address" required
            className="w-full p-2.5 bg-[#05030a] border border-white/10 rounded-lg text-xs text-white" />
          <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Password" required minLength={6}
            className="w-full p-2.5 bg-[#05030a] border border-white/10 rounded-lg text-xs text-white" />
          {mode === 'register' && (
            <input value={form.companyName} onChange={e => setForm({ ...form, companyName: e.target.value })} placeholder="Company (optional)"
              className="w-full p-2.5 bg-[#05030a] border border-white/10 rounded-lg text-xs text-white" />
          )}

          {error && <p className="text-[10px] text-red-400 text-center">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold rounded-lg disabled:opacity-50 cursor-pointer">
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <p className="text-[10px] text-zinc-600 text-center">
            <a href="/" className="text-blue-400 hover:text-blue-300">Back to Home</a>
          </p>
        </form>
      </div>
    </div>
  );
}
