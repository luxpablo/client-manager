import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

    const db = readDb();
    const customer = db.customers.find(c => c.email === email && c.passwordHash && c.status === 'Active');
    if (!customer || customer.passwordHash !== password) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

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
