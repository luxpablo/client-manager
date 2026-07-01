import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, writeDb } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(new URL('/?error=discord_auth_failed', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'));
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/?error=discord_not_configured', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'));
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/auth/discord/callback`;

  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Discord token exchange failed:', errText);
      return NextResponse.redirect(new URL('/?error=discord_token_failed', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userRes.ok) {
      return NextResponse.redirect(new URL('/?error=discord_userinfo_failed', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'));
    }

    const profile = await userRes.json();
    const discordId = profile.id;
    const username = profile.username;
    const email = profile.email || `${username}@discord.local`;
    const name = profile.global_name || username;

    const db = readDb();
    let user = db.users.find(u => u.oauth?.discord?.id === discordId);

    if (!user) {
      user = db.users.find(u => u.username === email);
      if (user) {
        user.oauth = { ...user.oauth, discord: { id: discordId, username } };
      } else {
        const newUser = {
          id: `user-discord-${Date.now()}`,
          username: email,
          passwordHash: '',
          name,
          role: 'Admin' as const,
          status: 'Active' as const,
          twoFactorEnabled: false,
          createdAt: new Date().toISOString(),
          oauth: { discord: { id: discordId, username } },
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
      httpOnly: true, secure: false, sameSite: 'lax',
      path: '/', maxAge: 60 * 60 * 24 * 7,
    });

    return NextResponse.redirect(new URL('/dashboard', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'));
  } catch (err: any) {
    console.error('Discord OAuth callback error:', err);
    return NextResponse.redirect(new URL('/?error=discord_callback_error', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'));
  }
}
