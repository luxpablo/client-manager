export interface PterodactylConfig {
  baseUrl: string;
  apiKey: string;
}

export interface PterodactylServer {
  id: number;
  external_id: string | null;
  name: string;
  description: string;
  status: string | null;
  suspended: boolean;
  user: number;
  node: number;
  allocation: number;
  memory: number;
  disk: number;
  cpu: number;
  created_at: string;
}

export interface PterodactylNode {
  id: number;
  name: string;
  location_id: number;
  fqdn: string;
  memory: number;
  memory_overallocate: number;
  disk: number;
  disk_overallocate: number;
  cpu: number;
  cpu_overallocate: number;
}

export interface PterodactylAllocation {
  id: number;
  ip: string;
  port: number;
  assigned: boolean;
}

export interface PterodactylUser {
  id: number;
  external_id: string | null;
  username: string;
  email: string;
  root_admin: boolean;
  created_at: string;
}

async function apiRequest(config: PterodactylConfig, path: string, method = 'GET', body?: any) {
  const res = await fetch(`${config.baseUrl}/api/application${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'Application/vnd.pterodactyl.v1+json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Pterodactyl API error: ${res.status}`);
  return res.json();
}

export async function getServers(config: PterodactylConfig): Promise<PterodactylServer[]> {
  const data = await apiRequest(config, '/servers');
  return data.data || [];
}

export async function getNodes(config: PterodactylConfig): Promise<PterodactylNode[]> {
  const data = await apiRequest(config, '/nodes');
  return data.data || [];
}

export async function getAllocations(config: PterodactylConfig, nodeId: number): Promise<PterodactylAllocation[]> {
  const data = await apiRequest(config, `/nodes/${nodeId}/allocations`);
  return data.data || [];
}

export async function getUsers(config: PterodactylConfig): Promise<PterodactylUser[]> {
  const data = await apiRequest(config, '/users');
  return data.data || [];
}

export async function suspendServer(config: PterodactylConfig, serverId: number): Promise<void> {
  await apiRequest(config, `/servers/${serverId}/suspend`, 'POST');
}

export async function unsuspendServer(config: PterodactylConfig, serverId: number): Promise<void> {
  await apiRequest(config, `/servers/${serverId}/unsuspend`, 'POST');
}

export async function createUser(config: PterodactylConfig, data: { username: string; email: string; first_name: string; last_name: string }): Promise<any> {
  return apiRequest(config, '/users', 'POST', {
    username: data.username,
    email: data.email,
    first_name: data.first_name,
    last_name: data.last_name,
    password: Math.random().toString(36).slice(2) + 'Aa1!',
  });
}

export async function testConnection(config: PterodactylConfig): Promise<boolean> {
  try {
    await apiRequest(config, '/nodes');
    return true;
  } catch { return false; }
}
