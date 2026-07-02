'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/Toaster';
import ConfirmModal from '@/components/ConfirmModal';
import {
  Settings,
  ShieldAlert,
  Save,
  DownloadCloud,
  FileCode,
  Mail,
  Coins,
  Globe,
  Users,
  Plus,
  Trash2,
  KeyRound,
  Link,
  Plug,
  Wifi,
  Bot,
  Sparkles,
  CreditCard,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { SystemSettings } from '@/lib/db';

interface SettingsTabProps {
  userRole: string;
  onLogAction: (action: string, details: string) => void;
}

export default function SettingsTab({ userRole, onLogAction }: SettingsTabProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [timeZone, setTimeZone] = useState('UTC');
  const [emailTemplate, setEmailTemplate] = useState('');
  const [reminderTemplate, setReminderTemplate] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFromName, setSmtpFromName] = useState('');
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setCompanyName(data.companyName || '');
        setInvoicePrefix(data.invoicePrefix || '');
        setGstNumber(data.gstNumber || '');
        setCurrency(data.currency || 'USD');
        setTimeZone(data.timeZone || 'UTC');
        setEmailTemplate(data.emailTemplate || '');
        setReminderTemplate(data.reminderTemplate || '');
        setSmtpHost(data.smtp?.host || '');
        setSmtpPort(String(data.smtp?.port || 587));
        setSmtpUser(data.smtp?.user || '');
        setSmtpPass(data.smtp?.pass || '');
        setSmtpFromName(data.smtp?.fromName || data.companyName || '');
        setSmtpFromEmail(data.smtp?.fromEmail || '');
        setSmtpSecure(data.smtp?.secure || false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!['Founder', 'Admin'].includes(userRole)) {
      toast('error', 'Forbidden. Only Founder/Admin can modify system configurations.');
      return;
    }

    try {
      const res = await fetch('/api/admin/settings/all', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          invoicePrefix,
          gstNumber,
          currency,
          timeZone,
          emailTemplate,
          reminderTemplate,
          smtp: { host: smtpHost, port: Number(smtpPort), user: smtpUser, pass: smtpPass, fromName: smtpFromName, fromEmail: smtpFromEmail, secure: smtpSecure }
        })
      });
      if (res.ok) {
        toast('success', 'System configurations updated successfully.');
        fetchSettings();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const testSmtpConnection = async () => {
    try {
      const res = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: smtpFromEmail || 'test@example.com',
          subject: 'ZCMS SMTP Test',
          text: 'This is a test email from ZCMS. Your SMTP configuration is working correctly.',
        }),
      });
      if (res.ok) {
        toast('success', 'SMTP test email sent successfully.');
      } else {
        const err = await res.json();
        toast('error', err.error || 'SMTP test failed.');
      }
    } catch (e) {
      toast('error', 'SMTP test request failed.');
    }
  };

  const saveSmtpSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings/all', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          smtp: { host: smtpHost, port: Number(smtpPort), user: smtpUser, pass: smtpPass, fromName: smtpFromName, fromEmail: smtpFromEmail, secure: smtpSecure },
        }),
      });
      if (res.ok) {
        toast('success', 'SMTP configuration saved.');
        fetchSettings();
      }
    } catch (e) {
      toast('error', 'Failed to save SMTP configuration.');
    }
  };

  // One-click Backup JSON Downloader
  const triggerBackupDownload = async () => {
    try {
      const res = await fetch('/api/admin/backup');
      if (!res.ok) throw new Error('Backup API failed');
      const backupObj = await res.json();

      const blob = new Blob([JSON.stringify(backupObj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `ZCMS_Backup_${Date.now()}.json`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onLogAction('Backup Created', 'Executed manual database snapshot backup. Downloaded state archive.');
      toast('success', 'Full database snapshot downloaded successfully.');
    } catch (e) {
      console.error(e);
      toast('error', 'Error exporting database snapshot.');
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-xs text-muted-foreground/70 animate-pulse">Loading system settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">System Settings</h1>
          <p className="text-xs text-muted-foreground/70">Configure global hosting billing, brand templates, and database backups.</p>
        </div>
      </div>

      {/* Staff Management Section */}
      {['Founder', 'Admin'].includes(userRole) && (
        <StaffManagementSection userRole={userRole} onLogAction={onLogAction} />
      )}

      {['Founder', 'Admin'].includes(userRole) && settings && (
        <IntegrationsSection settings={settings} onLogAction={onLogAction} fetchSettings={fetchSettings} />
      )}

      {['Founder', 'Admin'].includes(userRole) && settings && (
        <AIConfigSection settings={settings} onLogAction={onLogAction} fetchSettings={fetchSettings} />
      )}

      {['Founder', 'Admin'].includes(userRole) && settings && (
        <PaymentGatewaysSection settings={settings} onLogAction={onLogAction} fetchSettings={fetchSettings} />
      )}

      {['Founder', 'Admin'].includes(userRole) && settings && (
        <ApiKeysSection settings={settings} onLogAction={onLogAction} fetchSettings={fetchSettings} />
      )}

      {['Founder', 'Admin'].includes(userRole) && (
        <div className="bg-background border border-border rounded-2xl p-5 shadow-lg mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wide">SMTP Mail Configuration</h2>
          </div>
          <p className="text-[10px] text-muted-foreground/70 mb-4">Configure SMTP to send invoices and reminders directly to client emails.</p>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1 font-semibold">SMTP Host</label>
              <input type="text" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} className="w-full p-2 bg-muted border border-border rounded-lg text-zinc-200" placeholder="smtp.example.com" />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1 font-semibold">Port</label>
              <input type="number" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} className="w-full p-2 bg-muted border border-border rounded-lg text-zinc-200" />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={smtpSecure} onChange={e => setSmtpSecure(e.target.checked)} className="accent-blue-500" />
                <span className="text-[10px] text-muted-foreground/70">Use SSL/TLS</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
            <div>
              <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1 font-semibold">SMTP Username</label>
              <input type="text" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} className="w-full p-2 bg-muted border border-border rounded-lg text-zinc-200 font-mono" placeholder="user@example.com" />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1 font-semibold">SMTP Password</label>
              <input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} className="w-full p-2 bg-muted border border-border rounded-lg text-zinc-200 font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3 text-xs">
            <div>
              <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1 font-semibold">From Name</label>
              <input type="text" value={smtpFromName} onChange={e => setSmtpFromName(e.target.value)} className="w-full p-2 bg-muted border border-border rounded-lg text-zinc-200" placeholder="Zyphron Cloud" />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1 font-semibold">From Email</label>
              <input type="email" value={smtpFromEmail} onChange={e => setSmtpFromEmail(e.target.value)} className="w-full p-2 bg-muted border border-border rounded-lg text-zinc-200 font-mono" placeholder="billing@zyphron.cloud" />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/50">
            <button onClick={saveSmtpSettings}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition flex items-center gap-2 cursor-pointer">
              <Save className="w-3.5 h-3.5" /> Save SMTP
            </button>
            <button onClick={testSmtpConnection}
              className="px-4 py-2 bg-muted hover:bg-blue-950/20 border border-border hover:border-blue-800/40 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition flex items-center gap-2 cursor-pointer">
              <Mail className="w-3.5 h-3.5 text-blue-400" /> Test Connection
            </button>
            {smtpHost && smtpUser && smtpPass && (
              <span className="text-[9px] text-emerald-400/70 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                SMTP configured
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Form */}
        <div className="lg:col-span-2 bg-background border border-border rounded-2xl p-5 shadow-lg">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-5">Zyphron Branded Configuration</h3>
          
          <form onSubmit={handleSaveSettings} className="space-y-5 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Company Brand Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">GSTIN Registry Number</label>
                <input
                  type="text"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200 font-mono"
                  placeholder="GSTIN..."
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Invoice Number Prefix</label>
                <input
                  type="text"
                  required
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">System Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300 font-bold"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold">Default Timezone</label>
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="w-full p-2.5 bg-muted border border-border rounded-lg text-zinc-300"
                >
                  <option value="UTC">UTC (GMT+0)</option>
                  <option value="IST">IST (GMT+5:30)</option>
                  <option value="EST">EST (GMT-5)</option>
                  <option value="PST">PST (GMT-8)</option>
                </select>
              </div>
            </div>

            {/* Email templates */}
            <div className="space-y-4 border-t border-border/50 pt-4">
              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  Service Deployment Email Template
                </label>
                <textarea
                  value={emailTemplate}
                  onChange={(e) => setEmailTemplate(e.target.value)}
                  rows={4}
                  className="w-full p-3 bg-[#110e20] border border-border rounded-lg text-zinc-200 resize-none font-mono text-[11px] leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1.5 font-semibold flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  Renewal Reminder Email Template
                </label>
                <textarea
                  value={reminderTemplate}
                  onChange={(e) => setReminderTemplate(e.target.value)}
                  rows={4}
                  className="w-full p-3 bg-[#110e20] border border-border rounded-lg text-zinc-200 resize-none font-mono text-[11px] leading-relaxed"
                />
              </div>
            </div>

            {['Founder', 'Admin'].includes(userRole) ? (
              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  className="py-2.5 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold tracking-wider uppercase rounded-lg transition shadow flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Brand Settings</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-lg text-[10px] text-red-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <span>Forbidden: Saving configurations is locked to the Founder/Admin account.</span>
              </div>
            )}
          </form>
        </div>

        {/* Database backup card */}
        <div className="space-y-6">
          <div className="bg-background border border-border rounded-2xl p-5 shadow-lg space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Operations Database</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              ZCMS database runs on a localized high-performance state storage. Backups are critical to prevent data loss.
            </p>
            <div className="p-3 bg-blue-950/15 border border-blue-500/20 rounded-lg text-[10px] text-blue-300">
              Database Type: <span className="font-mono font-bold text-white uppercase">SQLite / Local JSON</span>
            </div>
            
            <button
              onClick={triggerBackupDownload}
              className="w-full py-2.5 bg-muted hover:bg-blue-950/20 border border-border hover:border-blue-800/40 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <DownloadCloud className="w-4 h-4 text-blue-400" />
              <span>Snapshot Database</span>
            </button>
          </div>

          <div className="bg-background border border-border rounded-2xl p-5 shadow-lg space-y-3 font-mono text-[10px] text-muted-foreground/70">
            <p className="font-semibold text-white uppercase text-xs font-sans tracking-wide">Developer Notes</p>
            <p className="leading-relaxed font-sans">
              To connect PostgreSQL database for production, replace datasource adapter details inside the prisma folder:
            </p>
            <div className="p-2.5 bg-muted border border-border/50 rounded text-[9px] text-blue-300 overflow-x-auto whitespace-pre">
              {`datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationsSection({ settings, onLogAction, fetchSettings }: { settings: SystemSettings; onLogAction: (a: string, d: string) => void; fetchSettings: () => void }) {
  const { toast } = useToast();
  const [paymenterUrl, setPaymenterUrl] = useState(settings.integrations?.paymenter?.baseUrl || '');
  const [paymenterKey, setPaymenterKey] = useState(settings.integrations?.paymenter?.apiKey || '');
  const [paymenterEnabled, setPaymenterEnabled] = useState(settings.integrations?.paymenter?.enabled || false);
  const [pterodactylUrl, setPterodactylUrl] = useState(settings.integrations?.pterodactyl?.baseUrl || '');
  const [pterodactylKey, setPterodactylKey] = useState(settings.integrations?.pterodactyl?.apiKey || '');
  const [pterodactylEnabled, setPterodactylEnabled] = useState(settings.integrations?.pterodactyl?.enabled || false);

  const saveIntegrations = async () => {
    const res = await fetch('/api/admin/settings/all', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...settings,
        integrations: {
          paymenter: { baseUrl: paymenterUrl, apiKey: paymenterKey, enabled: paymenterEnabled },
          pterodactyl: { baseUrl: pterodactylUrl, apiKey: pterodactylKey, enabled: pterodactylEnabled },
        }
      })
    });
    if (res.ok) { toast('success', 'Integration settings saved.'); fetchSettings(); }
  };

  return (
    <div className="bg-background border border-border rounded-2xl p-5 shadow-lg mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Plug className="w-5 h-5 text-blue-400" />
        <h2 className="text-sm font-bold text-white uppercase tracking-wide">Integrations</h2>
      </div>
      <div className="space-y-5 text-xs">
        <div className="p-4 bg-muted border border-border rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white uppercase tracking-wider text-[11px]">Paymenter Billing</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[10px] text-muted-foreground/70">Enabled</span>
              <input type="checkbox" checked={paymenterEnabled} onChange={e => setPaymenterEnabled(e.target.checked)} className="accent-blue-500" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1">Base URL</label>
              <input type="url" value={paymenterUrl} onChange={e => setPaymenterUrl(e.target.value)} className="w-full p-2 bg-background border border-border rounded-lg text-zinc-200" placeholder="https://billing.example.com" />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1">API Key</label>
              <input type="password" value={paymenterKey} onChange={e => setPaymenterKey(e.target.value)} className="w-full p-2 bg-background border border-border rounded-lg text-zinc-200 font-mono" placeholder="pt_..." />
            </div>
          </div>
        </div>

        <div className="p-4 bg-muted border border-border rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white uppercase tracking-wider text-[11px]">Pterodactyl Panel</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[10px] text-muted-foreground/70">Enabled</span>
              <input type="checkbox" checked={pterodactylEnabled} onChange={e => setPterodactylEnabled(e.target.checked)} className="accent-blue-500" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1">Panel URL</label>
              <input type="url" value={pterodactylUrl} onChange={e => setPterodactylUrl(e.target.value)} className="w-full p-2 bg-background border border-border rounded-lg text-zinc-200" placeholder="https://panel.example.com" />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-muted-foreground/70 mb-1">API Key</label>
              <input type="password" value={pterodactylKey} onChange={e => setPterodactylKey(e.target.value)} className="w-full p-2 bg-background border border-border rounded-lg text-zinc-200 font-mono" placeholder="ptla_..." />
            </div>
          </div>
        </div>

        <button onClick={saveIntegrations} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition flex items-center gap-2">
          <Save className="w-3.5 h-3.5" /> Save Integrations
        </button>
      </div>
    </div>
  );
}

function AIConfigSection({ settings, onLogAction, fetchSettings }: { settings: SystemSettings; onLogAction: (a: string, d: string) => void; fetchSettings: () => void }) {
  const { toast } = useToast();
  const [provider, setProvider] = useState(settings.ai?.provider || 'demo');
  const [apiKey, setApiKey] = useState(settings.ai?.apiKey || '');
  const [model, setModel] = useState(settings.ai?.model || 'gpt-4o-mini');
  const [baseUrl, setBaseUrl] = useState(settings.ai?.baseUrl || 'https://api.openai.com/v1');
  const [enabled, setEnabled] = useState(settings.ai?.enabled !== false);

  const saveAI = async () => {
    const res = await fetch('/api/admin/settings/all', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...settings, ai: { provider: provider as any, apiKey, model, baseUrl, enabled } })
    });
    if (res.ok) { toast('success', 'AI configuration saved.'); fetchSettings(); }
    else { toast('error', 'Failed to save AI configuration.'); }
  };

  return (
    <div className="bg-background border border-border rounded-2xl p-5 shadow-lg mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Bot className="w-5 h-5 text-blue-400" />
        <h2 className="text-sm font-bold text-white uppercase tracking-wide">AI Configuration</h2>
      </div>
      <p className="text-[10px] text-muted-foreground/70 mb-4">Configure the AI assistant. In demo mode, responses are generated from your local data without an API key.</p>

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="accent-blue-500" id="ai-enabled" />
            <label htmlFor="ai-enabled" className="text-[11px] text-zinc-300">Enable AI Assistant</label>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1">Provider</label>
          <select value={provider} onChange={e => { setProvider(e.target.value as 'openai' | 'openrouter' | 'demo'); if (e.target.value === 'demo') setApiKey(''); }}
            className="w-full max-w-xs p-2 bg-muted border border-border rounded-lg text-xs text-zinc-200">
            <option value="demo">Demo Mode (no API key needed)</option>
            <option value="openai">OpenAI</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>

        {provider !== 'demo' && (
          <>
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1">API Key</label>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                className="w-full p-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 font-mono" placeholder="sk-..." />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1">Model</label>
              <input type="text" value={model} onChange={e => setModel(e.target.value)}
                className="w-full max-w-xs p-2 bg-muted border border-border rounded-lg text-xs text-zinc-200" placeholder="gpt-4o-mini" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mb-1">API Base URL</label>
              <input type="text" value={baseUrl} onChange={e => setBaseUrl(e.target.value)}
                className="w-full p-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 font-mono" />
            </div>
          </>
        )}
      </div>

      <button onClick={saveAI} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition flex items-center gap-2">
        <Save className="w-3.5 h-3.5" /> Save AI Settings
      </button>
    </div>
  );
}

function PaymentGatewaysSection({ settings, onLogAction, fetchSettings }: { settings: SystemSettings; onLogAction: (a: string, d: string) => void; fetchSettings: () => void }) {
  const { toast } = useToast();
  const [cashfree, setCashfree] = useState(settings.paymentGateways?.cashfree || { enabled: false, appId: '', secretKey: '', mode: 'sandbox' });
  const [paypal, setPaypal] = useState(settings.paymentGateways?.paypal || { enabled: false, clientId: '', secret: '', mode: 'sandbox' });
  const [saving, setSaving] = useState(false);

  const saveGateways = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updatePaymentGateways',
          paymentGateways: { cashfree, paypal },
        }),
      });
      if (res.ok) {
        toast('success', 'Payment gateway settings saved');
        onLogAction('Update Payment Gateways', `Cashfree: ${cashfree.enabled ? 'Enabled' : 'Disabled'}, PayPal: ${paypal.enabled ? 'Enabled' : 'Disabled'}`);
        fetchSettings();
      } else { toast('error', 'Failed to save payment gateway settings'); }
    } catch { toast('error', 'Failed to save payment gateway settings'); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-background border border-border rounded-2xl p-5 shadow-lg mb-6">
      <div className="flex items-center gap-3 mb-4">
        <CreditCard className="w-5 h-5 text-blue-400" />
        <h2 className="text-sm font-bold text-white uppercase tracking-wide">Payment Gateways</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-white">Cashfree</h3>
            <button onClick={() => { setCashfree({ ...cashfree, enabled: !cashfree.enabled }); }}
              className={`p-1 rounded transition cursor-pointer ${cashfree.enabled ? 'text-emerald-400' : 'text-zinc-600'}`}>
              {cashfree.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            </button>
          </div>
          <div className="space-y-2">
            <select value={cashfree.mode} onChange={e => setCashfree({ ...cashfree, mode: e.target.value as 'sandbox' | 'live' })}
              className="w-full p-2 bg-muted border border-border rounded-lg text-xs text-zinc-300">
              <option value="sandbox">Sandbox (Test)</option>
              <option value="live">Live (Production)</option>
            </select>
            <input type="text" value={cashfree.appId} onChange={e => setCashfree({ ...cashfree, appId: e.target.value })}
              placeholder="App ID (Client ID)" className="w-full p-2 bg-muted border border-border rounded-lg text-xs text-white font-mono" />
            <input type="password" value={cashfree.secretKey} onChange={e => setCashfree({ ...cashfree, secretKey: e.target.value })}
              placeholder="Secret Key" className="w-full p-2 bg-muted border border-border rounded-lg text-xs text-white font-mono" />
          </div>
        </div>

        <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-white">PayPal</h3>
            <button onClick={() => { setPaypal({ ...paypal, enabled: !paypal.enabled }); }}
              className={`p-1 rounded transition cursor-pointer ${paypal.enabled ? 'text-emerald-400' : 'text-zinc-600'}`}>
              {paypal.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            </button>
          </div>
          <div className="space-y-2">
            <select value={paypal.mode} onChange={e => setPaypal({ ...paypal, mode: e.target.value as 'sandbox' | 'live' })}
              className="w-full p-2 bg-muted border border-border rounded-lg text-xs text-zinc-300">
              <option value="sandbox">Sandbox (Test)</option>
              <option value="live">Live (Production)</option>
            </select>
            <input type="text" value={paypal.clientId} onChange={e => setPaypal({ ...paypal, clientId: e.target.value })}
              placeholder="Client ID" className="w-full p-2 bg-muted border border-border rounded-lg text-xs text-white font-mono" />
            <input type="password" value={paypal.secret} onChange={e => setPaypal({ ...paypal, secret: e.target.value })}
              placeholder="Secret" className="w-full p-2 bg-muted border border-border rounded-lg text-xs text-white font-mono" />
          </div>
        </div>
      </div>

      <button onClick={saveGateways} disabled={saving}
        className="mt-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50">
        <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save Payment Gateway Settings'}
      </button>
    </div>
  );
}

function ApiKeysSection({ settings, onLogAction, fetchSettings }: { settings: SystemSettings; onLogAction: (a: string, d: string) => void; fetchSettings: () => void }) {
  const { toast } = useToast();
  const [keys, setKeys] = useState<{ name: string; key: string; permissions: string[] }[]>(settings.apiKeys || []);
  const [newName, setNewName] = useState('');
  const [newPerms, setNewPerms] = useState('read');

  const generateKey = () => 'zcms_' + Array.from({ length: 32 }, () => Math.random().toString(36)[2]).join('');

  const addKey = () => {
    if (!newName) return;
    const key = { name: newName, key: generateKey(), permissions: [newPerms] };
    const updated = [...keys, key];
    setKeys(updated);
    saveKeys(updated);
    setNewName('');
  };

  const removeKey = (idx: number) => {
    const updated = keys.filter((_, i) => i !== idx);
    setKeys(updated);
    saveKeys(updated);
  };

  const saveKeys = async (updated: typeof keys) => {
    const res = await fetch('/api/admin/settings/all', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...settings, apiKeys: updated })
    });
    if (res.ok) { toast('success', 'API keys updated.'); fetchSettings(); }
  };

  return (
    <div className="bg-background border border-border rounded-2xl p-5 shadow-lg mb-6">
      <div className="flex items-center gap-3 mb-4">
        <KeyRound className="w-5 h-5 text-blue-400" />
        <h2 className="text-sm font-bold text-white uppercase tracking-wide">API Keys</h2>
      </div>
      <p className="text-[10px] text-muted-foreground/70 mb-4">Use these keys to authenticate with the REST API (/api/v1/*).</p>

      {keys.length > 0 && (
        <div className="space-y-2 mb-4">
          {keys.map((k, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-muted border border-border rounded-lg text-xs">
              <div className="flex items-center gap-3">
                <span className="text-white font-bold">{k.name}</span>
                <span className="font-mono text-[10px] text-blue-300">{k.key}</span>
                <span className="text-[10px] text-muted-foreground/70">({k.permissions.join(', ')})</span>
              </div>
              <button onClick={() => removeKey(i)} className="p-1 text-muted-foreground/70 hover:text-red-400 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Key name" className="flex-1 p-2 bg-muted border border-border rounded-lg text-xs text-zinc-200" />
        <select value={newPerms} onChange={e => setNewPerms(e.target.value)} className="bg-muted border border-border rounded-lg text-xs text-zinc-300 px-2">
          <option value="read">Read</option>
          <option value="write">Write</option>
          <option value="admin">Admin</option>
        </select>
        <button onClick={addKey} className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase rounded-lg transition flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Add</button>
      </div>
    </div>
  );
}

// Staff Management Section (for Founder only)
function StaffManagementSection({ userRole, onLogAction }: { userRole: string; onLogAction: (action: string, details: string) => void }) {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: '', name: '', password: '', role: 'Support' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) setUsers(await res.json());
    } catch {}
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async () => {
    if (!form.username || !form.name) return;
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      setShowCreate(false);
      setForm({ username: '', name: '', password: '', role: 'Support' });
      fetchUsers();
    } else {
      const err = await res.json();
      toast('error', err.error || 'Failed to create user');
    }
  };

  const handleUpdateRole = async (id: string) => {
    await fetch(`/api/admin/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: editRole })
    });
    setEditingId(null);
    fetchUsers();
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });

  const handleDeleteUser = (id: string, name: string) => {
    setDeleteConfirm({ open: true, id, name });
  };

  const confirmDeleteUser = async () => {
    const id = deleteConfirm.id;
    setDeleteConfirm(p => ({ ...p, open: false }));
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    fetchUsers();
  };

  const roles = ['Founder', 'Admin', 'Billing', 'Support', 'Moderator'];

  return (
    <div className="bg-background border border-border rounded-2xl p-5 shadow-lg mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-blue-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wide">Staff Management</h2>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Staff</span>
        </button>
      </div>

      {showCreate && (
        <div className="mb-4 p-3 bg-muted border border-blue-500/20 rounded-xl space-y-2">
          <input
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-white focus:outline-none focus:border-blue-500/50"
          />
          <input
            placeholder="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-white focus:outline-none focus:border-blue-500/50"
          />
          <input
            placeholder="Password (default: changeme123)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-white focus:outline-none focus:border-blue-500/50"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-white focus:outline-none focus:border-blue-500/50"
          >
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button
            onClick={handleCreate}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg transition"
          >
            Create Staff Account
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-[10px] font-mono">
          <thead>
            <tr className="text-muted-foreground/70 border-b border-border uppercase text-[9px]">
              <th className="pb-2 pr-3">User</th>
              <th className="pb-2 pr-3">Username</th>
              <th className="pb-2 pr-3">Role</th>
              <th className="pb-2 pr-3">2FA</th>
              <th className="pb-2 pr-3">Status</th>
              <th className="pb-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/40">
                <td className="py-2.5 pr-3 text-white font-semibold">{u.name}</td>
                <td className="py-2.5 pr-3 text-muted-foreground">{u.username}</td>
                <td className="py-2.5 pr-3">
                  {editingId === u.id ? (
                    <div className="flex gap-1">
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="px-2 py-1 bg-background border border-border rounded text-[9px] text-white"
                      >
                        {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <button onClick={() => handleUpdateRole(u.id)} className="px-2 py-1 bg-blue-600 text-white rounded text-[9px]">Save</button>
                      <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-zinc-700 text-white rounded text-[9px]">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingId(u.id); setEditRole(u.role); }}
                      className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                      {u.role}
                    </button>
                  )}
                </td>
                <td className="py-2.5 pr-3">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${u.twoFactorEnabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-500/20 text-muted-foreground/70'}`}>
                    {u.twoFactorEnabled ? 'ON' : 'OFF'}
                  </span>
                </td>
                <td className="py-2.5 pr-3">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${u.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {u.status}
                  </span>
                </td>
                <td className="py-2.5 text-right">
                  <button
                    onClick={() => handleDeleteUser(u.id, u.name)}
                    className="text-red-400 hover:text-red-300"
                    title="Delete user"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={deleteConfirm.open}
        title="Delete Staff User"
        message={`Remove staff account "${deleteConfirm.name}"? This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDeleteUser}
        onCancel={() => setDeleteConfirm(p => ({ ...p, open: false }))}
      />
    </div>
  );
}
