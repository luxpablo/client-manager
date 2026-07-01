'use client';

import React, { useState } from 'react';
import { Send, Plus, X, Clock, Copy, Check, BookOpen, Terminal, Key, Trash2 } from 'lucide-react';

interface Header { key: string; value: string; }
interface HistoryItem { method: string; url: string; status: number; timestamp: Date; }

const PRESETS = [
  { method: 'GET', url: '/api/admin/customers' },
  { method: 'GET', url: '/api/admin/services' },
  { method: 'GET', url: '/api/admin/invoices' },
  { method: 'GET', url: '/api/admin/servers' },
  { method: 'GET', url: '/api/admin/providers' },
  { method: 'GET', url: '/api/admin/tickets' },
  { method: 'GET', url: '/api/admin/expenses' },
  { method: 'GET', url: '/api/admin/domains' },
  { method: 'GET', url: '/api/admin/assets' },
  { method: 'GET', url: '/api/admin/logs' },
  { method: 'GET', url: '/api/admin/notifications' },
  { method: 'GET', url: '/api/admin/settings' },
  { method: 'GET', url: '/api/admin/users' },
  { method: 'GET', url: '/api/auth/me' },
  { method: 'POST', url: '/api/admin/customers', body: '{\n  "name": "New Customer",\n  "email": "customer@example.com"\n}' },
  { method: 'POST', url: '/api/admin/tickets', body: '{\n  "customerId": "cust-",\n  "title": "Support Ticket",\n  "message": "Issue description..."\n}' },
  { method: 'POST', url: '/api/admin/expenses', body: '{\n  "category": "Hosting",\n  "description": "Server rental",\n  "amount": 99.99,\n  "vendor": "Hetzner"\n}' },
  { method: 'POST', url: '/api/admin/paymenter/sync', body: '{\n  "type": "customers"\n}' },
  { method: 'POST', url: '/api/admin/pterodactyl/sync', body: '{\n  "type": "servers"\n}' },
  { method: 'POST', url: '/api/admin/pterodactyl/action', body: '{\n  "serverId": 1,\n  "action": "suspend"\n}' },
  { method: 'GET', url: '/api/events' },
  { method: 'GET', url: '/api/v1/customers' },
  { method: 'GET', url: '/api/v1/services' },
  { method: 'POST', url: '/api/v1/tickets', body: '{\n  "title": "API Test",\n  "description": "Created via REST API"\n}' },
];

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-emerald-400 bg-emerald-950/30 border-emerald-900/30',
  POST: 'text-blue-400 bg-blue-950/30 border-blue-900/30',
  PUT: 'text-yellow-400 bg-yellow-950/30 border-yellow-900/30',
  DELETE: 'text-red-400 bg-red-950/30 border-red-900/30',
};

