import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb } from '@/lib/db';
import { testConnection } from '@/lib/paymenter';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('zcms_session');
  if (!session?.value) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = readDb();
  const cfg = db.settings.integrations?.paymenter;
  if (!cfg?.baseUrl || !cfg?.apiKey) return NextResponse.json({ error: 'Not configured' }, { status: 400 });

  try {
    const connected = await testConnection({ baseUrl: cfg.baseUrl, apiKey: cfg.apiKey });
    if (connected) return NextResponse.json({ connected: true });
    return NextResponse.json({ connected: false, error: 'Connection failed' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ connected: false, error: e.message }, { status: 500 });
  }
}
