import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb } from '@/lib/db';

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get('zcms_session');
  if (!session?.value) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = readDb();
  const cfg = db.settings.integrations?.pterodactyl;
  if (!cfg?.baseUrl || !cfg?.apiKey) return NextResponse.json({ error: 'Not configured' }, { status: 400 });

  try {
    const base = cfg.baseUrl.replace(/\/+$/, '');
    const res = await fetch(`${base}/api/application/nodes`, {
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Accept': 'Application/vnd.pterodactyl.v1+json' },
    });

    if (res.ok) return NextResponse.json({ connected: true });

    let detail = `Connection failed (${res.status})`;
    try { const err = await res.json(); detail = err.errors?.[0]?.detail || err.error || detail; } catch {}
    return NextResponse.json({ connected: false, error: detail }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ connected: false, error: e.message }, { status: 500 });
  }
}
