import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, writeDb, logAction, DatabaseSchema } from '@/lib/db';

async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('zcms_session');
  if (!sessionCookie?.value) return null;
  try {
    return JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf8'));
  } catch { return null; }
}

export async function GET(request: Request, { params }: { params: Promise<{ entity: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { entity } = await params;
  const { searchParams } = new URL(request.url);
  const db = readDb();

  try {
    switch (entity) {
      case 'customers': {
        let items = [...db.customers];
        if (searchParams.get('search')) {
          const q = searchParams.get('search')!.toLowerCase();
          items = items.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.discord && c.discord.toLowerCase().includes(q)));
        }
        if (searchParams.get('status') && searchParams.get('status') !== 'all') items = items.filter(c => c.status === searchParams.get('status'));
        if (searchParams.get('country') && searchParams.get('country') !== 'all') items = items.filter(c => c.country === searchParams.get('country'));
        return NextResponse.json(items);
      }

      case 'services': {
        let items = db.services.map(s => ({ ...s, customer: db.customers.find(c => c.id === s.customerId), server: db.servers.find(sv => sv.id === s.serverId) }));
        if (searchParams.get('search')) {
          const q = searchParams.get('search')!.toLowerCase();
          items = items.filter(s => s.id.toLowerCase().includes(q) || s.planName.toLowerCase().includes(q) || s.ipv4?.includes(q) || s.customer?.name.toLowerCase().includes(q));
        }
        if (searchParams.get('type') && searchParams.get('type') !== 'all') items = items.filter(s => s.type === searchParams.get('type'));
        if (searchParams.get('status') && searchParams.get('status') !== 'all') items = items.filter(s => s.status === searchParams.get('status'));
        return NextResponse.json(items);
      }

      case 'invoices': {
        let items = db.invoices.map(i => ({ ...i, customer: db.customers.find(c => c.id === i.customerId), service: db.services.find(s => s.id === i.serviceId) }));
        if (searchParams.get('search')) {
          const q = searchParams.get('search')!.toLowerCase();
          items = items.filter(i => i.invoiceNumber.toLowerCase().includes(q) || i.customer?.name.toLowerCase().includes(q));
        }
        if (searchParams.get('status') && searchParams.get('status') !== 'all') items = items.filter(i => i.status === searchParams.get('status'));
        return NextResponse.json(items);
      }

      case 'servers': {
        const data = db.servers.map(srv => {
          const services = db.services.filter(s => s.serverId === srv.id && s.status !== 'Terminated');
          let allocatedCores = 0, allocatedRam = 0, allocatedStorage = 0;
          services.forEach(s => {
            const coreMatch = s.cpu.match(/(\d+)/); if (coreMatch) allocatedCores += parseInt(coreMatch[1]);
            const ramMatch = s.ram.match(/(\d+)/); if (ramMatch) allocatedRam += parseInt(ramMatch[1]);
            const storageMatch = s.storage.match(/(\d+)/); if (storageMatch) allocatedStorage += parseInt(storageMatch[1]);
          });
          return {
            ...srv, allocatedCores, allocatedRam, allocatedStorage,
            remainingCores: Math.max(0, srv.cpu - allocatedCores), remainingRam: Math.max(0, srv.ram - allocatedRam), remainingStorage: Math.max(0, srv.storage - allocatedStorage),
            activeServicesCount: services.length,
          };
        });
        return NextResponse.json(data);
      }

      case 'providers': return NextResponse.json(db.providers);
      case 'expenses': {
        let items = [...db.expenses];
        if (searchParams.get('category') && searchParams.get('category') !== 'all') items = items.filter(e => e.category === searchParams.get('category'));
        if (searchParams.get('search')) {
          const q = searchParams.get('search')!.toLowerCase();
          items = items.filter(e => e.description.toLowerCase().includes(q) || e.vendor.toLowerCase().includes(q));
        }
        return NextResponse.json(items);
      }
      case 'domains': {
        let items = db.domains.map(d => ({ ...d, customer: d.customerId ? db.customers.find(c => c.id === d.customerId) : null }));
        if (searchParams.get('search')) {
          const q = searchParams.get('search')!.toLowerCase();
          items = items.filter(d => d.domain.toLowerCase().includes(q) || d.registrar.toLowerCase().includes(q));
        }
        if (searchParams.get('status') && searchParams.get('status') !== 'all') {
          const now = new Date();
          items = items.filter(d => {
            const expiring = new Date(d.expiryDate);
            if (searchParams.get('status') === 'expiring') return expiring <= new Date(Date.now() + 30 * 86400000) && expiring > now;
            if (searchParams.get('status') === 'expired') return expiring <= now;
            return true;
          });
        }
        return NextResponse.json(items);
      }
      case 'assets': {
        let items = [...db.assets];
        if (searchParams.get('type') && searchParams.get('type') !== 'all') items = items.filter(a => a.type === searchParams.get('type'));
        if (searchParams.get('status') && searchParams.get('status') !== 'all') items = items.filter(a => a.status === searchParams.get('status'));
        if (searchParams.get('search')) {
          const q = searchParams.get('search')!.toLowerCase();
          items = items.filter(a => a.name.toLowerCase().includes(q) || a.serialNumber?.toLowerCase().includes(q));
        }
        return NextResponse.json(items);
      }
      case 'tickets': {
        let items = db.tickets.map(t => ({ ...t, messages: t.messages, customer: db.customers.find(c => c.id === t.customerId) }));
        if (searchParams.get('search')) {
          const q = searchParams.get('search')!.toLowerCase();
          items = items.filter(t => t.title.toLowerCase().includes(q) || t.customer?.name.toLowerCase().includes(q));
        }
        if (searchParams.get('status') && searchParams.get('status') !== 'all') items = items.filter(t => t.status === searchParams.get('status'));
        return NextResponse.json(items);
      }
      case 'logs': return NextResponse.json(db.activityLogs);
      case 'notifications': return NextResponse.json(db.notifications);
      case 'settings': return NextResponse.json(db.settings);
      case 'users': return NextResponse.json(db.users.map(u => ({ id: u.id, username: u.username, name: u.name, role: u.role, status: u.status, twoFactorEnabled: u.twoFactorEnabled, createdAt: u.createdAt })));
      case 'pricingPlans': return NextResponse.json(db.pricingPlans);
      default: return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
  } catch (error) {
    console.error('API GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ entity: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { entity } = await params;
  let body: any;
  try { body = await request.json(); } catch { body = {}; }
  const db = readDb();

  try {
    switch (entity) {
      case 'customers': {
        const item: any = { id: `cust-${Date.now()}`, name: body.name, companyName: body.companyName || '', email: body.email, phone: body.phone || '', discord: body.discord || '', country: body.country || 'United States', notes: body.notes || '', staffNotes: body.staffNotes || '', status: 'Active', joinDate: new Date().toISOString(), totalSpending: 0 };
        db.customers.push(item);
        writeDb(db); logAction(user.name, 'Customer Created', `Created ${item.name}.`);
        return NextResponse.json(item);
      }
      case 'services': {
        const renewalDate = body.nextRenewalDate ? new Date(body.nextRenewalDate) : new Date(Date.now() + 30 * 86400000);
        const item: any = { id: `srv-${Date.now()}`, customerId: body.customerId, type: body.type || 'VPS', planName: body.planName, cpu: body.cpu || '1 Core', ram: body.ram || '1 GB', storage: body.storage || '20 GB', bandwidth: body.bandwidth || '1 TB', location: body.location || 'Helsinki', ipv4: body.ipv4 || '', ipv6: body.ipv6 || '', username: body.username || 'root', passwordHash: body.password || 'changeme', panelUrl: body.panelUrl || '', panelUsername: body.panelUsername || '', panelPassword: body.panelPassword || '', provider: body.provider || 'Hetzner', nodeName: body.nodeName || '', hostMachine: body.hostMachine || '', purchaseCost: Number(body.purchaseCost) || 0, sellingPrice: Number(body.sellingPrice) || 0, billingCycle: body.billingCycle || 'Monthly', issueDate: new Date().toISOString(), nextRenewalDate: renewalDate.toISOString(), expiryDate: renewalDate.toISOString(), autoRenewal: body.autoRenewal !== false, status: 'Active', internalNotes: body.internalNotes || '', serverId: body.serverId || null };
        db.services.push(item);
        writeDb(db); logAction(user.name, 'Service Provisioned', `Deployed ${item.type} "${item.planName}".`);
        return NextResponse.json(item);
      }
      case 'invoices': {
        const count = db.invoices.length; const prefix = db.settings.invoicePrefix || 'INV-';
        const invNum = `${prefix}${String(count + 1).padStart(4, '0')}`;
        const item: any = { id: `inv-${Date.now()}`, invoiceNumber: invNum, customerId: body.customerId, serviceId: body.serviceId || null, amount: Number(body.amount) || 0, tax: Number(body.tax) || 0, discount: Number(body.discount) || 0, paymentMethod: body.paymentMethod || 'Stripe', transactionId: body.transactionId || null, issueDate: body.issueDate ? new Date(body.issueDate).toISOString() : new Date().toISOString(), dueDate: body.dueDate ? new Date(body.dueDate).toISOString() : new Date().toISOString(), paidDate: body.paidDate ? new Date(body.paidDate).toISOString() : null, status: body.status || 'Pending', notes: body.notes || '' };
        db.invoices.push(item);
        writeDb(db); logAction(user.name, 'Invoice Created', `Generated ${invNum}.`);
        return NextResponse.json(item);
      }
      case 'servers': {
        const item: any = { id: `node-${Date.now()}`, name: body.name, provider: body.provider || 'Hetzner', location: body.location || 'Helsinki', cpu: Number(body.cpu) || 1, ram: Number(body.ram) || 1, storage: Number(body.storage) || 1, ips: Array.isArray(body.ips) ? body.ips : (body.ips ? body.ips.split(',').map((s: string) => s.trim()) : []), monthlyCost: Number(body.monthlyCost) || 0, renewalDate: body.renewalDate ? new Date(body.renewalDate).toISOString() : new Date().toISOString(), status: 'Active' };
        db.servers.push(item);
        writeDb(db); return NextResponse.json(item);
      }
      case 'providers': {
        const item: any = { id: `prov-${Date.now()}`, name: body.name, loginUrl: body.loginUrl || '', username: body.username || '', passwordHash: body.password || '', renewalDate: body.renewalDate ? new Date(body.renewalDate).toISOString() : new Date().toISOString(), monthlyCost: Number(body.monthlyCost) || 0, notes: body.notes || '' };
        db.providers.push(item);
        writeDb(db); return NextResponse.json(item);
      }
      case 'expenses': {
        const item: any = { id: `exp-${Date.now()}`, category: body.category, description: body.description, amount: Number(body.amount) || 0, vendor: body.vendor, paymentMethod: body.paymentMethod || 'Bank Transfer', date: body.date ? new Date(body.date).toISOString() : new Date().toISOString(), notes: body.notes || '' };
        db.expenses.push(item);
        writeDb(db); logAction(user.name, 'Expense Recorded', `Added ${item.description}.`);
        return NextResponse.json(item);
      }
      case 'domains': {
        const item: any = { id: `dom-${Date.now()}`, domain: body.domain, registrar: body.registrar, customerId: body.customerId || '', registrationDate: body.registrationDate ? new Date(body.registrationDate).toISOString() : new Date().toISOString(), expiryDate: body.expiryDate ? new Date(body.expiryDate).toISOString() : new Date(Date.now() + 365 * 86400000).toISOString(), autoRenew: body.autoRenew !== false, dnsProvider: body.dnsProvider || '', notes: body.notes || '' };
        db.domains.push(item);
        writeDb(db); logAction(user.name, 'Domain Added', `Added ${item.domain}.`);
        return NextResponse.json(item);
      }
      case 'assets': {
        const item: any = { id: `ast-${Date.now()}`, type: body.type, name: body.name, serialNumber: body.serialNumber || '', location: body.location, purchaseDate: body.purchaseDate ? new Date(body.purchaseDate).toISOString() : new Date().toISOString(), purchaseCost: Number(body.purchaseCost) || 0, warrantyExpiry: body.warrantyExpiry ? new Date(body.warrantyExpiry).toISOString() : '', assignedTo: body.assignedTo || '', status: body.status || 'Active', notes: body.notes || '' };
        db.assets.push(item);
        writeDb(db); logAction(user.name, 'Asset Added', `Added ${item.name}.`);
        return NextResponse.json(item);
      }
      case 'tickets': {
        const msg = body.message ? [{ sender: 'customer', name: body.customerName || 'Client', content: body.message, timestamp: new Date().toISOString() }] : [];
        const item: any = { id: `tkt-${Date.now()}`, customerId: body.customerId, title: body.title, status: 'Open', priority: body.priority || 'Medium', messages: msg, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        db.tickets.push(item);
        writeDb(db); logAction(user.name, 'Ticket Opened', `"${item.title}" ticket created.`);
        return NextResponse.json(item);
      }
      case 'users': {
        if (!['Founder', 'Admin'].includes(user.role)) return NextResponse.json({ error: 'Only Founder/Admin can create users' }, { status: 403 });
        if (db.users.some(u => u.username === body.username)) return NextResponse.json({ error: 'Username exists' }, { status: 400 });
        const item: any = { id: `user-${Date.now()}`, username: body.username, passwordHash: body.password || 'changeme123', name: body.name, role: body.role || 'Support', status: 'Active', twoFactorEnabled: false, createdAt: new Date().toISOString() };
        db.users.push(item);
        writeDb(db); logAction(user.name, 'Staff Created', `Created ${item.name}.`);
        return NextResponse.json({ id: item.id, username: item.username, name: item.name, role: item.role });
      }
      case 'settings': {
        Object.assign(db.settings, body);
        writeDb(db); logAction(user.name, 'Settings Updated', 'System configuration updated.');
        return NextResponse.json({ success: true });
      }
      case 'pricingPlans': {
        const plan: any = { id: `plan-${Date.now()}`, name: body.name, type: body.type || 'shared', description: body.description || '', monthlyPrice: Number(body.monthlyPrice) || 0, yearlyPrice: Number(body.yearlyPrice) || 0, setupFee: Number(body.setupFee) || 0, features: body.features || [], popular: !!body.popular, status: body.status || 'Active', createdAt: new Date().toISOString() };
        db.pricingPlans.push(plan);
        writeDb(db);
        return NextResponse.json(plan);
      }
      case 'logs': { logAction(user.name, body.action, body.details); return NextResponse.json({ success: true }); }
      default: return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ entity: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { entity } = await params;
  const db = readDb();
  if (entity === 'logs') {
    db.activityLogs = [];
    writeDb(db);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}
