import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb } from '@/lib/db';

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('zcms_customer');
  if (!sessionCookie?.value) return NextResponse.json({ authenticated: false });

  try {
    const session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf8'));
    const db = readDb();
    const customer = db.customers.find(c => c.id === session.id && c.status === 'Active');
    if (!customer) return NextResponse.json({ authenticated: false });
    return NextResponse.json({ authenticated: true, customer: { id: customer.id, email: customer.email, name: customer.name } });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
