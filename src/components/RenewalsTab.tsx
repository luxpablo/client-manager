'use client';

import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  MailWarning,
  RefreshCw,
  XOctagon,
  Ban,
  Clock,
  User,
  ExternalLink,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { Service, Customer } from '@/lib/db';
import { useToast } from '@/components/Toaster';
import ConfirmModal from '@/components/ConfirmModal';

interface RenewalsTabProps {
  userRole: string;
  onLogAction: (action: string, details: string) => void;
  currency?: string;
}

export default function RenewalsTab({ userRole, onLogAction, currency = 'USD' }: RenewalsTabProps) {
  const { toast } = useToast();
  const sym = currency === 'INR' ? '\u20B9' : '$';
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; message: string; variant?: 'danger' | 'warning' | 'default'; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [services, setServices] = useState<(Service & { customer?: Customer })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<(Service & { customer?: Customer }) | null>(null);
  
  // Reminder template preview states
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderTemplate, setReminderTemplate] = useState('7 Days Before');
  const [reminderLog, setReminderLog] = useState<{ [key: string]: string[] }>({}); // srvId -> list of templates sent

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/services');
      if (res.ok) {
        setServices(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  // Action: Renew, Suspend, Terminate, Send Reminder
  const handleServiceAction = async (id: string, action: 'renew' | 'suspend' | 'terminate', planName: string) => {
    if (['Moderator', 'Support'].includes(userRole)) {
      toast('error', 'Forbidden. Your role is restricted from modifications of billing terms.');
      return;
    }

    setConfirmState({
      open: true,
      title: action.toUpperCase(),
      message: `Are you sure you want to perform "${action.toUpperCase()}" on service ${planName}?`,
      variant: 'warning',
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, open: false }));
        try {
          const res = await fetch(`/api/admin/services/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action })
          });
          if (res.ok) {
            toast('success', `Service updated: ${action} command succeeded.`);
            fetchServices();
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
    return;
  };

  const handleSendReminder = (srv: Service & { customer?: Customer }) => {
    setSelectedService(srv);
    setShowReminderModal(true);
  };

  const triggerSendEmail = () => {
    if (!selectedService) return;
    const customerName = selectedService.customer?.name || 'Client';
    const email = selectedService.customer?.email || 'N/A';
    
    // Log audit action
    onLogAction(
      'Billing Reminder Sent',
      `Dispatched "${reminderTemplate}" renewal reminder email to ${customerName} (${email}) for service srv-${selectedService.id}.`
    );

    // Save reminder log locally
    const currentLogs = reminderLog[selectedService.id] || [];
    setReminderLog({
      ...reminderLog,
      [selectedService.id]: [...currentLogs, `${reminderTemplate} (Sent on ${new Date().toLocaleDateString()})`]
    });

    setShowReminderModal(false);
    toast('success', 'Email alert dispatched successfully.');
  };

  // Date range logic
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  const thisWeekEnd = new Date(todayStart);
  thisWeekEnd.setDate(thisWeekEnd.getDate() + 7);

  const nextWeekEnd = new Date(todayStart);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 14);

  const thisMonthEnd = new Date(todayStart);
  thisMonthEnd.setDate(thisMonthEnd.getDate() + 30);

  // Grouping services
  const overdueList: typeof services = [];
  const todayList: typeof services = [];
  const tomorrowList: typeof services = [];
  const thisWeekList: typeof services = [];
  const nextWeekList: typeof services = [];
  const thisMonthList: typeof services = [];

  services.forEach((s) => {
    if (s.status === 'Terminated') return;
    
    const renewDate = new Date(s.nextRenewalDate);

    if (renewDate < todayStart) {
      overdueList.push(s);
    } else if (renewDate >= todayStart && renewDate < tomorrowStart) {
      todayList.push(s);
    } else if (renewDate >= tomorrowStart && renewDate < tomorrowEnd) {
      tomorrowList.push(s);
    } else if (renewDate >= tomorrowEnd && renewDate < thisWeekEnd) {
      thisWeekList.push(s);
    } else if (renewDate >= thisWeekEnd && renewDate < nextWeekEnd) {
      nextWeekList.push(s);
    } else if (renewDate >= nextWeekEnd && renewDate < thisMonthEnd) {
      thisMonthList.push(s);
    }
  });

  const columns = [
    { title: 'Overdue', list: overdueList, color: 'border-red-500/30 bg-red-950/5', badge: 'bg-red-500' },
    { title: 'Today', list: todayList, color: 'border-amber-500/30 bg-amber-950/5', badge: 'bg-amber-500' },
    { title: 'Tomorrow', list: tomorrowList, color: 'border-yellow-500/20 bg-yellow-950/5', badge: 'bg-yellow-400' },
    { title: 'This Week', list: thisWeekList, color: 'border-blue-500/20 bg-blue-950/5', badge: 'bg-blue-500' },
    { title: 'Next Week', list: nextWeekList, color: 'border-zinc-800 bg-background/50', badge: 'bg-zinc-600' },
    { title: 'This Month', list: thisMonthList, color: 'border-zinc-800 bg-background/50', badge: 'bg-zinc-600' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Billing & Renewal Manager</h1>
          <p className="text-xs text-muted-foreground/70">Track and dispatch automated reminder alerts based on service renewal milestones.</p>
        </div>
        <div className="flex items-center gap-1 bg-background border border-border px-3 py-1.5 rounded-lg text-[10px] text-muted-foreground font-mono">
          <CalendarClock className="w-3.5 h-3.5 text-blue-400" />
          <span>Active Cycles: Weekly, Monthly, Annual</span>
        </div>
      </div>

      {/* Grid lanes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {columns.map((col, cIdx) => (
          <div key={col.title} className={`p-3 border rounded-xl flex flex-col space-y-3 min-h-[400px] ${col.color}`}>
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">{col.title}</span>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-blue-400 font-mono font-bold">{sym}{col.list.reduce((sum, s) => sum + s.sellingPrice, 0).toFixed(0)}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${col.badge} shrink-0`} />
              </div>
            </div>

            {loading ? (
              <div className="text-[10px] text-muted-foreground/70 text-center py-5 animate-pulse">Syncing...</div>
            ) : (
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[550px] pr-1">
                {col.list.map((srv) => (
                  <div
                    key={srv.id}
                    className="p-3 bg-muted border border-border/60 rounded-xl space-y-2.5 shadow-md relative group hover:border-blue-600/35 transition"
                  >
                    <div>
                      <span className="text-[8px] font-mono text-muted-foreground/70 font-semibold block uppercase">{srv.id}</span>
                      <h4 className="text-xs font-bold text-white leading-tight mt-0.5">{srv.planName}</h4>
                      <p className="text-[10px] text-blue-400 font-semibold mt-0.5">{srv.type}</p>
                    </div>

                    <div className="text-[10px] text-muted-foreground font-medium">
                      <div className="flex items-center gap-1 text-muted-foreground/70">
                        <User className="w-3 h-3 text-muted-foreground/50" />
                        <span className="truncate">{srv.customer?.name}</span>
                      </div>
                      <div className="text-[9px] font-mono text-muted-foreground/70 mt-1">
                        Due: {new Date(srv.nextRenewalDate).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-xs font-mono font-bold text-white">{sym}{srv.sellingPrice.toFixed(2)}</span>
                      <span className="text-[9px] font-mono text-muted-foreground">{srv.billingCycle}</span>
                    </div>

                    {/* Reminder & Status Indicators */}
                    <div className="flex items-center gap-1.5">
                      {reminderLog[srv.id] && reminderLog[srv.id].length > 0 && (
                        <span className="text-[8px] bg-blue-950/30 text-blue-300 border border-blue-900/30 px-1.5 py-0.5 rounded font-mono flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" />x{reminderLog[srv.id].length}
                        </span>
                      )}
                      {new Date(srv.nextRenewalDate) < todayStart && srv.status !== 'Terminated' && (
                        <span className="text-[8px] bg-red-950/40 text-red-400 border border-red-800/30 px-1.5 py-0.5 rounded font-mono">
                          {Math.ceil((todayStart.getTime() - new Date(srv.nextRenewalDate).getTime()) / (1000 * 60 * 60 * 24))}d overdue
                        </span>
                      )}
                    </div>

                    {/* Operational Actions Drawer */}
                    <div className="pt-2 border-t border-border/40 flex flex-wrap gap-1.5">
                      <button
                        onClick={() => handleServiceAction(srv.id, 'renew', srv.planName)}
                        className="flex-1 py-1 bg-emerald-950/40 hover:bg-emerald-900/30 text-emerald-400 border border-emerald-900/40 text-[9px] font-bold uppercase rounded cursor-pointer"
                        title="Renew Contract & Invoice"
                      >
                        Renew
                      </button>
                      <button
                        onClick={() => handleSendReminder(srv)}
                        className="p-1 bg-muted border border-border text-muted-foreground hover:text-blue-400 rounded cursor-pointer"
                        title="Send Renewal Alerts"
                      >
                        <MailWarning className="w-3.5 h-3.5" />
                      </button>
                      {srv.status === 'Active' && (
                        <button
                          onClick={() => handleServiceAction(srv.id, 'suspend', srv.planName)}
                          className="p-1 bg-muted border border-border text-muted-foreground hover:text-amber-400 rounded cursor-pointer"
                          title="Suspend Service"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleServiceAction(srv.id, 'terminate', srv.planName)}
                        className="p-1 bg-muted border border-border text-muted-foreground/70 hover:text-red-400 rounded cursor-pointer"
                        title="Terminate Machine Profile"
                      >
                        <XOctagon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {col.list.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <CalendarClock className="w-6 h-6 text-blue-400/40" />
                    <p className="text-xs font-semibold text-muted-foreground/60">No Renewals Yet</p>
                    <p className="text-[10px] text-muted-foreground/50 max-w-[180px]">
                      Renewals are generated from active services with upcoming billing dates.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reminder Email Modal */}
      {showReminderModal && selectedService && (
        <div className="fixed inset-0 bg-[#03000a]/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="p-5 border-b border-border bg-muted/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Send Billing Reminder</h3>
              <button
                onClick={() => setShowReminderModal(false)}
                className="text-muted-foreground/70 hover:text-zinc-300 text-xs font-bold uppercase"
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-[#110e20] border border-border/40 rounded-xl space-y-1.5">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-bold">Client Target</p>
                <p className="text-white font-bold">{selectedService.customer?.name} ({selectedService.customer?.email})</p>
                <p className="text-muted-foreground">Service: {selectedService.planName} ({selectedService.type})</p>
                <p className="text-muted-foreground">Renewal Date: {new Date(selectedService.nextRenewalDate).toLocaleDateString()}</p>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Alert Event Template</label>
                <select
                  value={reminderTemplate}
                  onChange={(e) => setReminderTemplate(e.target.value)}
                  className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300"
                >
                  <option value="7 Days Before">7 Days Before Renewal Alert</option>
                  <option value="3 Days Before">3 Days Before Renewal Alert</option>
                  <option value="1 Day Before">1 Day Before Renewal Alert</option>
                  <option value="Expired">Service Expired Notification</option>
                </select>
              </div>

              {/* Template Preview Card */}
              <div className="p-3 bg-[#110e20]/60 border border-border/30 rounded-lg space-y-2">
                <span className="text-[8px] uppercase tracking-widest text-muted-foreground/70 font-bold font-mono">Email Body Preview</span>
                <p className="text-muted-foreground font-serif leading-relaxed text-[11px]">
                  Dear {selectedService.customer?.name},<br /><br />
                  {reminderTemplate === 'Expired'
                    ? `Your container service ${selectedService.planName} (${selectedService.type}) has expired. Please renew the contract immediately to restore host connections.`
                    : `This is a friendly reminder that your hosting service ${selectedService.planName} (${selectedService.type}) is scheduled to renew on ${new Date(selectedService.nextRenewalDate).toLocaleDateString()}. Please ensure billing accounts are cleared.`}
                  <br /><br />
                  Best Regards,<br />
                  Zyphron Cloud Solutions
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowReminderModal(false)}
                  className="px-4 py-2 bg-muted border border-border text-muted-foreground hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition"
                >
                  Cancel
                </button>
                <button
                  onClick={triggerSendEmail}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition flex items-center gap-1.5"
                >
                  <span>Dispatch Email</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
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
    </div>
  );
}
