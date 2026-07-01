import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb } from '@/lib/db';
import nodemailer from 'nodemailer';

async function getAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('zcms_session');
  if (!session?.value) return null;
  try { return JSON.parse(Buffer.from(session.value, 'base64').toString('utf8')); } catch { return null; }
}

export async function POST(request: Request) {
  const user = await getAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { to, subject, html, text } = await request.json();
    if (!to || !subject) return NextResponse.json({ error: 'Missing required fields: to, subject' }, { status: 400 });

    const db = readDb();
    const smtp = db.settings.smtp;
    if (!smtp?.host || !smtp?.user || !smtp?.pass) {
      return NextResponse.json({ error: 'SMTP not configured. Go to Settings > SMTP to set up.' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass },
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `"${smtp.fromName}" <${smtp.fromEmail}>`,
      to,
      subject,
      ...(html ? { html } : { text }),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
