'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Search,
  Check,
  LogOut,
  ChevronDown,
  Cpu,
  User,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import LoginPortal from '@/components/LoginPortal';
import Sidebar from '@/components/Sidebar';
import OverviewTab from '@/components/OverviewTab';
import CustomersTab from '@/components/CustomersTab';
import ServicesTab from '@/components/ServicesTab';
import RenewalsTab from '@/components/RenewalsTab';
import InvoicesTab from '@/components/InvoicesTab';
import ServersTab from '@/components/ServersTab';
import ProvidersTab from '@/components/ProvidersTab';
import TicketsTab from '@/components/TicketsTab';
import LogsTab from '@/components/LogsTab';
import SettingsTab from '@/components/SettingsTab';
import ReportsTab from '@/components/ReportsTab';
import ExpensesTab from '@/components/ExpensesTab';
import DomainsTab from '@/components/DomainsTab';
import AssetsTab from '@/components/AssetsTab';
import CalendarView from '@/components/CalendarView';
import KanbanBoard from '@/components/KanbanBoard';
import ApiConsole from '@/components/ApiConsole';
import PaymenterTab from '@/components/PaymenterTab';
import PterodactylTab from '@/components/PterodactylTab';
import PricingTab from '@/components/PricingTab';
import RecordsTab from '@/components/RecordsTab';
import AIAssistant from '@/components/AIAssistant';
import { Customer, Service, Server as ServerType, Invoice, ActivityLog, SystemNotification, Expense, Domain, Asset, ProviderRecord } from '@/lib/db';

