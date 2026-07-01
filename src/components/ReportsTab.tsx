'use client';

import React, { useMemo, useState } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Users, Layers, Calendar,
  Download, FileText, Table, RefreshCw
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Customer, Service, Invoice, Server as ServerType, ProviderRecord, Expense } from '@/lib/db';

interface ReportsTabProps {
  userRole: string;
  onLogAction: (action: string, details: string) => void;
  currency?: string;
  customers: Customer[];
  services: Service[];
  invoices: Invoice[];
  servers: ServerType[];
  providers: ProviderRecord[];
  expenses: Expense[];
}

type ReportId = 'revenue' | 'expenses' | 'profit' | 'renewals' | 'growth' | 'services' | 'costs' | 'monthly';

export default function ReportsTab({ userRole, onLogAction, currency = 'USD', customers, services, invoices, servers, providers, expenses }: ReportsTabProps) {
  const sym = currency === 'INR' ? '\u20B9' : '$';
  const [activeReport, setActiveReport] = useState<ReportId>('revenue');

  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount + i.tax, 0);
  const pendingRevenue = invoices.filter(i => i.status === 'Pending').reduce((sum, i) => sum + i.amount + i.tax, 0);

  const serverCost = servers.reduce((sum, s) => sum + s.monthlyCost, 0);
  const providerCost = providers.reduce((sum, p) => sum + p.monthlyCost, 0);
  const oneTimeExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalExpenses = serverCost + providerCost + oneTimeExpenses;

  const totalProfit = services.filter(s => s.status === 'Active').reduce((sum, s) => sum + (s.sellingPrice - s.purchaseCost), 0);
  const monthlyProfit = services.filter(s => s.status === 'Active').reduce((acc, s) => {
    let profit = s.sellingPrice - s.purchaseCost;
    if (s.billingCycle === 'Weekly') profit *= 4;
    else if (s.billingCycle === 'Quarterly') profit /= 3;
    else if (s.billingCycle === 'Semi-Annual') profit /= 6;
    else if (s.billingCycle === 'Annual') profit /= 12;
    return acc + profit;
  }, 0);

  const activeCustomers = customers.filter(c => c.status === 'Active').length;
  const newThisMonth = customers.filter(c => {
    const d = new Date(c.joinDate);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = new Date().getMonth();

  const revenueByMonth = months.map((_, idx) =>
    invoices.filter(i => i.status === 'Paid' && new Date(i.paidDate || i.issueDate).getMonth() === idx)
      .reduce((sum, i) => sum + i.amount + i.tax, 0)
  );

  const expenseByMonth = months.map((_, idx) => {
    let total = 0;
    servers.forEach(s => { if (new Date(s.renewalDate).getMonth() === idx) total += s.monthlyCost; });
    providers.forEach(p => { if (new Date(p.renewalDate).getMonth() === idx) total += p.monthlyCost; });
    expenses.forEach(e => { if (new Date(e.date).getMonth() === idx) total += e.amount; });
    return total;
  });

  const growthByMonth = months.map((_, idx) =>
    customers.filter(c => new Date(c.joinDate).getMonth() === idx).length
  );

  const maxRev = Math.max(...revenueByMonth, 1);
  const maxExp = Math.max(...expenseByMonth, 1);
  const maxGrowth = Math.max(...growthByMonth, 1);
  const chartHeight = 160;
  const chartWidth = 500;

  const buildPolyline = (data: number[], max: number) =>
    data.map((v, i) => {
      const x = (i / (data.length - 1 || 1)) * chartWidth;
      const y = chartHeight - (v / max) * chartHeight;
      return `${x},${y}`;
    }).join(' ');

  const buildArea = (data: number[], max: number) =>
    `0,${chartHeight} ${buildPolyline(data, max)} ${chartWidth},${chartHeight}`;

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFillColor(12, 10, 18);
    doc.rect(0, 0, 210, 45, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(157, 78, 221);
    doc.text('ZYPHRON CLOUD', 15, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 156, 176);
    doc.text('Financial Report', 15, 28);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 15, 34);

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(12);
    doc.text('Revenue Summary', 15, 55);
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Total Revenue: ${sym}${totalRevenue.toFixed(2)}`, 15, 63);
    doc.text(`Pending Revenue: ${sym}${pendingRevenue.toFixed(2)}`, 15, 69);
    doc.text(`Monthly Expenses: ${sym}${totalExpenses.toFixed(2)}`, 15, 75);
    doc.text(`Monthly Profit: ${sym}${monthlyProfit.toFixed(2)}`, 15, 81);
    doc.text(`Active Customers: ${activeCustomers}`, 15, 87);
    doc.text(`Active Services: ${services.filter(s => s.status === 'Active').length}`, 15, 93);

    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    doc.text('Zyphron Cloud Solutions - Automated Report', 15, 270);
    doc.text(`Report ID: ZCMS-${Date.now()}`, 15, 275);
    doc.save(`ZCMS_Report_${Date.now()}.pdf`);
    onLogAction('Report Exported', 'Generated and exported PDF financial report.');
  };

  const exportCSV = () => {
    const headers = 'Report Type,Metric,Value\n';
    const rows = [
      `Revenue,Total Revenue,${sym}${totalRevenue.toFixed(2)}`,
      `Revenue,Pending Revenue,${sym}${pendingRevenue.toFixed(2)}`,
      `Expenses,Server Costs,${sym}${serverCost.toFixed(2)}`,
      `Expenses,Provider Costs,${sym}${providerCost.toFixed(2)}`,
      `Expenses,One-Time Expenses,${sym}${oneTimeExpenses.toFixed(2)}`,
      `Expenses,Total,${sym}${totalExpenses.toFixed(2)}`,
      `Profit,Monthly Profit,${sym}${monthlyProfit.toFixed(2)}`,
      `Customers,Active,${activeCustomers}`,
      `Customers,New This Month,${newThisMonth}`,
      `Services,Active,${services.filter(s => s.status === 'Active').length}`,
      `Services,Suspended,${services.filter(s => s.status === 'Suspended').length}`,
      `Services,Expired,${services.filter(s => s.status === 'Expired').length}`,
    ];
    const blob = new Blob([headers + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ZCMS_Report_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onLogAction('Report Exported', 'Exported CSV report data.');
  };

  const Chart = ({ data, max, color }: { data: number[]; max: number; color: string }) => (
    <div className="relative w-full h-[200px]">
      <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1={chartHeight * 0.25} x2={chartWidth} y2={chartHeight * 0.25} stroke="#241d3b" strokeWidth="0.5" strokeDasharray="3" />
        <line x1="0" y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} stroke="#241d3b" strokeWidth="0.5" strokeDasharray="3" />
        <line x1="0" y1={chartHeight * 0.75} x2={chartWidth} y2={chartHeight * 0.75} stroke="#241d3b" strokeWidth="0.5" strokeDasharray="3" />
        <polygon points={buildArea(data, max)} fill={`url(#grad-${color})`} />
        <polyline points={buildPolyline(data, max)} fill="none" stroke={color} strokeWidth="2.5" />
        {data.map((v, i) => {
          const x = (i / (data.length - 1 || 1)) * chartWidth;
          const y = chartHeight - (v / max) * chartHeight;
          return <circle key={i} cx={x} cy={y} r="4" fill={color} stroke="#0c0a12" strokeWidth="1.5" />;
        })}
      </svg>
    </div>
  );

  const reportTypes: { id: ReportId; label: string; icon: any }[] = [
    { id: 'revenue', label: 'Revenue', icon: DollarSign },
    { id: 'expenses', label: 'Expenses', icon: TrendingDown },
    { id: 'profit', label: 'Profit', icon: TrendingUp },
    { id: 'renewals', label: 'Renewals', icon: Calendar },
    { id: 'growth', label: 'Growth', icon: Users },
    { id: 'services', label: 'Services', icon: Layers },
    { id: 'costs', label: 'Cost Breakdown', icon: Table },
    { id: 'monthly', label: 'Monthly Summary', icon: RefreshCw },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Reports & Analytics</h1>
          <p className="text-xs text-muted-foreground/70">Revenue, expenses, profit analysis with export capabilities.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportPDF} className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-blue-950/20 border border-border hover:border-blue-800/30 rounded-lg text-xs font-semibold text-zinc-300 transition cursor-pointer">
            <FileText className="w-4 h-4 text-blue-400" /> <span>PDF</span>
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-blue-950/20 border border-border hover:border-blue-800/30 rounded-lg text-xs font-semibold text-zinc-300 transition cursor-pointer">
            <Table className="w-4 h-4 text-blue-400" /> <span>CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-background/80 border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-3">
            <DollarSign className="w-4 h-4 text-emerald-400" /> Total Revenue
          </div>
          <p className="text-xl font-bold text-white">{sym}{totalRevenue.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">All time paid invoices</p>
        </div>
        <div className="bg-background/80 border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-3">
            <TrendingDown className="w-4 h-4 text-red-400" /> Monthly Expenses
          </div>
          <p className="text-xl font-bold text-white">{sym}{totalExpenses.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">Servers + Providers + Misc</p>
        </div>
        <div className="bg-background/80 border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-3">
            <TrendingUp className="w-4 h-4 text-blue-400" /> Monthly Profit
          </div>
          <p className="text-xl font-bold text-white">{sym}{monthlyProfit.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">MRR after costs</p>
        </div>
        <div className="bg-background/80 border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-3">
            <Users className="w-4 h-4 text-blue-400" /> Customer Growth
          </div>
          <p className="text-xl font-bold text-white">+{newThisMonth}</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">New this month</p>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex gap-2 flex-wrap">
        {reportTypes.map(rt => (
          <button key={rt.id} onClick={() => setActiveReport(rt.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeReport === rt.id
                ? 'bg-blue-950/45 text-blue-300 border border-blue-800/30'
                : 'bg-muted text-muted-foreground border border-border hover:text-zinc-200'
            }`}>
            <rt.icon className="w-4 h-4" /> {rt.label}
          </button>
        ))}
      </div>

      {/* Report Content */}
      <div className="bg-background border border-border rounded-2xl p-6">
        {/* Revenue Report */}
        {activeReport === 'revenue' && (
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Revenue Analytics</h3>
            <Chart data={revenueByMonth} max={maxRev} color="#9d4edd" />
            <div className="flex justify-between px-2 text-[9px] font-mono text-muted-foreground/70 uppercase tracking-widest">
              {months.map((m, i) => <span key={i}>{m}</span>)}
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
              <div className="p-3 bg-[#110e20] rounded-lg border border-border/30">
                <p className="text-[9px] text-muted-foreground/70 uppercase">Total Revenue</p>
                <p className="text-lg font-bold text-emerald-400">{sym}{totalRevenue.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-[#110e20] rounded-lg border border-border/30">
                <p className="text-[9px] text-muted-foreground/70 uppercase">Pending</p>
                <p className="text-lg font-bold text-amber-400">{sym}{pendingRevenue.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-[#110e20] rounded-lg border border-border/30">
                <p className="text-[9px] text-muted-foreground/70 uppercase">Monthly Avg</p>
                <p className="text-lg font-bold text-white">{sym}{(totalRevenue / Math.max(1, currentMonth + 1)).toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Expenses Report */}
        {activeReport === 'expenses' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Expense Breakdown</h3>
            <Chart data={expenseByMonth} max={maxExp} color="#ef4444" />
            <div className="flex justify-between px-2 text-[9px] font-mono text-muted-foreground/70 uppercase tracking-widest">
              {months.map((m, i) => <span key={i}>{m}</span>)}
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
              <div className="p-3 bg-[#110e20] rounded-lg border border-border/30">
                <p className="text-[9px] text-muted-foreground/70 uppercase">Server Costs</p>
                <p className="text-lg font-bold text-red-400">{sym}{serverCost.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-[#110e20] rounded-lg border border-border/30">
                <p className="text-[9px] text-muted-foreground/70 uppercase">Provider Costs</p>
                <p className="text-lg font-bold text-orange-400">{sym}{providerCost.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-[#110e20] rounded-lg border border-border/30">
                <p className="text-[9px] text-muted-foreground/70 uppercase">One-Time Expenses</p>
                <p className="text-lg font-bold text-amber-400">{sym}{oneTimeExpenses.toFixed(2)}</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">Servers</h4>
              {servers.map(srv => (
                <div key={srv.id} className="flex justify-between items-center p-3 bg-[#110e20] rounded-lg border border-border/30">
                  <div>
                    <p className="text-xs font-semibold text-white">{srv.name}</p>
                    <p className="text-[10px] text-muted-foreground/70">{srv.provider} - {srv.location}</p>
                  </div>
                  <p className="text-xs font-mono font-bold text-red-400">{sym}{srv.monthlyCost.toFixed(2)}/mo</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">One-Time Expenses</h4>
              {expenses.map(e => (
                <div key={e.id} className="flex justify-between items-center p-3 bg-[#110e20] rounded-lg border border-border/30">
                  <div>
                    <p className="text-xs font-semibold text-white">{e.description}</p>
                    <p className="text-[10px] text-muted-foreground/70">{e.vendor} - {e.category} - {new Date(e.date).toLocaleDateString()}</p>
                  </div>
                  <p className="text-xs font-mono font-bold text-amber-400">{sym}{e.amount.toFixed(2)}</p>
                </div>
              ))}
              {expenses.length === 0 && <p className="text-xs text-muted-foreground/50 p-3">No expenses recorded.</p>}
            </div>
          </div>
        )}

        {/* Profit Report */}
        {activeReport === 'profit' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Profit Analysis</h3>
            {/* Combined revenue vs expense chart */}
            <div className="relative w-full h-[200px]">
              <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                <line x1="0" y1={chartHeight * 0.25} x2={chartWidth} y2={chartHeight * 0.25} stroke="#241d3b" strokeWidth="0.5" strokeDasharray="3" />
                <line x1="0" y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} stroke="#241d3b" strokeWidth="0.5" strokeDasharray="3" />
                <line x1="0" y1={chartHeight * 0.75} x2={chartWidth} y2={chartHeight * 0.75} stroke="#241d3b" strokeWidth="0.5" strokeDasharray="3" />
                <polyline points={buildPolyline(revenueByMonth, Math.max(maxRev, maxExp))} fill="none" stroke="#22c55e" strokeWidth="2" />
                <polyline points={buildPolyline(expenseByMonth, Math.max(maxRev, maxExp))} fill="none" stroke="#ef4444" strokeWidth="2" />
                {revenueByMonth.map((v, i) => {
                  const x = (i / (revenueByMonth.length - 1 || 1)) * chartWidth;
                  const y = chartHeight - (v / Math.max(maxRev, maxExp)) * chartHeight;
                  return <circle key={`r${i}`} cx={x} cy={y} r="3" fill="#22c55e" stroke="#0c0a12" strokeWidth="1.5" />;
                })}
                {expenseByMonth.map((v, i) => {
                  const x = (i / (expenseByMonth.length - 1 || 1)) * chartWidth;
                  const y = chartHeight - (v / Math.max(maxRev, maxExp)) * chartHeight;
                  return <circle key={`e${i}`} cx={x} cy={y} r="3" fill="#ef4444" stroke="#0c0a12" strokeWidth="1.5" />;
                })}
              </svg>
            </div>
            <div className="flex justify-center gap-6 text-[10px] font-mono">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-400 inline-block" /> Revenue</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400 inline-block" /> Expenses</span>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
              <div className="p-4 bg-[#110e20] rounded-lg border border-border/30">
                <p className="text-[9px] text-muted-foreground/70 uppercase">Monthly Revenue</p>
                <p className="text-lg font-bold text-emerald-400">{sym}{(monthlyProfit + totalExpenses).toFixed(2)}</p>
              </div>
              <div className="p-4 bg-[#110e20] rounded-lg border border-border/30">
                <p className="text-[9px] text-muted-foreground/70 uppercase">Monthly Costs</p>
                <p className="text-lg font-bold text-red-400">-{sym}{totalExpenses.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-[#110e20] rounded-lg border border-blue-800/30">
                <p className="text-[9px] text-muted-foreground/70 uppercase">Net Monthly Profit</p>
                <p className="text-lg font-bold text-blue-400">{sym}{monthlyProfit.toFixed(2)}</p>
              </div>
            </div>
            <div className="p-4 bg-emerald-950/10 border border-emerald-800/20 rounded-xl">
              <p className="text-xs text-muted-foreground">
                Profit Margin: <span className="text-emerald-400 font-bold">
                  {monthlyProfit > 0 ? ((monthlyProfit / (monthlyProfit + totalExpenses)) * 100).toFixed(1) : 0}%
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Renewals Report */}
        {activeReport === 'renewals' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Upcoming Renewals</h3>
            <div className="space-y-3">
              {services.filter(s => s.status !== 'Terminated')
                .sort((a, b) => new Date(a.nextRenewalDate).getTime() - new Date(b.nextRenewalDate).getTime())
                .slice(0, 20)
                .map(s => {
                  const daysLeft = Math.ceil((new Date(s.nextRenewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={s.id} className="flex justify-between items-center p-3 bg-[#110e20] rounded-lg border border-border/30">
                      <div>
                        <p className="text-xs font-semibold text-white">{s.planName}</p>
                        <p className="text-[10px] text-muted-foreground/70">{s.type} • {s.customerId}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-mono font-bold ${daysLeft > 15 ? 'text-emerald-400' : daysLeft > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                          {daysLeft > 0 ? `${daysLeft}d` : 'OVERDUE'}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70">{sym}{s.sellingPrice.toFixed(2)}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Growth Report */}
        {activeReport === 'growth' && (
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Customer Growth</h3>
            <Chart data={growthByMonth} max={maxGrowth} color="#3b82f6" />
            <div className="flex justify-between px-2 text-[9px] font-mono text-muted-foreground/70 uppercase tracking-widest">
              {months.map((m, i) => <span key={i}>{m}</span>)}
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
              <div className="p-3 bg-[#110e20] rounded-lg border border-border/30">
                <p className="text-[9px] text-muted-foreground/70 uppercase">Total Customers</p>
                <p className="text-lg font-bold text-white">{customers.length}</p>
              </div>
              <div className="p-3 bg-[#110e20] rounded-lg border border-border/30">
                <p className="text-[9px] text-muted-foreground/70 uppercase">Active</p>
                <p className="text-lg font-bold text-emerald-400">{activeCustomers}</p>
              </div>
              <div className="p-3 bg-[#110e20] rounded-lg border border-border/30">
                <p className="text-[9px] text-muted-foreground/70 uppercase">New This Month</p>
                <p className="text-lg font-bold text-blue-400">{newThisMonth}</p>
              </div>
            </div>
          </div>
        )}

        {/* Services Report */}
        {activeReport === 'services' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Service Distribution</h3>
            <div className="space-y-3">
              {['VPS', 'Dedicated Server', 'Minecraft Hosting', 'FiveM Hosting', 'Bot Hosting', 'Web Hosting', 'Other'].map(type => {
                const count = services.filter(s => {
                  if (type === 'Other') return !['VPS', 'Dedicated Server', 'Minecraft Hosting', 'FiveM Hosting', 'Bot Hosting', 'Web Hosting'].includes(s.type);
                  return s.type === type;
                }).length;
                if (count === 0 && type !== 'VPS') return null;
                const percent = services.length > 0 ? (count / services.length) * 100 : 0;
                return (
                  <div key={type} className="flex items-center gap-4 p-3 bg-[#110e20] rounded-lg border border-border/30">
                    <div className="w-24 shrink-0">
                      <p className="text-xs font-semibold text-white">{type}</p>
                    </div>
                    <div className="flex-1 h-2 bg-background rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${percent}%` }} />
                    </div>
                    <p className="text-xs font-mono text-muted-foreground w-16 text-right">{count} ({percent.toFixed(0)}%)</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cost Breakdown Report */}
        {activeReport === 'costs' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Provider Cost Analysis</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                    <th className="p-3">Provider</th>
                    <th className="p-3">Servers</th>
                    <th className="p-3">Monthly Cost</th>
                    <th className="p-3">Renewal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-xs">
                  {providers.map(p => {
                    const serverCount = servers.filter(s => s.provider === p.name).length;
                    return (
                      <tr key={p.id} className="hover:bg-primary/5">
                        <td className="p-3 font-semibold text-white">{p.name}</td>
                        <td className="p-3 text-muted-foreground">{serverCount}</td>
                        <td className="p-3 font-mono text-red-400 font-bold">{sym}{p.monthlyCost.toFixed(2)}</td>
                        <td className="p-3 font-mono text-muted-foreground">{new Date(p.renewalDate).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-[#110e20] rounded-lg border border-border/30 flex justify-between">
              <span className="text-xs text-muted-foreground">Total Provider Costs:</span>
              <span className="text-xs font-bold text-red-400">{sym}{providerCost.toFixed(2)}/mo</span>
            </div>
          </div>
        )}

        {/* Monthly Summary Report */}
        {activeReport === 'monthly' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Monthly Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                    <th className="p-3">Month</th>
                    <th className="p-3 text-right">Revenue</th>
                    <th className="p-3 text-right">Expenses</th>
                    <th className="p-3 text-right">Net</th>
                    <th className="p-3 text-right">New Customers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-xs">
                  {months.map((m, i) => {
                    const rev = revenueByMonth[i];
                    const exp = expenseByMonth[i];
                    const net = rev - exp;
                    const cust = growthByMonth[i];
                    if (rev === 0 && exp === 0 && cust === 0) return null;
                    return (
                      <tr key={i} className="hover:bg-primary/5">
                        <td className="p-3 font-semibold text-white">{m}</td>
                        <td className="p-3 text-right font-mono text-emerald-400">{sym}{rev.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono text-red-400">{sym}{exp.toFixed(2)}</td>
                        <td className={`p-3 text-right font-mono font-bold ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {net >= 0 ? '+' : ''}{sym}{net.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono text-blue-400">+{cust}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-muted/20 text-xs font-bold">
                    <td className="p-3 text-white">Totals</td>
                    <td className="p-3 text-right text-emerald-400 font-mono">{sym}{revenueByMonth.reduce((a, b) => a + b, 0).toFixed(2)}</td>
                    <td className="p-3 text-right text-red-400 font-mono">{sym}{expenseByMonth.reduce((a, b) => a + b, 0).toFixed(2)}</td>
                    <td className={`p-3 text-right font-mono ${monthlyProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {monthlyProfit >= 0 ? '+' : ''}{sym}{(revenueByMonth.reduce((a, b) => a + b, 0) - expenseByMonth.reduce((a, b) => a + b, 0)).toFixed(2)}
                    </td>
                    <td className="p-3 text-right text-blue-400 font-mono">+{growthByMonth.reduce((a, b) => a + b, 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
