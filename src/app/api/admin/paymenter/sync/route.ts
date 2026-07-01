import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb } from '@/lib/db';
import { getUsers, getInvoices, getProducts, getServices, getOrders } from '@/lib/paymenter';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get('zcms_session');
  if (!session?.value) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { type } = await request.json();
  const db = readDb();
  const cfg = db.settings.integrations?.paymenter;
  if (!cfg?.baseUrl || !cfg?.apiKey) return NextResponse.json({ error: 'Not configured' }, { status: 400 });

  try {
    const fetchers: Record<string, Function> = { users: getUsers, invoices: getInvoices, products: getProducts, services: getServices, orders: getOrders };
    const fn = fetchers[type];
    if (!fn) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    const data = await fn({ baseUrl: cfg.baseUrl, apiKey: cfg.apiKey });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
