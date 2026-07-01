import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb } from '@/lib/db';

async function getAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('zcms_session');
  if (!session?.value) return null;
  try { return JSON.parse(Buffer.from(session.value, 'base64').toString('utf8')); } catch { return null; }
}

export async function GET() {
  const user = await getAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = readDb();
  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    author: 'ZCMS Backup Engine',
    data: db,
  });
}
