'use client';

import React from 'react';
import {
  LayoutDashboard,
  Users,
  ServerCrash,
  CalendarDays,
  FileSpreadsheet,
  HardDrive,
  Globe2,
  Ticket,
  ScrollText,
  Settings,
  LogOut,
  Cpu,
  ShieldCheck,
  BarChart3,
  Sun,
  Moon,
  DollarSign,
  Globe,
  Monitor,
  Kanban,
  Terminal,
  CreditCard,
  Disc3,
  Database,
  X,
  Menu
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  user: { name: string; username: string; role: string };
  onLogout: () => void;
  unreadNotificationsCount: number;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function Sidebar({
  activeTab,
  onTabChange,
  user,
  onLogout,
  unreadNotificationsCount,
  darkMode = true,
  onToggleDarkMode,
  sidebarOpen = false,
  onToggleSidebar
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['Founder', 'Admin', 'Billing', 'Support', 'Moderator'] },
    { id: 'customers', name: 'Customers', icon: Users, roles: ['Founder', 'Admin', 'Billing', 'Support', 'Moderator'] },
    { id: 'services', name: 'Services', icon: ServerCrash, roles: ['Founder', 'Admin', 'Billing', 'Support', 'Moderator'] },
    { id: 'renewals', name: 'Renewals', icon: CalendarDays, roles: ['Founder', 'Admin', 'Billing'] },
    { id: 'invoices', name: 'Invoices', icon: FileSpreadsheet, roles: ['Founder', 'Admin', 'Billing'] },
    { id: 'calendar', name: 'Calendar', icon: CalendarDays, roles: ['Founder', 'Admin', 'Billing', 'Support'] },
    { id: 'servers', name: 'Server Inventory', icon: HardDrive, roles: ['Founder', 'Admin'] },
    { id: 'providers', name: 'Providers', icon: Globe2, roles: ['Founder', 'Admin'] },
    { id: 'tickets', name: 'Support Tickets', icon: Ticket, roles: ['Founder', 'Admin', 'Support', 'Moderator'] },
    { id: 'kanban', name: 'Kanban Board', icon: Kanban, roles: ['Founder', 'Admin', 'Support'] },
    { id: 'reports', name: 'Reports', icon: BarChart3, roles: ['Founder', 'Admin', 'Billing'] },
    { id: 'expenses', name: 'Expenses', icon: DollarSign, roles: ['Founder', 'Admin', 'Billing'] },
    { id: 'domains', name: 'Domains', icon: Globe, roles: ['Founder', 'Admin'] },
    { id: 'assets', name: 'Assets', icon: Monitor, roles: ['Founder', 'Admin'] },
    { id: 'records', name: 'Master Records', icon: Database, roles: ['Founder', 'Admin', 'Billing'] },
    { id: 'logs', name: 'Activity Audit', icon: ScrollText, roles: ['Founder', 'Admin'] },
    { id: 'paymenter', name: 'Paymenter', icon: CreditCard, roles: ['Founder', 'Admin'] },
    { id: 'pterodactyl', name: 'Pterodactyl', icon: Disc3, roles: ['Founder', 'Admin'] },
    { id: 'api', name: 'API Console', icon: Terminal, roles: ['Founder', 'Admin'] },
    { id: 'settings', name: 'Settings', icon: Settings, roles: ['Founder', 'Admin'] },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6 flex items-center gap-3 border-b border-border/50 shrink-0">
        <div className="w-8 h-8 bg-blue-950/60 border border-blue-500/30 rounded-lg flex items-center justify-center text-blue-400 glow-blue-sm">
          <Cpu className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-tight text-white uppercase">Zyphron Cloud</h2>
          <span className="text-[10px] text-muted-foreground/70 font-mono tracking-widest">ZCMS ADMIN</span>
        </div>
        {onToggleSidebar && (
          <button onClick={onToggleSidebar} className="ml-auto lg:hidden p-1 text-muted-foreground/70 hover:text-white rounded cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item) => {
            const hasAccess = item.roles.includes(user.role);
            const Icon = item.icon;
            if (!hasAccess) return null;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onTabChange(item.id); if (onToggleSidebar) onToggleSidebar(); }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition active:scale-[0.98] ${
                  isActive
                    ? 'bg-blue-950/45 text-blue-300 border border-blue-800/30'
                    : 'text-muted-foreground hover:text-white hover:bg-zinc-900/40 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-muted-foreground/70'}`} />
                  <span>{item.name}</span>
                </div>
                {item.id === 'dashboard' && unreadNotificationsCount > 0 && (
                  <span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

      {onToggleDarkMode && (
        <div className="px-4 py-2 border-t border-border/30 shrink-0">
          <button
            onClick={onToggleDarkMode}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-white hover:bg-zinc-900/40 transition"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      )}

      <div className="p-4 border-t border-border/50 bg-zinc-950/30 shrink-0">
        <div className="flex items-center justify-between gap-2 p-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-cyan-600 flex items-center justify-center text-[11px] font-bold text-white shadow shadow-blue-500/20">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white leading-tight truncate">{user.name}</p>
              <div className="flex items-center gap-1 text-[9px] text-blue-400 font-mono mt-0.5 font-bold uppercase">
                <ShieldCheck className="w-2.5 h-2.5" />
                {user.role}
              </div>
            </div>
          </div>
          <button onClick={onLogout} title="Sign Out" className="p-1.5 rounded-lg text-muted-foreground/70 hover:text-red-400 hover:bg-red-950/15 border border-transparent hover:border-red-900/20 transition active:scale-95 cursor-pointer">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      {onToggleSidebar && (
        <button
          onClick={onToggleSidebar}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-background border border-border/60 rounded-lg text-muted-foreground hover:text-white transition cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={onToggleSidebar}
        />
      )}

      {/* Sidebar - Desktop: static sidebar, Mobile: overlay */}
      <aside
        className={`
          bg-[#0a0814] border-r border-border flex flex-col shrink-0 select-none
          lg:static lg:translate-x-0 lg:w-64
          fixed top-0 left-0 h-full w-72 z-50
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
