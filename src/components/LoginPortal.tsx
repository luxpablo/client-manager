'use client';

import React, { useState } from 'react';
import { KeyRound, ShieldAlert, Cpu } from 'lucide-react';

interface LoginPortalProps {
  onLoginSuccess: (user: { id: string; username: string; name: string; role: string }) => void;
}

export default function LoginPortal({ onLoginSuccess }: LoginPortalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [require2FA, setRequire2FA] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await new Promise(r => setTimeout(r, 600));
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, code: require2FA ? code : undefined })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.require2FA) {
        setRequire2FA(true);
        setError('');
      } else if (data.success) {
        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background text-zinc-100 overflow-hidden font-sans">
      {/* Background Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[100px] animate-pulse-slow pointer-events-none" />

      <div className="w-full max-w-md p-8 glass-panel rounded-2xl border border-border shadow-2xl relative z-10 mx-4">
        {/* Logo and Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-blue-950/50 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 mb-3 shadow-lg glow-blue-sm">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white bg-gradient-to-r from-white via-blue-300 to-blue-500 bg-clip-text text-transparent">
            ZYPHRON CLOUD
          </h1>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">
            Internal Operations Portal
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-950/30 border border-red-500/30 rounded-lg flex items-center gap-2 text-xs text-red-300">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {!require2FA ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-[#110e20] border border-border rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition"
                  placeholder="Enter staff username"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#110e20] border border-border rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition"
                  placeholder="••••••••"
                />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-lg text-xs text-blue-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                  2FA Authentication Required
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Authenticator Key: <code className="text-blue-300 font-mono select-all">KVKVE43VORYVQSKK</code>
                </p>
                <p className="text-[11px] text-muted-foreground/70">
                  (Type any 6-digit number to proceed for local simulation)
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Two-Factor Security Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-3 bg-[#110e20] border border-border rounded-lg text-center font-mono text-lg tracking-[0.5em] text-white focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition"
                  placeholder="000000"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-medium rounded-lg text-sm transition shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
          >
            {loading ? 'Authenticating...' : require2FA ? 'Verify & Continue' : 'Sign In to ZCMS'}
          </button>
        </form>

        {/* Default login hint */}
        <div className="mt-8 pt-6 border-t border-border/50 text-center">
          <p className="text-[11px] text-muted-foreground/70 font-semibold uppercase tracking-wider">
            Default: <span className="text-blue-400 font-mono">admin</span> / <span className="text-blue-400 font-mono">admin123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
