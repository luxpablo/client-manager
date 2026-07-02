import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

export async function GET(request: Request) {
  const db = readDb();
  const user = db.users.find(u => u.username === 'admin');
  if (!user) {
    return NextResponse.redirect(new URL('/?error=demo_unavailable', request.url));
  }

  const sessionPayload = { id: user.id, username: user.username, name: user.name, role: user.role };
  const sessionBase64 = Buffer.from(JSON.stringify(sessionPayload)).toString('base64');

  const response = NextResponse.redirect(new URL('/dashboard', request.url));
  response.cookies.set('zcms_session', sessionBase64, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
    path: '/', maxAge: 60 * 60 * 24,
  });

  return response;
}
