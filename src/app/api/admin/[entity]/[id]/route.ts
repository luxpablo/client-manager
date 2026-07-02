import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readDb, writeDb, logAction, DatabaseSchema } from '@/lib/db';

async function getAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get('zcms_session');
  if (!session?.value) return null;
  try { return JSON.parse(Buffer.from(session.value, 'base64').toString('utf8')); } catch { return null; }
}

export async function GET(request: Request, { params }: { params: Promise<{ entity: string; id: string }> }) {
  const user = await getAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { entity, id } = await params;
  const db = readDb();

  switch (entity) {
    case 'customers': {
      const c = db.customers.find(x => x.id === id);
      if (!c) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
      return NextResponse.json({ ...c, services: db.services.filter(s => s.customerId === id), invoices: db.invoices.filter(i => i.customerId === id), tickets: db.tickets.filter(t => t.customerId === id) });
    }
    case 'services': {
      const s = db.services.find(x => x.id === id);
      if (!s) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
      return NextResponse.json({ ...s, customer: db.customers.find(c => c.id === s.customerId), server: db.servers.find(sv => sv.id === s.serverId) });
    }
    case 'invoices': {
      const i = db.invoices.find(x => x.id === id);
      if (!i) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
      return NextResponse.json({ ...i, customer: db.customers.find(c => c.id === i.customerId), service: db.services.find(s => s.id === i.serviceId) });
    }
    case 'tickets': {
      const t = db.tickets.find(x => x.id === id);
      if (!t) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
      return NextResponse.json({ ...t, customer: db.customers.find(c => c.id === t.customerId) });
    }
    case 'expenses': {
      const e = db.expenses.find(x => x.id === id);
      if (!e) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
      return NextResponse.json(e);
    }
    case 'domains': {
      const d = db.domains.find(x => x.id === id);
      if (!d) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
      return NextResponse.json({ ...d, customer: d.customerId ? db.customers.find(c => c.id === d.customerId) : null });
    }
    case 'assets': {
      const a = db.assets.find(x => x.id === id);
      if (!a) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
      return NextResponse.json(a);
    }
    default: return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ entity: string; id: string }> }) {
  const user = await getAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { entity, id } = await params;
  let body: any;
  try { body = await request.json(); } catch { body = {}; }
  const db = readDb();

  try {
    switch (entity) {
      case 'customers': {
        const idx = db.customers.findIndex(x => x.id === id);
        if (idx === -1) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        db.customers[idx] = { ...db.customers[idx], ...body };
        writeDb(db);
        if (body.status) logAction(user.name, body.status === 'Suspended' ? 'Customer Suspended' : 'Customer Activated', `Customer ${db.customers[idx].name} status changed to ${body.status}.`);
        return NextResponse.json(db.customers[idx]);
      }

      case 'services': {
        const idx = db.services.findIndex(x => x.id === id);
        if (idx === -1) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

        if (body.action === 'renew') {
          const cycleMap: Record<string, number> = { Weekly: 7, Monthly: 30, Quarterly: 90, SemiAnnual: 180, Annual: 365, Lifetime: 3650 };
          const days = cycleMap[db.services[idx].billingCycle] || 30;
          const newRenewal = new Date(); newRenewal.setDate(newRenewal.getDate() + days);
          db.services[idx].status = 'Active';
          db.services[idx].nextRenewalDate = newRenewal.toISOString();
          db.services[idx].expiryDate = newRenewal.toISOString();
          const prefix = db.settings.invoicePrefix || 'INV-';
          db.invoices.push({ id: `inv-${Date.now()}`, invoiceNumber: `${prefix}${String(db.invoices.length + 1).padStart(4, '0')}`, customerId: db.services[idx].customerId, serviceId: id, amount: db.services[idx].sellingPrice, tax: db.services[idx].sellingPrice * 0.18, discount: 0, paymentMethod: 'Auto Renewal', issueDate: new Date().toISOString(), dueDate: newRenewal.toISOString(), paidDate: new Date().toISOString(), status: 'Paid' });
          writeDb(db); logAction(user.name, 'Service Renewed', `Renewed ${db.services[idx].planName} for ${days} days.`);
          return NextResponse.json({ success: true });
        }
        if (body.action === 'suspend') { db.services[idx].status = 'Suspended'; writeDb(db); logAction(user.name, 'Service Suspended', `Suspended ${db.services[idx].planName}.`); return NextResponse.json({ success: true }); }
        if (body.action === 'terminate') { db.services[idx].status = 'Terminated'; writeDb(db); logAction(user.name, 'Service Terminated', `Terminated ${db.services[idx].planName}.`); return NextResponse.json({ success: true }); }

        Object.assign(db.services[idx], body);
        writeDb(db);
        if (body.internalNotes !== undefined) logAction(user.name, 'Service Updated', `Updated ${db.services[idx].planName}.`);
        return NextResponse.json({ success: true });
      }

      case 'invoices': {
        const idx = db.invoices.findIndex(x => x.id === id);
        if (idx === -1) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

        if (body.status === 'Paid' && db.invoices[idx].status !== 'Paid') {
          db.invoices[idx].status = 'Paid';
          db.invoices[idx].paidDate = new Date().toISOString();
          if (body.transactionId) db.invoices[idx].transactionId = body.transactionId;

          const custIdx = db.customers.findIndex(c => c.id === db.invoices[idx].customerId);
          if (custIdx !== -1) db.customers[custIdx].totalSpending += db.invoices[idx].amount + db.invoices[idx].tax - db.invoices[idx].discount;

          if (db.invoices[idx].serviceId) {
            const srvIdx = db.services.findIndex(s => s.id === db.invoices[idx].serviceId);
            if (srvIdx !== -1 && db.services[srvIdx].status === 'Pending') {
              const cycleMap: Record<string, number> = { Weekly: 7, Monthly: 30, Quarterly: 90, SemiAnnual: 180, Annual: 365, Lifetime: 3650 };
              const days = cycleMap[db.services[srvIdx].billingCycle] || 30;
              const newRenewal = new Date(); newRenewal.setDate(newRenewal.getDate() + days);
              db.services[srvIdx].status = 'Active';
              db.services[srvIdx].nextRenewalDate = newRenewal.toISOString();
              db.services[srvIdx].expiryDate = newRenewal.toISOString();
            }
          }
          writeDb(db); logAction(user.name, 'Invoice Paid', `Invoice ${db.invoices[idx].invoiceNumber} paid.`);
        } else {
          Object.assign(db.invoices[idx], body);
          writeDb(db);
        }
        return NextResponse.json(db.invoices[idx]);
      }

      case 'servers': {
        const idx = db.servers.findIndex(x => x.id === id);
        if (idx === -1) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        if (body.status) db.servers[idx].status = body.status;
        if (body.name) db.servers[idx].name = body.name;
        if (body.provider) db.servers[idx].provider = body.provider;
        if (body.location) db.servers[idx].location = body.location;
        if (body.cpu) db.servers[idx].cpu = Number(body.cpu);
        if (body.ram) db.servers[idx].ram = Number(body.ram);
        if (body.storage) db.servers[idx].storage = Number(body.storage);
        if (body.monthlyCost) db.servers[idx].monthlyCost = Number(body.monthlyCost);
        if (body.renewalDate) db.servers[idx].renewalDate = new Date(body.renewalDate).toISOString();
        if (body.ips !== undefined) db.servers[idx].ips = Array.isArray(body.ips) ? body.ips : body.ips.split(',').map((s: string) => s.trim());
        writeDb(db); return NextResponse.json({ success: true });
      }

      case 'tickets': {
        const idx = db.tickets.findIndex(x => x.id === id);
        if (idx === -1) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        if (body.message) {
          db.tickets[idx].messages.push({ sender: 'staff', name: user.name, content: body.message, timestamp: new Date().toISOString() });
          db.tickets[idx].status = 'Answered';
        }
        if (body.status) db.tickets[idx].status = body.status;
        db.tickets[idx].updatedAt = new Date().toISOString();
        writeDb(db);
        if (body.message) logAction(user.name, 'Ticket Response', `Replied to "${db.tickets[idx].title}".`);
        if (body.status === 'Closed') logAction(user.name, 'Ticket Closed', `Closed "${db.tickets[idx].title}".`);
        return NextResponse.json({ success: true });
      }

      case 'settings': {
        Object.assign(db.settings, body);
        writeDb(db); logAction(user.name, 'Settings Updated', 'System configuration updated.');
        return NextResponse.json({ success: true });
      }

      case 'expenses': {
        const eIdx = db.expenses.findIndex(x => x.id === id);
        if (eIdx === -1) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        Object.assign(db.expenses[eIdx], body);
        writeDb(db); return NextResponse.json({ success: true });
      }
      case 'domains': {
        const dIdx = db.domains.findIndex(x => x.id === id);
        if (dIdx === -1) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        Object.assign(db.domains[dIdx], body);
        writeDb(db); return NextResponse.json({ success: true });
      }
      case 'assets': {
        const aIdx = db.assets.findIndex(x => x.id === id);
        if (aIdx === -1) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        Object.assign(db.assets[aIdx], body);
        writeDb(db); return NextResponse.json({ success: true });
      }
      case 'notifications': {
        if (id === 'all') db.notifications.forEach(n => n.read = true);
        else { const n = db.notifications.find(x => x.id === id); if (n) n.read = true; }
        writeDb(db); return NextResponse.json({ success: true });
      }

      case 'users': {
        const idx = db.users.findIndex(x => x.id === id);
        if (idx === -1) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        Object.assign(db.users[idx], body);
        writeDb(db); logAction(user.name, 'User Updated', `Updated ${db.users[idx].name}.`);
        return NextResponse.json({ success: true });
      }

      default: return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ entity: string; id: string }> }) {
  const user = await getAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { entity, id } = await params;
  if (!['Founder', 'Admin'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const db = readDb();
  try {
    switch (entity) {
      case 'customers': {
        const item = db.customers.find(c => c.id === id);
        if (!item) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        db.customers = db.customers.filter(c => c.id !== id);
        db.services = db.services.filter(s => s.customerId !== id);
        db.invoices = db.invoices.filter(i => i.customerId !== id);
        db.tickets = db.tickets.filter(t => t.customerId !== id);
        writeDb(db); logAction(user.name, 'Customer Deleted', `Deleted ${item.name}.`);
        return NextResponse.json({ success: true });
      }
      case 'services': {
        const item = db.services.find(s => s.id === id);
        if (!item) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        db.services = db.services.filter(s => s.id !== id);
        writeDb(db); logAction(user.name, 'Service Terminated', `Deleted ${item.planName}.`);
        return NextResponse.json({ success: true });
      }
      case 'invoices': {
        const item = db.invoices.find(i => i.id === id);
        if (!item) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        db.invoices = db.invoices.filter(i => i.id !== id);
        writeDb(db); logAction(user.name, 'Invoice Deleted', `Deleted ${item.invoiceNumber}.`);
        return NextResponse.json({ success: true });
      }
      case 'servers': {
        const item = db.servers.find(s => s.id === id);
        if (!item) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        db.servers = db.servers.filter(s => s.id !== id);
        db.services.forEach(s => { if (s.serverId === id) s.serverId = undefined; });
        writeDb(db); logAction(user.name, 'Server Deleted', `Removed ${item.name}.`);
        return NextResponse.json({ success: true });
      }
      case 'providers': { db.providers = db.providers.filter(p => p.id !== id); writeDb(db); return NextResponse.json({ success: true }); }
      case 'expenses': { db.expenses = db.expenses.filter(e => e.id !== id); writeDb(db); return NextResponse.json({ success: true }); }
      case 'domains': { db.domains = db.domains.filter(d => d.id !== id); writeDb(db); return NextResponse.json({ success: true }); }
      case 'assets': { db.assets = db.assets.filter(a => a.id !== id); writeDb(db); return NextResponse.json({ success: true }); }
      case 'pricingPlans': { db.pricingPlans = db.pricingPlans.filter(p => p.id !== id); writeDb(db); return NextResponse.json({ success: true }); }
      case 'users': {
        if (!['Founder', 'Admin'].includes(user.role)) return NextResponse.json({ error: 'Only Founder/Admin' }, { status: 403 });
        const uItem = db.users.find(u => u.id === id);
        if (!uItem) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        db.users = db.users.filter(u => u.id !== id);
        writeDb(db); logAction(user.name, 'Staff Deleted', `Deleted ${uItem.name}.`);
        return NextResponse.json({ success: true });
      }
      default: return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
