import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type {
  AdminDashboard,
  AgentRunListItem,
  AppSettingItem,
  AuthMe,
  DashboardPeriod,
  Page,
  ProjectDetail,
  ProjectListItem,
  ReportCard,
  ReportListItem,
} from '@bugbot/shared';

// Server-side base URL for the NestJS API. Browser calls use the /api/* rewrite instead.
const API_BASE = process.env.API_INTERNAL_URL ?? 'http://localhost:3101';

/**
 * SSR talks to the API directly, so the owner session cookie has to be forwarded by hand —
 * without this every server-rendered page would 401 and bounce back to /login
 * (the MAGSpace lesson plan 01 §5 refers to).
 */
async function serverFetch(path: string): Promise<Response> {
  const cookieHeader = (await cookies()).toString();
  return fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  });
}

/** GET for owner-guarded endpoints: an expired or missing session lands on the login page. */
async function getJson<T>(path: string): Promise<T> {
  const res = await serverFetch(path);
  if (res.status === 401) redirect('/login');
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

/** GET that turns a 404 into null (a report or project id from the URL may be stale). */
async function getJsonOrNull<T>(path: string): Promise<T | null> {
  const res = await serverFetch(path);
  if (res.status === 401) redirect('/login');
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

function query(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

/** The signed-in owner, or null when there is no valid session (the login page uses this). */
export async function getMe(): Promise<AuthMe | null> {
  const res = await serverFetch('/auth/me');
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`GET /auth/me failed: ${res.status}`);
  return res.json() as Promise<AuthMe>;
}

export function getDashboard(period: DashboardPeriod): Promise<AdminDashboard> {
  return getJson<AdminDashboard>(`/admin/dashboard${query({ period })}`);
}

/** Type aliases (not interfaces) so they satisfy `query()`'s index signature. */
export type ReportsQuery = {
  project?: string;
  kind?: string;
  status?: string;
  period?: string;
  q?: string;
  limit?: number;
  cursor?: string;
};

export function getReports(params: ReportsQuery): Promise<Page<ReportListItem>> {
  return getJson<Page<ReportListItem>>(`/admin/reports${query(params)}`);
}

export function getReport(id: string): Promise<ReportCard | null> {
  return getJsonOrNull<ReportCard>(`/admin/reports/${encodeURIComponent(id)}`);
}

export function getProjects(): Promise<ProjectListItem[]> {
  return getJson<ProjectListItem[]>('/admin/projects');
}

export function getProject(slug: string): Promise<ProjectDetail | null> {
  return getJsonOrNull<ProjectDetail>(`/admin/projects/${encodeURIComponent(slug)}`);
}

export type RunsQuery = {
  project?: string;
  status?: string;
  model?: string;
  period?: string;
  limit?: number;
  cursor?: string;
};

export function getRuns(params: RunsQuery): Promise<Page<AgentRunListItem>> {
  return getJson<Page<AgentRunListItem>>(`/admin/runs${query(params)}`);
}

export function getSettings(): Promise<AppSettingItem[]> {
  return getJson<AppSettingItem[]>('/admin/settings');
}
