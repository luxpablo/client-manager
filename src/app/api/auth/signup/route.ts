import { NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    const db = readDb();
    if (db.users.some(u => u.username === email)) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const newUser = {
      id: `user-${Date.now()}`,
      username: email,
      passwordHash: password,
      name,
      role: 'Admin' as const,
      status: 'Active' as const,
      twoFactorEnabled: false,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    writeDb(db);

    return NextResponse.json({ success: true, message: 'Account created. You can now sign in.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
