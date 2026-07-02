'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertCircle, Lightbulb, ArrowRight, RefreshCw } from 'lucide-react';

interface Insight {
  icon: typeof TrendingUp;
  color: string;
  title: string;
  description: string;
  type: 'positive' | 'negative' | 'neutral';
}

export default function AIInsights() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Generate 3 business insights based on my data. Keep each under 100 characters.' }),
      });
      const data = await res.json();
      if (data.reply) {
        const lines: string[] = data.reply.split('\n').filter((l: string) => l.trim().length > 10).slice(0, 3);
        const icons = [TrendingUp, AlertCircle, Lightbulb] as const;
        const colors = ['text-emerald-400', 'text-amber-400', 'text-blue-400'];
        const types: Insight['type'][] = ['positive', 'negative', 'neutral'];
        setInsights(lines.map((line: string, i: number) => ({
          icon: icons[i % 3],
          color: colors[i % 3],
          title: line.replace(/^\d+[\.\)]\s*/, '').replace(/\*\*/g, '').split(':')[0] || 'Insight',
          description: line.replace(/^\d+[\.\)]\s*/, '').replace(/\*\*/g, ''),
          type: types[i % 3],
        })));
      }
    } catch {
      setInsights([
        { icon: TrendingUp, color: 'text-emerald-400', title: 'Data Overview Available', description: 'Use the AI Assistant to ask questions about your business data.', type: 'positive' },
        { icon: Lightbulb, color: 'text-blue-400', title: 'Analytics Ready', description: 'Check the Reports tab for detailed financial analysis.', type: 'neutral' },
        { icon: AlertCircle, color: 'text-amber-400', title: 'Keep Data Updated', description: 'Regular data entry ensures accurate AI-powered insights.', type: 'negative' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { generateInsights(); }, []);

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Insights</h3>
        </div>
        <button onClick={generateInsights} disabled={loading} className="text-zinc-500 hover:text-white transition cursor-pointer disabled:opacity-30">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-white/5 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-white/5 rounded w-1/3" />
                <div className="h-2.5 bg-white/5 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition">
              <div className={`w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 ${insight.color}`}>
                <insight.icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-white truncate">{insight.title}</p>
                <p className="text-[10px] text-zinc-500 leading-relaxed mt-0.5">{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
