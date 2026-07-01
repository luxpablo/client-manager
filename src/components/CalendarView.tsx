'use client';

import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, RotateCcw, AlertTriangle, DollarSign, Globe, Server } from 'lucide-react';
import { Service, Invoice, Server as ServerType, Domain } from '@/lib/db';

interface CalendarViewProps {
  services: Service[];
  invoices: Invoice[];
  servers: ServerType[];
  domains: Domain[];
  currency?: string;
  onNavigate?: (tab: string) => void;
}

type CalendarEvent = {
  date: Date;
  title: string;
  type: 'renewal' | 'payment' | 'expiry' | 'domain';
  entityId: string;
  targetTab: string;
};

export default function CalendarView({ services, invoices, servers, domains, currency = 'USD', onNavigate }: CalendarViewProps) {
  const sym = currency === 'INR' ? '\u20B9' : '$';
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const events = useMemo(() => {
    const evts: CalendarEvent[] = [];

    services.forEach(s => {
      const renewal = new Date(s.nextRenewalDate);
      evts.push({ date: renewal, title: `Renew: ${s.planName} (${s.type})`, type: 'renewal', entityId: s.id, targetTab: 'services' });
      const expiry = new Date(s.expiryDate);
      if (expiry.toDateString() !== renewal.toDateString()) {
        evts.push({ date: expiry, title: `Expire: ${s.planName}`, type: 'expiry', entityId: s.id, targetTab: 'services' });
      }
    });

    invoices.forEach(inv => {
      const due = new Date(inv.dueDate);
      if (inv.status !== 'Paid') {
        const total = inv.amount + inv.tax - inv.discount;
        evts.push({ date: due, title: `Due: ${inv.invoiceNumber} ${sym}${total.toFixed(2)}`, type: 'payment', entityId: inv.id, targetTab: 'invoices' });
      }
    });

    servers.forEach(srv => {
      evts.push({ date: new Date(srv.renewalDate), title: `Server: ${srv.name}`, type: 'renewal', entityId: srv.id, targetTab: 'servers' });
    });

    domains.forEach(dom => {
      evts.push({ date: new Date(dom.expiryDate), title: `Domain: ${dom.domain}`, type: 'domain', entityId: dom.id, targetTab: 'domains' });
    });

    return evts;
  }, [services, invoices, servers, domains, sym]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const goToday = () => { const t = new Date(); setCurrentMonth(new Date(t.getFullYear(), t.getMonth(), 1)); setSelectedDay(t); };

  const getEventsForDay = (day: number) => {
    const date = new Date(year, month, day);
    return events.filter(e => e.date.toDateString() === date.toDateString() && (typeFilter === 'all' || e.type === typeFilter));
  };

  const formatEventsDate = (date: Date) =>
    date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const selectedEvents = selectedDay ? getEventsForDay(selectedDay.getDate()) : [];

  // Stats
  const today = new Date();
  const todayStr = today.toDateString();
  const todayEvents = events.filter(e => e.date.toDateString() === todayStr);
  const overduePayments = invoices.filter(i => i.status !== 'Paid' && new Date(i.dueDate) < today).length;
  const upcomingRenewals = services.filter(s => {
    const diff = new Date(s.nextRenewalDate).getTime() - today.getTime();
    return diff > 0 && diff < 7 * 86400000 && s.status === 'Active';
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Calendar</h1>
          <p className="text-xs text-muted-foreground/70">Renewals, payments, expiries at a glance.</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-3 bg-background border border-border rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-950/40 border border-blue-800/30 flex items-center justify-center text-blue-400"><CalendarDays className="w-4 h-4" /></div>
          <div><p className="text-lg font-bold text-white font-mono">{todayEvents.length}</p><p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Today</p></div>
        </div>
        <div className="p-3 bg-background border border-border rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-950/40 border border-emerald-800/30 flex items-center justify-center text-emerald-400"><RotateCcw className="w-4 h-4" /></div>
          <div><p className="text-lg font-bold text-white font-mono">{upcomingRenewals}</p><p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Renewals (7d)</p></div>
        </div>
        <div className="p-3 bg-background border border-border rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-950/40 border border-amber-800/30 flex items-center justify-center text-amber-400"><DollarSign className="w-4 h-4" /></div>
          <div><p className="text-lg font-bold text-white font-mono">{overduePayments}</p><p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Overdue</p></div>
        </div>
        <div className="p-3 bg-background border border-border rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-950/40 border border-red-800/30 flex items-center justify-center text-red-400"><AlertTriangle className="w-4 h-4" /></div>
          <div><p className="text-lg font-bold text-white font-mono">{events.length}</p><p className="text-[9px] text-muted-foreground/70 uppercase tracking-wider">Total Events (Month)</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-background border border-border rounded-2xl p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex gap-2">
              <button onClick={prevMonth} className="p-2 bg-muted border border-border rounded-lg text-muted-foreground hover:text-white transition cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={goToday} className="px-3 py-2 bg-muted border border-border rounded-lg text-muted-foreground hover:text-white transition cursor-pointer text-[10px] font-bold uppercase flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Today
              </button>
            </div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={nextMonth} className="p-2 bg-muted border border-border rounded-lg text-muted-foreground hover:text-white transition cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[10px] uppercase text-muted-foreground/70 font-bold tracking-wider">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="py-1">{d}</div>)}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} className="aspect-square p-1" />)}

            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const dayEvents = getEventsForDay(day);
              const isSelected = selectedDay && selectedDay.getDate() === day && selectedDay.getMonth() === month && selectedDay.getFullYear() === year;
              const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(new Date(year, month, day))}
                  className={`aspect-square p-1 rounded-lg text-xs font-mono relative transition cursor-pointer
                    ${isSelected ? 'bg-blue-600/20 border border-blue-500/40 text-white' : 'hover:bg-muted border border-transparent'}
                    ${isToday ? 'text-blue-400 font-bold' : 'text-zinc-300'}
                  `}
                >
                  <span className="absolute top-1 left-1.5">{day}</span>
                  {dayEvents.length > 0 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((e, idx) => (
                        <span key={idx} className={`w-1.5 h-1.5 rounded-full ${
                          e.type === 'renewal' ? 'bg-emerald-500' :
                          e.type === 'payment' ? 'bg-yellow-500' :
                          e.type === 'domain' ? 'bg-blue-500' :
                          'bg-red-500'
                        }`} />
                      ))}
                      {dayEvents.length > 3 && <span className="text-[8px] text-muted-foreground/70">+{dayEvents.length - 3}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Events Panel */}
        <div className="bg-background border border-border rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              {selectedDay ? formatEventsDate(selectedDay) : 'Select a day'}
            </h3>
          </div>

          {/* Filter */}
          <div className="flex gap-1 mb-3">
            {['all', 'renewal', 'payment', 'expiry', 'domain'].map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`px-2 py-1 rounded text-[8px] font-bold uppercase tracking-wider transition cursor-pointer ${
                  typeFilter === t ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground hover:text-white'
                }`}>{t}</button>
            ))}
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-[450px]">
            {selectedEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground/70 font-mono">No events on this day.</p>
            ) : (
              selectedEvents.map((evt, idx) => (
                <div key={idx} onClick={() => onNavigate?.(evt.targetTab)}
                  className={`p-3 rounded-xl border text-xs space-y-1 cursor-pointer transition hover:brightness-125 ${
                    evt.type === 'renewal' ? 'bg-emerald-950/15 border-emerald-900/30' :
                    evt.type === 'payment' ? 'bg-yellow-950/15 border-yellow-900/30' :
                    evt.type === 'domain' ? 'bg-blue-950/15 border-blue-900/30' :
                    'bg-red-950/15 border-red-900/30'
                  }`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      evt.type === 'renewal' ? 'bg-emerald-500' :
                      evt.type === 'payment' ? 'bg-yellow-500' :
                      evt.type === 'domain' ? 'bg-blue-500' :
                      'bg-red-500'
                    }`} />
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{evt.type}</span>
                    {evt.targetTab && <span className="text-[8px] text-blue-400/70 ml-auto">→ {evt.targetTab}</span>}
                  </div>
                  <p className="text-white font-medium">{evt.title}</p>
                </div>
              ))
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-border/40 space-y-2 text-[10px] text-muted-foreground/70">
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Renewal</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Payment Due</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500" /> Expiry</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500" /> Domain</div>
          </div>
        </div>
      </div>
    </div>
  );
}
