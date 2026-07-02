'use client';

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  Users,
  Layers,
  Wallet,
  Calendar,
  AlertTriangle,
  Server,
  Clock,
  UserCheck,
  HardDrive,
  PlusCircle,
  FileText,
  MessageSquare,
  BarChart3,
  Database,
  Settings
} from 'lucide-react';
import { Customer, Service, Server as ServerType, ActivityLog, Invoice } from '@/lib/db';
import AIInsights from '@/components/AIInsights';

interface OverviewTabProps {
  customers: Customer[];
  services: Service[];
  servers: ServerType[];
  invoices: Invoice[];
  logs: ActivityLog[];
  notifications: any[];
  onMarkNotificationRead: (id: string) => void;
  onTabChange: (tab: string) => void;
  currency: string;
  onCurrencyChange: (c: string) => void;
}

export default function OverviewTab({
  customers,
  services,
  servers,
  invoices,
  logs,
  notifications,
  onMarkNotificationRead,
  onTabChange,
  currency,
  onCurrencyChange
}: OverviewTabProps) {
  const symbol = currency === 'INR' ? '\u20B9' : '$';

  const totalCustomers = customers.length;
  const activeServices = services.filter((s) => s.status === 'Active').length;
  const suspendedServices = services.filter((s) => s.status === 'Suspended').length;
  const expiredServices = services.filter((s) => s.status === 'Expired').length;
  const unpaidInvoices = invoices.filter((i) => i.status === 'Pending').length;

  const monthlyRevenue = services
    .filter((s) => s.status === 'Active')
    .reduce((acc, s) => {
      let price = s.sellingPrice;
      if (s.billingCycle === 'Weekly') price *= 4;
      else if (s.billingCycle === 'Quarterly') price /= 3;
      else if (s.billingCycle === 'Semi-Annual') price /= 6;
      else if (s.billingCycle === 'Annual') price /= 12;
      return acc + price;
    }, 0);

  const vpsCount = services.filter((s) => s.type === 'VPS' || s.type === 'VDS').length;
  const gameCount = services.filter((s) => s.type.toLowerCase().includes('hosting') || ['cs2', 'rust', 'ark', 'palworld'].includes(s.type.toLowerCase())).length;
  const dedicatedCount = services.filter((s) => s.type === 'Dedicated Server').length;

  // Real monthly revenue from paid invoices (last 6 months)
  const revenueHistory = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('default', { month: 'short' });
      const y = d.getFullYear();
      const m = d.getMonth();
      const total = invoices
        .filter((inv) => {
          if (inv.status !== 'Paid' && inv.status !== 'paid') return false;
          const pd = new Date(inv.paidDate || inv.issueDate);
          return pd.getFullYear() === y && pd.getMonth() === m;
        })
        .reduce((sum, inv) => sum + (inv.amount || 0), 0);
      months.push({ month: label, val: total || 0 });
    }
    if (months.length > 0) months[months.length - 1].val = Math.max(months[months.length - 1].val, monthlyRevenue);
    return months;
  }, [invoices, monthlyRevenue]);

  const maxRevenue = Math.max(...revenueHistory.map((d) => d.val), 1) * 1.15;
  const chartHeight = 160;
  const chartWidth = 500;

  const points = revenueHistory
    .map((d, i) => {
      const x = (i / (revenueHistory.length - 1)) * chartWidth;
      const y = chartHeight - (d.val / maxRevenue) * chartHeight;
      return `${x},${y}`;
    })
    .join(' ');
  const closedAreaPoints = `0,${chartHeight} ${points} ${chartWidth},${chartHeight}`;

  // Real growth %
  const growthPercent = useMemo(() => {
    if (revenueHistory.length < 2) return 0;
    const prev = revenueHistory[revenueHistory.length - 2].val || 0;
    const curr = revenueHistory[revenueHistory.length - 1].val || 0;
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  }, [revenueHistory]);

  const fmt = (n: number) => symbol + n.toFixed(2);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  const getRenewalsForDay = (day: number) =>
    services.filter((s) => {
      const rd = new Date(s.nextRenewalDate);
      return rd.getFullYear() === currentYear && rd.getMonth() === currentMonth && rd.getDate() === day;
    });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Console Overview</h1>
          <p className="text-xs text-muted-foreground/70">Live indicators, service renewals, and hardware capacities.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-background border border-border rounded-lg text-[10px] text-muted-foreground font-mono">
            <Clock className="w-3.5 h-3.5 text-blue-400 animate-spin" style={{ animationDuration: '60s' }} />
            <span>System Status: <span className="text-emerald-400 font-semibold">Online</span></span>
          </div>
          <div className="flex rounded-lg border border-border overflow-hidden text-[11px] font-bold">
            <button onClick={() => onCurrencyChange('USD')} className={`px-3 py-1.5 transition cursor-pointer ${currency === 'USD' ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground hover:text-white'}`}>USD</button>
            <button onClick={() => onCurrencyChange('INR')} className={`px-3 py-1.5 transition cursor-pointer ${currency === 'INR' ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground hover:text-white'}`}>INR</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Customers', icon: Users, value: totalCustomers, sub: growthPercent >= 0 ? `+${growthPercent}% vs last month` : `${growthPercent}% vs last month`, subColor: growthPercent >= 0 ? 'text-emerald-400' : 'text-red-400' },
          { label: 'Active Services', icon: Layers, value: activeServices, sub: `${suspendedServices} Suspended \u2022 ${expiredServices} Expired`, subColor: 'text-muted-foreground/70' },
          { label: 'Monthly Revenue', icon: Wallet, value: fmt(monthlyRevenue), sub: 'MRR (Projected active)', subColor: 'text-blue-400' },
          { label: 'Unpaid Invoices', icon: Clock, value: unpaidInvoices, sub: 'Action required on renewals', subColor: 'text-red-400' },
        ].map((card, i) => (
          <div key={i} className="bg-background/80 border border-border rounded-xl p-4 relative overflow-hidden group hover:border-blue-500/20 transition duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">{card.label}</span>
              <span className="p-1.5 bg-blue-950/40 border border-blue-500/20 rounded-lg text-blue-400">
                <card.icon className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-bold text-white leading-none">{card.value}</h3>
              <p className={`text-[10px] font-medium flex items-center gap-1 mt-2 ${card.subColor}`}>
                {i === 0 && <TrendingUp className="w-3.5 h-3.5" />}
                {card.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Server, label: 'VPS & VDS Nodes', value: `${vpsCount} Active` },
          { icon: Layers, label: 'Game Servers', value: `${gameCount} Hosted` },
          { icon: HardDrive, label: 'Dedicated Nodes', value: `${dedicatedCount} Rented` },
        ].map((row, i) => (
          <div key={i} className="bg-background/30 border border-border/50 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <row.icon className="w-4 h-4 text-blue-400" />
              <span className="text-[11px] text-muted-foreground font-medium">{row.label}</span>
            </div>
            <span className="text-xs font-bold text-white">{row.value}</span>
          </div>
        ))}
      </div>

      {notifications.filter((n) => !n.read).length > 0 && (
        <div className="bg-background border border-amber-500/20 rounded-xl overflow-hidden shadow-lg">
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 text-xs font-bold text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            System Control Panel Warnings
          </div>
          <div className="divide-y divide-border/40">
            {notifications.filter((n) => !n.read).slice(0, 3).map((n) => (
              <div key={n.id} className="p-3 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0" />
                  <span>{n.message}</span>
                </div>
                <button onClick={() => onMarkNotificationRead(n.id)} className="text-[10px] text-muted-foreground/70 hover:text-blue-400 font-medium cursor-pointer">
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-background border border-border rounded-xl p-5 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Revenue Analytics</h3>
              <p className="text-[10px] text-muted-foreground/70">6-Month operational turnover curve.</p>
            </div>
            <span className="text-xs text-blue-400 font-semibold font-mono bg-blue-950/20 px-2 py-1 rounded border border-blue-800/20">
              Total MRR: {fmt(monthlyRevenue)}
            </span>
          </div>

          <div className="relative w-full h-[180px] mt-4 flex items-end">
            <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="0" y1={chartHeight * 0.25} x2={chartWidth} y2={chartHeight * 0.25} stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="3" strokeOpacity="0.3" />
              <line x1="0" y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="3" strokeOpacity="0.3" />
              <line x1="0" y1={chartHeight * 0.75} x2={chartWidth} y2={chartHeight * 0.75} stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="3" strokeOpacity="0.3" />
              <polygon points={closedAreaPoints} fill="url(#rev-grad)" />
              <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="2.5" />
              {revenueHistory.map((d, i) => {
                const x = (i / (revenueHistory.length - 1)) * chartWidth;
                const y = chartHeight - (d.val / maxRevenue) * chartHeight;
                return (
                  <g key={i} className="cursor-pointer">
                    <title>{d.month}: {fmt(d.val)}</title>
                    <circle cx={x} cy={y} r="4" fill="#3b82f6" stroke="#0c0a12" strokeWidth="1.5" />
                  </g>
                );
              })}
            </svg>
            <div className="absolute left-2 top-0 text-[8px] font-mono text-muted-foreground/70 uppercase tracking-widest flex flex-col gap-10">
              <span>{symbol}{Math.round(maxRevenue)}</span>
              <span>{symbol}{Math.round(maxRevenue / 2)}</span>
              <span>{symbol}0</span>
            </div>
          </div>

          <div className="flex justify-between items-center mt-2 px-2 border-t border-border/50 pt-2 text-[9px] font-mono text-muted-foreground/70 uppercase tracking-widest">
            {revenueHistory.map((d, i) => (
              <span key={i}>{d.month}</span>
            ))}
          </div>
        </div>

        <div className="bg-background border border-border rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Renewal Schedules</h3>
              <Calendar className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-[10px] text-muted-foreground/70 mb-4">Upcoming billing terms for {today.toLocaleString('default', { month: 'long', year: 'numeric' })}.</p>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground font-mono mb-2 font-semibold">
              <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`e-${i}`} className="aspect-square" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dailyRenewals = getRenewalsForDay(day);
                const hasRenewal = dailyRenewals.length > 0;
                const isToday = day === today.getDate();
                return (
                  <div
                    key={`d-${day}`}
                    title={hasRenewal ? `${dailyRenewals.length} renewals scheduled` : undefined}
                    className={`aspect-square flex flex-col items-center justify-center rounded-lg border text-[10px] relative cursor-pointer ${
                      isToday
                        ? 'border-blue-600 bg-blue-950/20 text-white font-bold'
                        : hasRenewal
                        ? 'border-border bg-blue-950/5 text-blue-300'
                        : 'border-transparent text-muted-foreground/70 hover:bg-zinc-900/40'
                    }`}
                  >
                    <span>{day}</span>
                    {hasRenewal && <span className="absolute bottom-1 w-1 h-1 bg-blue-500 rounded-full" />}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border/50">
            <button onClick={() => onTabChange('renewals')} className="w-full py-2 bg-muted hover:bg-blue-950/20 border border-border hover:border-blue-800/30 text-white text-[10px] font-semibold tracking-wider uppercase rounded-lg transition cursor-pointer">
              Open Renewal Manager
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-background border border-border rounded-xl p-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Hardware Utilization Dashboard</h3>
          <div className="space-y-4">
            {servers.slice(0, 3).map((srv) => {
              const activeOnServer = services.filter((s) => s.serverId === srv.id && s.status === 'Active');
              let allocatedRam = 0, allocatedCores = 0;
              activeOnServer.forEach((s) => {
                const rm = s.ram.match(/(\d+)/); if (rm) allocatedRam += parseInt(rm[1]);
                const cm = s.cpu.match(/(\d+)/); if (cm) allocatedCores += parseInt(cm[1]);
              });
              const ramPct = Math.min(100, Math.round((allocatedRam / Math.max(srv.ram, 1)) * 100));
              const cpuPct = Math.min(100, Math.round((allocatedCores / Math.max(srv.cpu, 1)) * 100));
              return (
                <div key={srv.id} className="p-4 bg-[#110e20]/50 border border-border/40 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Server className="w-3.5 h-3.5 text-blue-400" />{srv.name} ({srv.provider} - {srv.location})
                    </span>
                    <span className="text-[10px] text-muted-foreground/70 font-mono">{activeOnServer.length} Container Services</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
                        <span>Memory (RAM)</span>
                        <span>{allocatedRam} GB / {srv.ram} GB ({ramPct}%)</span>
                      </div>
                      <div className="h-1.5 bg-background rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${ramPct > 90 ? 'bg-red-500' : ramPct > 70 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${ramPct}%` }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
                        <span>CPU Compute Cores</span>
                        <span>{allocatedCores} / {srv.cpu} Cores ({cpuPct}%)</span>
                      </div>
                      <div className="h-1.5 bg-background rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${cpuPct > 90 ? 'bg-red-500' : cpuPct > 70 ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${cpuPct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-background border border-border rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Operations Audit Feed</h3>
            <div className="space-y-4">
              {logs.slice(0, 4).map((log) => (
                <div key={log.id} className="text-xs flex gap-3 relative pb-1">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-6 h-6 rounded-full bg-blue-950/40 border border-blue-500/20 flex items-center justify-center text-[10px] text-blue-400">
                      <UserCheck className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-white">{log.staffName}</span>
                      <span className="text-[10px] text-muted-foreground/70">\u2022 {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-muted-foreground mt-1 leading-snug">{log.details}</p>
                    <span className="text-[9px] font-mono text-blue-400 bg-blue-950/20 px-1 py-0.5 rounded border border-blue-900/10 mt-1.5 inline-block uppercase">{log.action}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-border/50">
            <button onClick={() => onTabChange('logs')} className="w-full py-2 bg-muted hover:bg-blue-950/20 border border-border hover:border-blue-800/30 text-white text-[10px] font-semibold tracking-wider uppercase rounded-lg transition cursor-pointer">
              View Full Logs
            </button>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <AIInsights />

      {/* Quick Action Cards */}
      <div className="bg-background border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <PlusCircle className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Add Customer', icon: Users, tab: 'customers', desc: 'New client record' },
            { label: 'Create Invoice', icon: FileText, tab: 'invoices', desc: 'Generate a bill' },
            { label: 'New Ticket', icon: MessageSquare, tab: 'tickets', desc: 'Support request' },
            { label: 'View Reports', icon: BarChart3, tab: 'reports', desc: 'Analytics & metrics' },
            { label: 'Master Records', icon: Database, tab: 'records', desc: 'Joined data view' },
            { label: 'Settings', icon: Settings, tab: 'settings', desc: 'System config' },
          ].map((action, i) => (
            <button key={i} onClick={() => onTabChange(action.tab)}
              className="flex flex-col items-center gap-2 p-4 bg-muted hover:bg-blue-950/10 border border-border hover:border-blue-800/30 rounded-xl text-center transition cursor-pointer group">
              <div className="w-9 h-9 rounded-lg bg-blue-950/40 border border-blue-800/30 flex items-center justify-center text-blue-400 group-hover:border-blue-600/50 transition">
                <action.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">{action.label}</p>
                <p className="text-[9px] text-muted-foreground/70 font-mono mt-0.5">{action.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
