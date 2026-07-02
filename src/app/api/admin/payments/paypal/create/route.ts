import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { amount, invoiceId, description, returnUrl: customReturn } = await request.json();
    if (!amount) {
      return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
    }

    const db = readDb();
    const gw = db.settings?.paymentGateways?.paypal;
    if (!gw?.enabled || !gw.clientId || !gw.secret) {
      return NextResponse.json({ error: 'PayPal not configured' }, { status: 400 });
    }

    const baseUrl = gw.mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
    const returnUrl = customReturn || `${request.headers.get('origin') || 'http://localhost:3000'}/dashboard?payment=paypal`;

    const authRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${Buffer.from(`${gw.clientId}:${gw.secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });

    if (!authRes.ok) {
      const err = await authRes.text();
      return NextResponse.json({ error: `PayPal auth error: ${err}` }, { status: 502 });
    }

    const authData = await authRes.json();
    const accessToken = authData.access_token;

    const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: invoiceId || `order-${Date.now()}`,
          description: description || 'Service payment',
          amount: { currency_code: 'USD', value: Number(amount).toFixed(2) },
        }],
        payment_source: { paypal: { experience_context: { return_url: returnUrl, cancel_url: returnUrl.replace('?payment=', '?cancel=') } } },
      }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.text();
      return NextResponse.json({ error: `PayPal order error: ${err}` }, { status: 502 });
    }

    const orderData = await orderRes.json();
    const approvalLink = orderData.links?.find((l: any) => l.rel === 'approve')?.href;

    return NextResponse.json({ orderId: orderData.id, status: orderData.status, approvalLink });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
