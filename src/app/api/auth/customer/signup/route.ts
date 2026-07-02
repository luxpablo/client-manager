import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, writeDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { name, email, password, companyName, country } = await request.json();
    if (!name || !email || !password) return NextResponse.json({ error: 'Name, email, and password required' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });

    const db = readDb();
    if (db.customers.some(c => c.email === email)) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });

    const customer = {
      id: `cust-${Date.now()}`,
      name,
      companyName: companyName || '',
      email,
      passwordHash: password,
      phone: '',
      discord: '',
      country: country || 'United States',
      notes: '',
      status: 'Active' as const,
      joinDate: new Date().toISOString(),
      totalSpending: 0,
      staffNotes: '',
    };
    db.customers.push(customer);
    writeDb(db);

    const session = { id: customer.id, email: customer.email, name: customer.name, type: 'customer' };
    const cookieStore = await cookies();
    cookieStore.set('zcms_customer', Buffer.from(JSON.stringify(session)).toString('base64'), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 7 * 86400,
    });

    return NextResponse.json({ success: true, customer: session });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
