import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, writeDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { planId, billingCycle } = await request.json();
    if (!planId) return NextResponse.json({ error: 'Plan ID required' }, { status: 400 });

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('zcms_customer');
    if (!sessionCookie?.value) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf8'));
    const db = readDb();

    const customer = db.customers.find(c => c.id === session.id);
    if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    const plan = db.pricingPlans.find(p => p.id === planId && p.status === 'Active');
    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

    const cycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const price = cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
    const billingLabel = cycle === 'yearly' ? 'Annual' : 'Monthly';
    const renewalDate = new Date(Date.now() + (cycle === 'yearly' ? 365 : 30) * 86400000);

    const service = {
      id: `srv-${Date.now()}`,
      customerId: customer.id,
      type: plan.type,
      planName: plan.name,
      cpu: plan.features[0] || '1 Core',
      ram: plan.features[1] || '1 GB',
      storage: plan.features[2] || '20 GB',
      bandwidth: '1 TB',
      location: 'Auto',
      ipv4: '',
      ipv6: '',
      username: customer.email.split('@')[0],
      passwordHash: 'changeme',
      panelUrl: '',
      panelUsername: '',
      panelPassword: '',
      provider: 'System',
      nodeName: '',
      hostMachine: '',
      purchaseCost: plan.setupFee,
      sellingPrice: price,
      billingCycle: billingLabel,
      issueDate: new Date().toISOString(),
      nextRenewalDate: renewalDate.toISOString(),
      expiryDate: renewalDate.toISOString(),
      autoRenewal: true,
      status: 'Pending',
      internalNotes: 'Self-service order',
      serverId: undefined,
    };

    db.services.push(service);
    writeDb(db);

    return NextResponse.json({ success: true, service });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