export default function ApiConsole() {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('/api/admin/customers');
  const [headers, setHeaders] = useState<Header[]>([{ key: 'Content-Type', value: 'application/json' }]);
  const [body, setBody] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [response, setResponse] = useState<{ status: number; statusText: string; headers: string; body: string; size: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showDocs, setShowDocs] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rawToggle, setRawToggle] = useState(false);

  const addHeader = () => setHeaders([...headers, { key: '', value: '' }]);
  const removeHeader = (i: number) => setHeaders(headers.filter((_, idx) => idx !== i));
  const updateHeader = (i: number, field: 'key' | 'value', val: string) => {
    const h = [...headers]; h[i][field] = val; setHeaders(h);
  };

  const sendRequest = async () => {
    setLoading(true);
    setResponse(null);
    try {
      const h: Record<string, string> = {};
      headers.forEach(hh => { if (hh.key) h[hh.key] = hh.value; });
      if (apiKey && !h['X-API-Key']) h['X-API-Key'] = apiKey;

      const opts: RequestInit = { method };
      if (method !== 'GET' && method !== 'DELETE' && body) opts.body = body;
      opts.headers = h;

      const res = await fetch(url, opts);

      let resBody: string;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('json')) {
        try { const json = await res.json(); resBody = JSON.stringify(json, null, rawToggle ? 0 : 2); }
        catch { resBody = await res.text(); }
      } else {
        resBody = await res.text();
      }

      const resHeaders: string[] = [];
      res.headers.forEach((v, k) => resHeaders.push(`${k}: ${v}`));

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers: resHeaders.join('\n'),
        body: resBody,
        size: new Blob([resBody]).size,
      });

      setHistory(prev => [{ method, url, status: res.status, timestamp: new Date() }, ...prev].slice(0, 20));
    } catch (e: any) {
      setResponse({
        status: 0,
        statusText: 'Network Error',
        headers: '',
        body: e.message || 'Request failed',
        size: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(response.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const loadPreset = (preset: typeof PRESETS[0]) => {
    setMethod(preset.method);
    setUrl(preset.url);
    if (preset.body) setBody(preset.body);
    else setBody('');
    setResponse(null);
  };

  const clearHistory = () => setHistory([]);

  const isV1 = url.startsWith('/api/v1/');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-blue-400" />
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">API Console</h1>
            <p className="text-xs text-muted-foreground/70">Test endpoints directly from the browser.</p>
          </div>
        </div>
        <button onClick={() => setShowDocs(!showDocs)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border hover:border-blue-800/40 rounded-lg text-[10px] text-muted-foreground hover:text-blue-400 font-bold uppercase tracking-wider transition cursor-pointer">
          <BookOpen className="w-3.5 h-3.5" />
          <span>{showDocs ? 'Hide' : 'Show'} Endpoints</span>
        </button>
      </div>

      {/* Preset endpoints */}
      {showDocs && (
        <div className="bg-background border border-border rounded-2xl p-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Available Endpoints</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-80 overflow-y-auto">
            {PRESETS.map((p, i) => (
              <button key={i} onClick={() => loadPreset(p)}
                className="flex items-center gap-2 p-2.5 bg-muted hover:bg-blue-950/10 border border-border hover:border-blue-800/30 rounded-lg text-xs text-left transition cursor-pointer">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase ${METHOD_COLORS[p.method]}`}>{p.method}</span>
                <span className="text-zinc-300 font-mono text-[10px] truncate">{p.url}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Request Builder */}
        <div className="bg-background border border-border rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Request</h3>

          {/* Method + URL */}
          <div className="flex gap-2">
            <select value={method} onChange={e => setMethod(e.target.value)}
              className={`px-2 py-2 rounded-lg text-xs font-bold font-mono border ${METHOD_COLORS[method] || 'text-muted-foreground bg-zinc-950/30 border-zinc-800/30'}`}>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
            <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="/api/admin/customers"
              className="flex-1 px-3 py-2 bg-muted border border-border rounded-lg text-xs text-zinc-200 font-mono placeholder-zinc-600" />
          </div>

          {/* API Key (shown for v1 endpoints) */}
          {isV1 && (
            <div className="flex gap-2 items-center">
              <Key className="w-4 h-4 text-amber-400 shrink-0" />
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Enter your API key for v1 endpoints..."
                className="flex-1 px-3 py-2 bg-muted border border-amber-800/40 rounded-lg text-xs text-zinc-200 font-mono placeholder-zinc-600" />
            </div>
          )}

          {/* Headers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-muted-foreground/70 font-bold">Headers</span>
              <button onClick={addHeader} className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-bold uppercase cursor-pointer">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            {headers.map((h, i) => (
              <div key={i} className="flex gap-2">
                <input type="text" value={h.key} onChange={e => updateHeader(i, 'key', e.target.value)} placeholder="Header name"
                  className="flex-1 px-2.5 py-1.5 bg-muted border border-border rounded-lg text-[11px] text-zinc-300 font-mono placeholder-zinc-600" />
                <input type="text" value={h.value} onChange={e => updateHeader(i, 'value', e.target.value)} placeholder="Value"
                  className="flex-[2] px-2.5 py-1.5 bg-muted border border-border rounded-lg text-[11px] text-zinc-300 font-mono placeholder-zinc-600" />
                <button onClick={() => removeHeader(i)} className="p-1.5 text-muted-foreground/70 hover:text-red-400 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>

          {/* Body */}
          {method !== 'GET' && (
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase text-muted-foreground/70 font-bold">Request Body (JSON)</span>
              <textarea value={body} onChange={e => setBody(e.target.value)} rows={8}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-zinc-300 font-mono leading-relaxed resize-none placeholder-zinc-600"
                placeholder='{"key": "value"}' />
            </div>
          )}

          <button onClick={sendRequest} disabled={loading || !url}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-muted-foreground/50 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition flex items-center justify-center gap-2 shadow cursor-pointer">
            <Send className="w-4 h-4" />
            <span>{loading ? 'Sending...' : 'Send Request'}</span>
          </button>
        </div>

        {/* Response Viewer */}
        <div className="bg-background border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Response</h3>
            <div className="flex items-center gap-3">
              {response && (
                <>
                  <span className="text-[9px] text-muted-foreground/50 font-mono">{(response.size / 1024).toFixed(1)} KB</span>
                  <label className="flex items-center gap-1 text-[10px] text-muted-foreground/70 cursor-pointer">
                    <input type="checkbox" checked={rawToggle} onChange={e => setRawToggle(e.target.checked)} className="accent-blue-500 w-3 h-3" />
                    <span>Raw</span>
                  </label>
                  <button onClick={copyResponse} className="flex items-center gap-1 text-[10px] text-muted-foreground/70 hover:text-blue-400 font-bold uppercase cursor-pointer">
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {!response && !loading && (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground/50">
              <Terminal className="w-8 h-8 mb-3 opacity-30" />
              <p className="text-xs font-mono">Send a request to see the response</p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span>Sending request...</span>
              </div>
            </div>
          )}

          {response && !loading && (
            <div className="space-y-3">
              {/* Status */}
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono ${
                  response.status >= 200 && response.status < 300 ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/30' :
                  response.status >= 400 && response.status < 500 ? 'bg-red-950/30 text-red-400 border border-red-900/30' :
                  response.status >= 500 ? 'bg-red-950/30 text-red-400 border border-red-900/30' :
                  response.status === 0 ? 'bg-red-950/30 text-red-400 border border-red-900/30' :
                  'bg-yellow-950/30 text-yellow-400 border border-yellow-900/30'
                }`}>{response.status} {response.statusText}</span>
              </div>

              {/* Response Headers */}
              <details className="text-[10px]">
                <summary className="text-muted-foreground/70 hover:text-zinc-300 cursor-pointer font-mono">Response Headers</summary>
                <pre className="mt-1 p-2 bg-background border border-border rounded-lg text-[10px] text-muted-foreground font-mono overflow-x-auto whitespace-pre-wrap">{response.headers}</pre>
              </details>

              {/* Response Body */}
              <div className="relative">
                <pre className="p-3 bg-background border border-border rounded-lg text-[11px] text-zinc-300 font-mono leading-relaxed overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">{response.body}</pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-background border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground/70" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Request History</h3>
            </div>
            <button onClick={clearHistory} className="flex items-center gap-1 text-[10px] text-muted-foreground/70 hover:text-red-400 font-bold uppercase cursor-pointer">
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((h, i) => (
              <button key={i} onClick={() => { setMethod(h.method); setUrl(h.url); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted hover:bg-blue-950/10 border border-border rounded-lg text-[10px] transition cursor-pointer">
                <span className={`px-1 py-0.5 rounded text-[8px] font-bold font-mono uppercase ${METHOD_COLORS[h.method] || 'text-muted-foreground'}`}>{h.method}</span>
                <span className={`font-mono ${h.status >= 200 && h.status < 300 ? 'text-emerald-400' : 'text-red-400'}`}>{h.status}</span>
                <span className="text-muted-foreground font-mono max-w-[200px] truncate">{h.url}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
