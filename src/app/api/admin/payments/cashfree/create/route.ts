import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { amount, invoiceId, customerEmail, customerName, customerPhone } = await request.json();
    if (!amount || !customerEmail) {
      return NextResponse.json({ error: 'Amount and customerEmail required' }, { status: 400 });
    }

    const db = readDb();
    const gw = db.settings?.paymentGateways?.cashfree;
    if (!gw?.enabled || !gw.appId || !gw.secretKey) {
      return NextResponse.json({ error: 'Cashfree not configured' }, { status: 400 });
    }

    const baseUrl = gw.mode === 'live' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';
    const orderId = `CF-${invoiceId || 'order'}-${Date.now()}`;
    const returnUrl = `${request.headers.get('origin') || 'http://localhost:3000'}/dashboard?payment=cashfree&order_id={order_id}`;

    const cfResponse = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': gw.appId,
        'x-client-secret': gw.secretKey,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: Number(amount),
        order_currency: 'INR',
        customer_details: { customer_id: customerEmail.replace(/[^a-zA-Z0-9]/g, '_'), customer_email: customerEmail, customer_name: customerName || 'Customer', customer_phone: customerPhone || '9999999999' },
        order_meta: { return_url: returnUrl },
        order_note: invoiceId ? `Payment for invoice ${invoiceId}` : 'Service payment',
      }),
    });

    if (!cfResponse.ok) {
      const err = await cfResponse.text();
      return NextResponse.json({ error: `Cashfree API error: ${err}` }, { status: 502 });
    }

    const data = await cfResponse.json();
    return NextResponse.json({ paymentSessionId: data.payment_session_id, orderId: data.order_id, amount: data.order_amount, link: data.order_link });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
