import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb } from '@/lib/db';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get('zcms_session');
  if (!session?.value) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { serverId, action } = await request.json();
  const db = readDb();
  const cfg = db.settings.integrations?.pterodactyl;
  if (!cfg?.baseUrl || !cfg?.apiKey) return NextResponse.json({ error: 'Not configured' }, { status: 400 });

  try {
    const ep = action === 'suspend' ? 'suspend' : 'unsuspend';
    const res = await fetch(`${cfg.baseUrl}/api/application/servers/${serverId}/${ep}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json', 'Accept': 'Application/vnd.pterodactyl.v1+json' },
    });
    if (!res.ok) return NextResponse.json({ error: 'API error' }, { status: res.status });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
