'use client';

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'default', onConfirm, onCancel }: ConfirmModalProps) {
  if (!open) return null;

  const confirmColors = variant === 'danger'
    ? 'bg-red-600 hover:bg-red-500'
    : variant === 'warning'
    ? 'bg-amber-600 hover:bg-amber-500'
    : 'bg-blue-600 hover:bg-blue-500';

  return (
    <div className="fixed inset-0 bg-[#03000a]/80 backdrop-blur-sm flex items-center justify-center z-[90]">
      <div className="bg-background border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-scale-in">
        <div className="flex items-start gap-3 mb-4">
          <div className={`p-2 rounded-xl ${variant === 'danger' ? 'bg-red-950/40 text-red-400' : variant === 'warning' ? 'bg-amber-950/40 text-amber-400' : 'bg-blue-950/40 text-blue-400'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-white">{title}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{message}</p>
          </div>
          <button onClick={onCancel} className="text-muted-foreground/70 hover:text-zinc-300">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 bg-muted border border-border text-muted-foreground hover:text-white text-xs font-semibold rounded-lg transition">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-white text-xs font-semibold rounded-lg transition ${confirmColors}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
