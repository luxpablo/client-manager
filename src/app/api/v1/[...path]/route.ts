import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

function getApiKey(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  const key = request.nextUrl.searchParams.get('api_key');
  return key || null;
}

function validateKey(request: NextRequest): { valid: boolean; permission: string } {
  const key = getApiKey(request);
  if (!key) return { valid: false, permission: '' };
  const db = readDb();
  const apiKey = (db.settings.apiKeys || []).find(k => k.key === key);
  if (!apiKey) return { valid: false, permission: '' };
  return { valid: true, permission: apiKey.permissions[0] || 'read' };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const auth = validateKey(request);
  if (!auth.valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { path } = await params;
  const entity = path?.[0];
  if (!entity) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

  const db = readDb();
  const data = (db as any)[entity];
  if (!data) return NextResponse.json({ error: 'Entity not found' }, { status: 404 });

  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  if (id) {
    const item = Array.isArray(data) ? data.find((d: any) => d.id === id) : null;
    if (!item) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    return NextResponse.json(item);
  }

  return NextResponse.json(Array.isArray(data) ? data : []);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const auth = validateKey(request);
  if (!auth.valid || auth.permission === 'read') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { path } = await params;
  const entity = path?.[0];
  if (!entity) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const db = readDb();
  const collection = (db as any)[entity];
  if (!Array.isArray(collection)) return NextResponse.json({ error: 'Entity not found' }, { status: 404 });

  const item = { id: `${entity}-${Date.now()}`, ...body };
  collection.push(item);
  writeDb(db);

  return NextResponse.json(item, { status: 201 });
}
