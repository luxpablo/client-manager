'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, ChevronDown } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I\'m your ZCMS AI assistant. Ask me anything about your business data — customers, revenue, tickets, expenses, and more.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [hasNew, setHasNew] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && !minimized) { setHasNew(false); }
  }, [open, minimized]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      const reply = data.reply || data.error || 'Sorry, I encountered an error.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    } finally {
      setLoading(false);
      if (!open) setHasNew(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const quickActions = [
    'Show me customer summary',
    'How much revenue?',
    'Ticket overview',
    'Expense analysis',
  ];

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => { setOpen(!open); setMinimized(false); if (!open) setHasNew(false); }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-xl shadow-blue-600/30 flex items-center justify-center z-50 transition-all duration-300 hover:scale-110 cursor-pointer relative"
      >
        {open ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
        {hasNew && !open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] font-bold flex items-center justify-center animate-pulse">1</span>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div className={`fixed bottom-24 right-6 w-80 sm:w-96 bg-[#0c0a1e] border border-white/10 rounded-2xl shadow-2xl shadow-blue-600/10 z-50 flex flex-col transition-all duration-300 ${minimized ? 'h-14 overflow-hidden' : 'h-[500px] max-h-[70vh]'}`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">AI Assistant</p>
                <p className="text-[9px] text-zinc-500 font-mono">Powered by ZCMS</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMinimized(!minimized)} className="p-1.5 text-zinc-500 hover:text-zinc-300 transition cursor-pointer">
                <ChevronDown className={`w-4 h-4 transition ${minimized ? '' : 'rotate-180'}`} />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 text-zinc-500 hover:text-zinc-300 transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600/20 border border-blue-500/20 text-blue-100'
                        : 'bg-white/[0.03] border border-white/5 text-zinc-300'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-invert prose-xs max-w-none" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2 text-xs text-zinc-500">
                      <span className="animate-pulse">Thinking</span>
                      <span className="animate-pulse ml-1">.</span>
                      <span className="animate-pulse" style={{ animationDelay: '0.3s' }}>.</span>
                      <span className="animate-pulse" style={{ animationDelay: '0.6s' }}>.</span>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick Actions */}
              {messages.length <= 1 && (
                <div className="px-4 pb-2">
                  <p className="text-[9px] text-zinc-600 font-mono mb-2 uppercase tracking-wider">Quick questions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {quickActions.map((action, i) => (
                      <button key={i} onClick={() => { setInput(action); inputRef.current?.focus(); }}
                        className="px-2 py-1 bg-white/[0.03] border border-white/5 rounded-lg text-[10px] text-zinc-400 hover:text-white hover:border-blue-500/30 transition cursor-pointer">
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="px-4 py-3 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about your data..."
                    className="flex-1 px-3 py-2 bg-[#110e20] border border-white/10 rounded-lg text-xs text-white placeholder-zinc-600 focus:border-blue-500/50 transition outline-none"
                  />
                  <button onClick={handleSend} disabled={!input.trim() || loading}
                    className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 flex items-center justify-center transition disabled:opacity-30 cursor-pointer shrink-0">
                    <Send className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
