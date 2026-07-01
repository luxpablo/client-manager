export interface PaymenterConfig {
  baseUrl: string;
  apiKey: string;
}

export interface PaymenterUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
}

export interface PaymenterInvoice {
  id: number;
  status: string;
  currency_code: string;
  due_at: string;
  created_at: string;
}

export interface PaymenterProduct {
  id: number;
  name: string;
  price: number;
  stock: number;
  slug: string;
}

export interface PaymenterService {
  id: number;
  quantity: number;
  price: string;
  status: string;
  currency_code: string;
  expires_at: string;
  created_at: string;
}

export interface PaymenterOrder {
  id: number;
  currency_code: string;
  user_id: number;
  created_at: string;
}

async function apiRequest(config: PaymenterConfig, path: string) {
  const base = config.baseUrl.replace(/\/+$/, '');
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
  });
  if (!res.ok) {
    let detail = `Paymenter API error (${res.status})`;
    try { const err = await res.json(); detail = err.message || detail; } catch {}
    throw new Error(detail);
  }
  const data = await res.json();
  return (data.data || []).map((item: any) => ({ id: item.id, ...item.attributes }));
}

export async function getUsers(config: PaymenterConfig): Promise<PaymenterUser[]> {
  return apiRequest(config, '/api/v1/admin/users');
}

export async function getInvoices(config: PaymenterConfig): Promise<PaymenterInvoice[]> {
  return apiRequest(config, '/api/v1/admin/invoices');
}

export async function getProducts(config: PaymenterConfig): Promise<PaymenterProduct[]> {
  return apiRequest(config, '/api/v1/admin/products');
}

export async function getServices(config: PaymenterConfig): Promise<PaymenterService[]> {
  return apiRequest(config, '/api/v1/admin/services');
}

export async function getOrders(config: PaymenterConfig): Promise<PaymenterOrder[]> {
  return apiRequest(config, '/api/v1/admin/orders');
}

export async function testConnection(config: PaymenterConfig): Promise<boolean> {
  try {
    await apiRequest(config, '/api/v1/admin/users');
    return true;
  } catch { return false; }
}
