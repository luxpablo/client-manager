import fs from 'fs';
import path from 'path';

const IS_VERCEL = !!process.env.VERCEL;
const DB_FILE = IS_VERCEL
  ? '/tmp/db.json'
  : path.join(process.cwd(), 'db.json');
const BUNDLED_DB = path.join(process.cwd(), 'db.json');

// ─── TypeScript Interfaces ───

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  role: 'Founder' | 'Admin' | 'Billing' | 'Support' | 'Moderator';
  status: 'Active' | 'Suspended';
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  createdAt: string;
  oauth?: {
    google?: { id: string; email: string };
    discord?: { id: string; username: string };
  };
}

export interface Customer {
  id: string;
  name: string;
  companyName?: string;
  email: string;
  phone?: string;
  discord?: string;
  country: string;
  notes?: string;
  status: 'Active' | 'Suspended';
  joinDate: string;
  totalSpending: number;
  staffNotes?: string;
}

export interface Service {
  id: string;
  customerId: string;
  type: string;
  planName: string;
  cpu: string;
  ram: string;
  storage: string;
  bandwidth: string;
  location: string;
  ipv4?: string;
  ipv6?: string;
  username: string;
  passwordHash: string;
  panelUrl?: string;
  panelUsername?: string;
  panelPassword?: string;
  provider: string;
  nodeName?: string;
  hostMachine?: string;
  purchaseCost: number;
  sellingPrice: number;
  billingCycle: string;
  issueDate: string;
  nextRenewalDate: string;
  expiryDate: string;
  autoRenewal: boolean;
  status: string;
  internalNotes?: string;
  serverId?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  serviceId?: string;
  amount: number;
  tax: number;
  discount: number;
  paymentMethod: string;
  transactionId?: string;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  status: string;
  notes?: string;
}

export interface Payment {
  id: string;
  invoiceId?: string;
  customerId: string;
  amount: number;
  gateway: string;
  transactionId?: string;
  status: string;
  paidAt: string;
}

export interface Server {
  id: string;
  name: string;
  provider: string;
  location: string;
  cpu: number;
  ram: number;
  storage: number;
  ips: string[];
  monthlyCost: number;
  renewalDate: string;
  status: string;
}

export interface ProviderRecord {
  id: string;
  name: string;
  loginUrl: string;
  username: string;
  passwordHash: string;
  renewalDate: string;
  monthlyCost: number;
  notes?: string;
}

export interface TicketMessage {
  sender: 'customer' | 'staff';
  name: string;
  content: string;
  timestamp: string;
}

export interface Ticket {
  id: string;
  customerId: string;
  title: string;
  status: string;
  priority: string;
  messages: TicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  staffName: string;
  action: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface SystemNotification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  vendor: string;
  paymentMethod: string;
  date: string;
  receiptUrl?: string;
  notes?: string;
}

export interface Domain {
  id: string;
  domain: string;
  registrar: string;
  customerId?: string;
  serviceId?: string;
  registrationDate: string;
  expiryDate: string;
  autoRenew: boolean;
  dnsProvider?: string;
  dnsApiKey?: string;
  notes?: string;
}

export interface Asset {
  id: string;
  type: string;
  name: string;
  serialNumber?: string;
  location: string;
  purchaseDate: string;
  purchaseCost: number;
  warrantyExpiry?: string;
  assignedTo?: string;
  status: string;
  notes?: string;
}

export interface SystemSettings {
  companyName: string;
  logoUrl?: string;
  gstNumber?: string;
  invoicePrefix: string;
  currency: string;
  timeZone: string;
  emailTemplate: string;
  reminderTemplate: string;
  smtp?: {
    host: string;
    port: number;
    user: string;
    pass: string;
    fromName: string;
    fromEmail: string;
    secure: boolean;
  };
  integrations?: {
    paymenter?: { baseUrl: string; apiKey: string; enabled: boolean };
    pterodactyl?: { baseUrl: string; apiKey: string; enabled: boolean };
  };
  webhookUrl?: string;
  apiKeys?: { name: string; key: string; permissions: string[] }[];
  ai?: {
    provider: 'openai' | 'openrouter' | 'demo';
    apiKey: string;
    model: string;
    baseUrl: string;
    enabled: boolean;
  };
}

export interface DatabaseSchema {
  users: User[];
  customers: Customer[];
  services: Service[];
  invoices: Invoice[];
  payments: Payment[];
  servers: Server[];
  providers: ProviderRecord[];
  tickets: Ticket[];
  expenses: Expense[];
  domains: Domain[];
  assets: Asset[];
  activityLogs: ActivityLog[];
  notifications: SystemNotification[];
  settings: SystemSettings;
}

// ─── Default empty state (no mock data) ───

const getInitialSeed = (): DatabaseSchema => {
  return {
    users: [
      { id: 'user-admin', username: 'admin', passwordHash: 'admin123', name: 'Admin', role: 'Admin', status: 'Active', twoFactorEnabled: false, createdAt: new Date().toISOString() },
    ],
    customers: [],
    services: [],
    invoices: [],
    payments: [],
    servers: [],
    providers: [],
    tickets: [],
    expenses: [],
    domains: [],
    assets: [],
    activityLogs: [],
    notifications: [],
    settings: {
      companyName: 'My Company', invoicePrefix: 'INV-', currency: 'USD', timeZone: 'UTC',
      emailTemplate: 'Dear {customer_name},\n\nService {service_type} ({plan_name}) has been setup.\n\nIP: {ipv4}\nUser: {username}\n\nBest,\n{company_name}',
      reminderTemplate: 'Dear {customer_name},\n\nYour {service_type} ({plan_name}) renews on {renewal_date} ({countdown} days).\n\nInvoice {invoice_number}: {amount}\n\nBest,\n{company_name}',
      smtp: { host: '', port: 587, user: '', pass: '', fromName: 'My Company', fromEmail: '', secure: false },
      integrations: { paymenter: { baseUrl: '', apiKey: '', enabled: false }, pterodactyl: { baseUrl: '', apiKey: '', enabled: false } },
      apiKeys: [],
      ai: { provider: 'demo', apiKey: '', model: 'gpt-4o-mini', baseUrl: 'https://api.openai.com/v1', enabled: true },
    },
  };
};

// ─── JSON Database Helpers ───

export const readDb = (): DatabaseSchema => {
  if (IS_VERCEL && !fs.existsSync(DB_FILE) && fs.existsSync(BUNDLED_DB)) {
    const bundled = fs.readFileSync(BUNDLED_DB, 'utf8');
    try { fs.mkdirSync('/tmp', { recursive: true }); } catch {}
    fs.writeFileSync(DB_FILE, bundled, 'utf8');
    return JSON.parse(bundled) as DatabaseSchema;
  }
  if (!fs.existsSync(DB_FILE)) {
    const seed = getInitialSeed();
    try { fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf8'); } catch {}
    return seed;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) as DatabaseSchema;
  } catch {
    const seed = getInitialSeed();
    try { fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf8'); } catch {}
    return seed;
  }
};

export const writeDb = (data: DatabaseSchema): void => {
  try { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8'); } catch {}
};

// ─── Logger ───

export const logAction = (staffName: string, action: string, details: string, ipAddress?: string): void => {
  const db = readDb();
  db.activityLogs.unshift({ id: `log-${Date.now()}`, staffName, action, details, ipAddress: ipAddress || '127.0.0.1', timestamp: new Date().toISOString() });
  if (db.activityLogs.length > 500) db.activityLogs = db.activityLogs.slice(0, 500);
  writeDb(db);
};
