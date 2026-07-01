import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb } from '@/lib/db';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = cookieStore.get('zcms_session');
  if (!session?.value) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { type } = await request.json();
  const db = readDb();
  const cfg = db.settings.integrations?.pterodactyl;
  if (!cfg?.baseUrl || !cfg?.apiKey) return NextResponse.json({ error: 'Not configured' }, { status: 400 });

  try {
    const base = cfg.baseUrl.replace(/\/+$/, '');
    const endpoints: Record<string, string> = {
      servers: '/api/application/servers',
      nodes: '/api/application/nodes',
      users: '/api/application/users',
    };
    const ep = endpoints[type];
    if (!ep) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    const headers = { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json', 'Accept': 'Application/vnd.pterodactyl.v1+json' };

    // Fetch all pages
    let allData: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await fetch(`${base}${ep}?page=${page}`, { headers });
      if (!res.ok) {
        let detail = `Pterodactyl API error (${res.status})`;
        try { const err = await res.json(); detail = err.errors?.[0]?.detail || err.error || detail; } catch {}
        return NextResponse.json({ error: detail }, { status: res.status });
      }

      const data = await res.json();
      const items = data.data || [];
      allData = allData.concat(items);

      const pagination = data.meta?.pagination || data.meta;
      if (pagination) {
        hasMore = pagination.current_page < pagination.total_pages;
        page++;
      } else {
        hasMore = false;
      }
    }

    return NextResponse.json(allData);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
