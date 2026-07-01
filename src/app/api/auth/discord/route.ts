import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL('/?error=discord_not_configured', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'));
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/auth/discord/callback`;
  const state = Buffer.from(JSON.stringify({ r: Math.random().toString(36).slice(2) })).toString('base64url');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email',
    state,
  });

  return NextResponse.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
}
