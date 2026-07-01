import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, logAction } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { username, password, code } = await request.json();
    const db = readDb();
    const user = db.users.find(u => u.username === username);

    if (!user || user.passwordHash !== password) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    if (user.status !== 'Active') {
      return NextResponse.json({ error: 'Account is suspended' }, { status: 403 });
    }

    if (user.twoFactorEnabled) {
      if (!code) {
        return NextResponse.json({ require2FA: true, twoFactorSecret: user.twoFactorSecret });
      }
      if (!/^\d{6}$/.test(code)) {
        return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 401 });
      }
    }

    const sessionPayload = { id: user.id, username: user.username, name: user.name, role: user.role };
    const sessionBase64 = Buffer.from(JSON.stringify(sessionPayload)).toString('base64');

    const cookieStore = await cookies();
    cookieStore.set('zcms_session', sessionBase64, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
      path: '/', maxAge: 60 * 60 * 24 * 7,
    });

    await logAction(user.name, 'Staff Logged In', `Successfully logged in.`, request.headers.get('x-forwarded-for') || '127.0.0.1');

    return NextResponse.json({ success: true, user: sessionPayload });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
