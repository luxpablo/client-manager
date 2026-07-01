import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, writeDb } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/?error=google_auth_failed', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/?error=google_not_configured', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'));
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/auth/google/callback`;

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Google token exchange failed:', errText);
      return NextResponse.redirect(new URL('/?error=google_token_failed', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(new URL('/?error=google_userinfo_failed', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'));
    }

    const profile = await userRes.json();
    const googleId = profile.id;
    const email = profile.email;
    const name = profile.name || email.split('@')[0];

    const db = readDb();
    let user = db.users.find(u => u.oauth?.google?.id === googleId);

    if (!user) {
      user = db.users.find(u => u.username === email);
      if (user) {
        user.oauth = { ...user.oauth, google: { id: googleId, email } };
      } else {
        const newUser = {
          id: `user-google-${Date.now()}`,
          username: email,
          passwordHash: '',
          name,
          role: 'Admin' as const,
          status: 'Active' as const,
          twoFactorEnabled: false,
          createdAt: new Date().toISOString(),
          oauth: { google: { id: googleId, email } },
        };
        db.users.push(newUser);
        user = newUser;
      }
      writeDb(db);
    }

    const sessionPayload = { id: user.id, username: user.username, name: user.name, role: user.role };
    const sessionBase64 = Buffer.from(JSON.stringify(sessionPayload)).toString('base64');

    const cookieStore = await cookies();
    cookieStore.set('zcms_session', sessionBase64, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax',
      path: '/', maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.redirect(new URL('/dashboard', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'));
  } catch (err: any) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(new URL('/?error=google_callback_error', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'));
  }
}
