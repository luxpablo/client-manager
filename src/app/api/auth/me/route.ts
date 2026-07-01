import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('zcms_session');
    if (!sessionCookie?.value) {
      return NextResponse.json({ authenticated: false });
    }

    const payloadStr = Buffer.from(sessionCookie.value, 'base64').toString('utf8');
    const session = JSON.parse(payloadStr);

    const db = readDb();
    const user = db.users.find(u => u.id === session.id);
    if (!user || user.status !== 'Active') {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    });
  } catch {
    return NextResponse.json({ authenticated: false });
  }
}