export default function AdminDashboard() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<{ id: string; username: string; name: string; role: string } | null>(null);

  // Central Database Collections
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [servers, setServers] = useState<ServerType[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [providers, setProviders] = useState<ProviderRecord[]>([]);
  const [currency, setCurrency] = useState('USD');
  
  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Notification UI States
  const [showNotifications, setShowNotifications] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Mobile Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(true);

  // Apply dark mode class to html
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.classList.toggle('light', !darkMode);
  }, [darkMode]);

  // Auto-refresh polling
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    if (!user) return;
    refreshTimerRef.current = setInterval(() => {
      setRefreshing(true);
      loadData().finally(() => {
        setRefreshing(false);
        setLastRefresh(new Date());
      });
    }, 30000);
    return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current); };
  }, [user]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    setLastRefresh(new Date());
  };

  // Global search matching all records
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState<{
    customers: Customer[];
    services: Service[];
    invoices: Invoice[];
    servers: ServerType[];
  } | null>(null);

  // Check auth session
  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setUser(data.user);
          // Load data immediately
          loadData();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAuthChecked(true);
    }
  };

  // Fetch all collections
  const loadData = async () => {
    try {
      const res = await Promise.all([
        fetch('/api/admin/customers'),
        fetch('/api/admin/services'),
        fetch('/api/admin/servers'),
        fetch('/api/admin/invoices'),
        fetch('/api/admin/logs'),
        fetch('/api/admin/notifications'),
        fetch('/api/admin/expenses'),
        fetch('/api/admin/domains'),
        fetch('/api/admin/assets'),
        fetch('/api/admin/settings'),
        fetch('/api/admin/providers')
      ]);
      const [c, sv, srv, inv, l, n, ex, dm, as, st, pv] = await Promise.all(res.map(r => r.ok ? r.json() : Promise.resolve([])));
      setCustomers(c);
      setServices(sv);
      setServers(srv);
      setInvoices(inv);
      setLogs(l);
      setNotifications(n);
      setExpenses(ex);
      setDomains(dm);
      setAssets(as);
      setProviders(pv);
      if (st?.currency) setCurrency(st.currency);
    } catch (e) {
      console.error('Error loading collections:', e);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Sync data periodically or when activeTab changes
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [activeTab]);

  // Handle Global Search triggers
  useEffect(() => {
    if (!globalSearch.trim()) {
      setGlobalSearchResults(null);
      return;
    }
    const q = globalSearch.toLowerCase();

    const matchedCustomers = customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.discord && c.discord.toLowerCase().includes(q))
    );

    const matchedServices = services.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        s.planName.toLowerCase().includes(q) ||
        s.ipv4?.includes(q) ||
        s.provider.toLowerCase().includes(q)
    );

    const matchedInvoices = invoices.filter(
      (i) => i.invoiceNumber.toLowerCase().includes(q) || i.transactionId?.toLowerCase().includes(q)
    );

    const matchedServers = servers.filter(
      (s) => s.name.toLowerCase().includes(q) || s.ips.some((ip) => ip.includes(q))
    );

    setGlobalSearchResults({
      customers: matchedCustomers,
      services: matchedServices,
      invoices: matchedInvoices,
      servers: matchedServers
    });
  }, [globalSearch]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Mark specific notification read
  const handleMarkNotificationRead = async (id: string) => {
    try {
      await fetch(`/api/admin/notifications/${id}`, { method: 'PUT' });
      // Update locally
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      await fetch('/api/admin/notifications/all', { method: 'PUT' });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const logAuditAction = async (action: string, details: string) => {
    if (!user) return;
    try {
      await fetch(`/api/admin/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, details })
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center font-mono text-xs text-muted-foreground/70 gap-4">
        <div className="w-12 h-12 bg-blue-950/50 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 shadow-lg animate-pulse-glow">
          <Cpu className="w-6 h-6 animate-spin-slow" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-sm font-bold text-white tracking-widest uppercase">Zyphron Cloud</p>
          <p className="text-[10px] text-muted-foreground/50 tracking-[0.3em] uppercase animate-pulse">Initializing Console...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPortal onLoginSuccess={(u) => { setUser(u); loadData(); }} />;
  }

  const unreadNotifications = notifications.filter((n) => !n.read);
  const unreadCount = unreadNotifications.length;

  return (
    <div className="flex h-screen bg-background text-zinc-100 overflow-hidden font-sans">
      {/* Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setGlobalSearch('');
          setSidebarOpen(false);
        }}
        user={user}
        onLogout={handleLogout}
        unreadNotificationsCount={unreadCount}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Console Container */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header Navbar */}
        <header className="h-16 border-b border-border/50 bg-background/80 backdrop-blur-md px-4 lg:px-8 flex items-center justify-between shrink-0 z-20">
          {/* Header left: Tab Title or Global Search */}
          <div className="flex items-center gap-6 w-96 relative">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground/70" />
              <input
                type="text"
                placeholder="Global Search (Customer name, Invoice, Server IP, Discord...)"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-muted/50 border border-border/80 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:border-blue-500/60 focus:bg-muted transition duration-200"
              />
            </div>
          </div>

          {/* Header right controls */}
          <div className="flex items-center gap-4 relative">
            {/* Live Refresh Indicator */}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 border border-border/60 rounded-lg hover:text-blue-400 transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
                <span>{refreshing ? 'Syncing' : 'Sync'}</span>
              </button>
              <div className="flex items-center gap-1.5 border-l border-border/40 pl-3">
                <span className={`w-1.5 h-1.5 rounded-full ${refreshing ? 'bg-blue-400 animate-pulse' : 'bg-emerald-500 animate-status-ping'}`} />
                <span className="hidden lg:inline">{lastRefresh.toLocaleTimeString()}</span>
              </div>
            </div>
            {/* Notification Bell alerts */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-lg bg-muted/50 border border-border/60 text-muted-foreground hover:text-white transition active:scale-95 cursor-pointer ${
                  unreadCount > 0 ? 'glow-blue-sm' : ''
                }`}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 bg-background border border-border rounded-xl shadow-2xl overflow-hidden z-30">
                  <div className="p-3 bg-muted/60 border-b border-border flex justify-between items-center text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    <span>Notifications ({unreadCount})</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleClearAllNotifications}
                        className="text-blue-400 hover:text-blue-300 font-bold"
                      >
                        Dismiss All
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-border/40 max-h-60 overflow-y-auto text-xs">
                    {notifications.slice(0, 8).map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 space-y-1 transition hover:bg-primary/5 ${
                          !n.read ? 'bg-blue-950/10' : ''
                        }`}
                      >
                        <p className="text-zinc-300 leading-snug">{n.message}</p>
                        <div className="flex justify-between items-center text-[9px] text-muted-foreground/70">
                          <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                          {!n.read && (
                            <button
                              onClick={() => handleMarkNotificationRead(n.id)}
                              className="text-blue-400 font-semibold"
                            >
                              Mark Read
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground/50 text-[10px] font-mono">
                        No notifications generated.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border border-border/60 rounded-lg text-xs font-medium text-zinc-300 hover:text-white transition active:scale-95 cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-700 to-cyan-600 flex items-center justify-center text-[10px] text-white font-bold font-mono">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </div>
                <span>{user.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/70" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-3 w-48 bg-background border border-border rounded-xl shadow-2xl overflow-hidden z-30 divide-y divide-border/40 text-xs text-muted-foreground">
                  <div className="p-3 bg-muted/40">
                    <p className="font-semibold text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-blue-400 font-mono font-bold mt-1 uppercase flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      {user.role}
                    </p>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 hover:bg-red-950/15 hover:text-red-400 rounded-lg flex items-center gap-2 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out Session</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Console Workspace Area */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          {/* Global Search Results Overlay Panel */}
          {globalSearch.trim() && globalSearchResults && (
            <div className="absolute inset-0 bg-background/95 z-30 p-8 overflow-y-auto space-y-6">
              <div className="flex justify-between items-center border-b border-border/50 pb-3">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Global Search Registry Results for &ldquo;{globalSearch}&rdquo;
                </h2>
                <button
                  onClick={() => setGlobalSearch('')}
                  className="text-muted-foreground/70 hover:text-zinc-300 text-xs uppercase font-bold"
                >
                  Close Results
                </button>
              </div>

              {/* Customers result */}
              {globalSearchResults.customers.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest font-mono">Matched Customers</h3>
                  <div className="bg-background border border-border rounded-xl divide-y divide-border/40 text-xs">
                    {globalSearchResults.customers.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setActiveTab('customers');
                          setGlobalSearch('');
                        }}
                        className="p-3 hover:bg-primary/5 cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <span className="font-bold text-white">{c.name}</span>
                          <span className="text-muted-foreground font-mono ml-2">({c.email})</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground/70 font-mono">ID: {c.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Services result */}
              {globalSearchResults.services.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest font-mono">Matched Services</h3>
                  <div className="bg-background border border-border rounded-xl divide-y divide-border/40 text-xs">
                    {globalSearchResults.services.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setActiveTab('services');
                          setGlobalSearch('');
                        }}
                        className="p-3 hover:bg-primary/5 cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <span className="font-bold text-white">{s.planName}</span>
                          <span className="text-blue-400 font-mono ml-2">[{s.type}]</span>
                          <span className="text-muted-foreground font-mono ml-2">IP: {s.ipv4 || 'N/A'}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground/70 font-mono">ID: {s.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoices result */}
              {globalSearchResults.invoices.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest font-mono">Matched Invoices</h3>
                  <div className="bg-background border border-border rounded-xl divide-y divide-border/40 text-xs">
                    {globalSearchResults.invoices.map((inv) => (
                      <div
                        key={inv.id}
                        onClick={() => {
                          setActiveTab('invoices');
                          setGlobalSearch('');
                        }}
                        className="p-3 hover:bg-primary/5 cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <span className="font-bold text-white font-mono">{inv.invoiceNumber}</span>
                          <span className="text-muted-foreground ml-2">Due: {new Date(inv.dueDate).toLocaleDateString()}</span>
                        </div>
                        <span className="font-bold text-emerald-400 font-mono">
                          ${(inv.amount + inv.tax - inv.discount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Servers result */}
              {globalSearchResults.servers.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest font-mono">Matched Host Servers</h3>
                  <div className="bg-background border border-border rounded-xl divide-y divide-border/40 text-xs">
                    {globalSearchResults.servers.map((srv) => (
                      <div
                        key={srv.id}
                        onClick={() => {
                          setActiveTab('servers');
                          setGlobalSearch('');
                        }}
                        className="p-3 hover:bg-primary/5 cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <span className="font-bold text-white">{srv.name}</span>
                          <span className="text-muted-foreground font-mono ml-2">({srv.provider} - {srv.location})</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground/70 font-mono">IPs: {srv.ips.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {globalSearchResults.customers.length === 0 &&
                globalSearchResults.services.length === 0 &&
                globalSearchResults.invoices.length === 0 &&
                globalSearchResults.servers.length === 0 && (
                  <div className="p-10 text-center text-muted-foreground/50 font-mono">
                    No registry match found for global search &ldquo;{globalSearch}&rdquo;.
                  </div>
                )}
            </div>
          )}

          {/* Normal Tab views rendering */}
          {!globalSearch && (
            <>
              {activeTab === 'dashboard' && (
                <OverviewTab
                  customers={customers}
                  services={services}
                  servers={servers}
                  invoices={invoices}
                  logs={logs}
                  notifications={notifications}
                  onMarkNotificationRead={handleMarkNotificationRead}
                  onTabChange={setActiveTab}
                  currency={currency}
                  onCurrencyChange={setCurrency}
                />
              )}

              {activeTab === 'customers' && (
                <CustomersTab userRole={user.role} onLogAction={logAuditAction} currency={currency} />
              )}

              {activeTab === 'services' && (
                <ServicesTab userRole={user.role} onLogAction={logAuditAction} currency={currency} />
              )}

              {activeTab === 'renewals' && (
                <RenewalsTab userRole={user.role} onLogAction={logAuditAction} currency={currency} />
              )}

              {activeTab === 'invoices' && (
                <InvoicesTab userRole={user.role} onLogAction={logAuditAction} currency={currency} />
              )}

              {activeTab === 'servers' && (
                <ServersTab userRole={user.role} onLogAction={logAuditAction} currency={currency} />
              )}

              {activeTab === 'providers' && (
                <ProvidersTab userRole={user.role} onLogAction={logAuditAction} currency={currency} />
              )}

              {activeTab === 'tickets' && (
                <TicketsTab user={user} onLogAction={logAuditAction} customers={customers} />
              )}

              {activeTab === 'reports' && (
                <ReportsTab userRole={user.role} onLogAction={logAuditAction} currency={currency}
                  customers={customers} services={services} invoices={invoices} servers={servers}
                  providers={providers} expenses={expenses} />
              )}

              {activeTab === 'expenses' && (
                <ExpensesTab userRole={user.role} onLogAction={logAuditAction} currency={currency} />
              )}

              {activeTab === 'domains' && (
                <DomainsTab userRole={user.role} onLogAction={logAuditAction} currency={currency} customers={customers} />
              )}

              {activeTab === 'assets' && (
                <AssetsTab userRole={user.role} onLogAction={logAuditAction} currency={currency} />
              )}

              {activeTab === 'calendar' && (
                <CalendarView services={services} invoices={invoices} servers={servers} domains={domains} currency={currency} onNavigate={(tab) => setActiveTab(tab)} />
              )}

              {activeTab === 'kanban' && (
                <KanbanBoard user={user} onLogAction={logAuditAction} />
              )}

              {activeTab === 'paymenter' && (
                <PaymenterTab userRole={user.role} onLogAction={logAuditAction} currency={currency} customers={customers} />
              )}

              {activeTab === 'pterodactyl' && (
                <PterodactylTab userRole={user.role} onLogAction={logAuditAction} />
              )}

              {activeTab === 'pricing' && <PricingTab />}
              {activeTab === 'api' && <ApiConsole />}

              {activeTab === 'records' && (
                <RecordsTab customers={customers} services={services} invoices={invoices} currency={currency} onRefresh={() => loadData()} />
              )}

              {activeTab === 'logs' && <LogsTab logs={logs} />}

              {activeTab === 'settings' && (
                <SettingsTab userRole={user.role} onLogAction={logAuditAction} />
              )}
            </>
          )}
        </div>
      </main>
      <AIAssistant />
    </div>
  );
}
