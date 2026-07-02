import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb } from '@/lib/db';

export async function GET() {
  const db = readDb();
  const user = db.users.find(u => u.username === 'admin');
  if (!user) {
    return NextResponse.redirect(new URL('/?error=demo_unavailable', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'));
  }

  const sessionPayload = { id: user.id, username: user.username, name: user.name, role: user.role };
  const sessionBase64 = Buffer.from(JSON.stringify(sessionPayload)).toString('base64');

  const cookieStore = await cookies();
  cookieStore.set('zcms_session', sessionBase64, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    path: '/', maxAge: 60 * 60 * 24,
  });

  return NextResponse.redirect(new URL('/dashboard', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'));
}
