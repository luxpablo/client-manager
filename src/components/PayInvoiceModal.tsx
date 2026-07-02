'use client';

import React, { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/Toaster';

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  amount: number;
  tax: number;
  discount: number;
  status: string;
  customer?: { name: string; email: string };
}

export default function PayInvoiceModal({
  invoice,
  onClose,
  onPaid,
}: {
  invoice: Invoice;
  onClose: () => void;
  onPaid: () => void;
}) {
  const { toast } = useToast();
  const [gateway, setGateway] = useState<'cashfree' | 'paypal'>('paypal');
  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState('');
  const [orderId, setOrderId] = useState('');

  const total = invoice.amount + invoice.tax - invoice.discount;

  const handlePay = async () => {
    setLoading(true);
    try {
      if (gateway === 'cashfree') {
        const res = await fetch('/api/admin/payments/cashfree/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: total,
            invoiceId: invoice.invoiceNumber,
            customerEmail: invoice.customer?.email || 'customer@example.com',
            customerName: invoice.customer?.name || 'Customer',
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setPaymentLink(data.link || '');
          setOrderId(data.orderId);
          toast('success', 'Cashfree payment session created');
        } else { toast('error', data.error || 'Cashfree payment failed'); }
      } else {
        const res = await fetch('/api/admin/payments/paypal/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: total,
            invoiceId: invoice.invoiceNumber,
            description: `Payment for ${invoice.invoiceNumber}`,
          }),
        });
        const data = await res.json();
        if (res.ok && data.approvalLink) {
          setPaymentLink(data.approvalLink);
          setOrderId(data.orderId);
          toast('success', 'PayPal order created');
        } else { toast('error', data.error || 'PayPal payment failed'); }
      }
    } catch { toast('error', 'Failed to process payment'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-bold text-white">Pay Invoice</h2>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] text-zinc-500 font-mono">Invoice</p>
              <p className="text-sm font-bold text-white">{invoice.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-zinc-500 font-mono">Total</p>
              <p className="text-lg font-bold text-emerald-400">${total.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <button onClick={() => setGateway('paypal')}
            className={`flex-1 p-3 rounded-xl border text-center transition cursor-pointer ${gateway === 'paypal' ? 'border-blue-500 bg-blue-950/20' : 'border-white/10 bg-white/[0.02]'}`}>
            <DollarSign className="w-5 h-5 mx-auto mb-1 text-blue-400" />
            <p className="text-[10px] font-bold text-white">PayPal</p>
          </button>
          <button onClick={() => setGateway('cashfree')}
            className={`flex-1 p-3 rounded-xl border text-center transition cursor-pointer ${gateway === 'cashfree' ? 'border-blue-500 bg-blue-950/20' : 'border-white/10 bg-white/[0.02]'}`}>
            <CreditCard className="w-5 h-5 mx-auto mb-1 text-cyan-400" />
            <p className="text-[10px] font-bold text-white">Cashfree</p>
          </button>
        </div>

        {paymentLink ? (
          <div className="space-y-3">
            <div className="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-center">
              <p className="text-xs text-emerald-400 font-semibold">Payment link ready</p>
              <p className="text-[10px] text-zinc-500 mt-1 font-mono">Order: {orderId}</p>
            </div>
            <a href={paymentLink} target="_blank" rel="noopener noreferrer"
              className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-2">
              <ExternalLink className="w-4 h-4" /> Pay Now
            </a>
            <button onClick={() => { setPaymentLink(''); setOrderId(''); }}
              className="w-full py-2 text-[10px] text-zinc-500 hover:text-white transition cursor-pointer">
              Cancel &amp; try different method
            </button>
          </div>
        ) : (
          <button onClick={handlePay} disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 cursor-pointer">
            {loading ? 'Processing...' : `Pay $${total.toFixed(2)} via ${gateway === 'paypal' ? 'PayPal' : 'Cashfree'}`}
          </button>
        )}
      </div>
    </div>
  );
}
