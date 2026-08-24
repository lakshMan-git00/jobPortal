/**
 * Single boundary for the token-authenticated Laravel API.
 */
import type { AuthUser, Company, Job } from '../types';

const baseUrl = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');
const AUTH_TOKEN_KEY = 'job_portal_auth_token';

type ApiOptions = RequestInit;

function authToken(): string | null {
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

function storeAuthToken(token: string | null): void {
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    return;
  }
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

async function request<T>(
  path: string,
  { headers, ...options }: ApiOptions = {},
): Promise<T> {
  const requestHeaders = new Headers(headers);
  requestHeaders.set('Accept', 'application/json');
  const token = authToken();
  if (token) requestHeaders.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${baseUrl}${path}`, {
    headers: requestHeaders,
    ...options,
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? 'Something went wrong. Please try again.');
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export async function getJobs(
  filters: { keyword?: string; location?: string } = {},
): Promise<Job[]> {
  const params = new URLSearchParams();
  if (filters.keyword) params.set('keyword', filters.keyword);
  if (filters.location) params.set('location', filters.location);
  const payload = await request<{ data: Job[] }>(`/api/jobs?${params}`);
  return payload.data;
}

export async function getJob(slug: string): Promise<Job> {
  return (await request<{ data: Job }>(`/api/jobs/${encodeURIComponent(slug)}`)).data;
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const payload = await request<{ user: AuthUser; token: string }>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  storeAuthToken(payload.token);
  return payload.user;
}

export async function register(
  name: string,
  email: string,
  password: string,
  passwordConfirmation: string,
): Promise<AuthUser> {
  const payload = await request<{ user: AuthUser; token: string }>('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, password_confirmation: passwordConfirmation }),
  });
  storeAuthToken(payload.token);
  return payload.user;
}

export async function currentUser(): Promise<AuthUser | null> {
  if (!authToken()) return null;
  try {
    return (await request<{ user: AuthUser }>('/api/auth/me')).user;
  } catch {
    storeAuthToken(null);
    return null;
  }
}

export async function signOut(): Promise<void> {
  try {
    await request<void>('/api/auth/logout', { method: 'POST' });
  } finally {
    storeAuthToken(null);
  }
}

export async function applyForJob(jobId: number, coverLetter = ''): Promise<void> {
  await request(`/api/jobs/${jobId}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cover_letter: coverLetter }),
  });
}

export async function getCompanies(): Promise<Company[]> {
  return (await request<{ data: Company[] }>('/api/admin/companies')).data;
}

export async function createCompany(input: {
  name: string;
  website?: string;
  description?: string;
}): Promise<Company> {
  return (
    await request<{ data: Company }>('/api/admin/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  ).data;
}

export async function createEmployer(input: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  company_id: number;
}): Promise<void> {
  await request('/api/admin/employers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function createJob(input: {
  title: string;
  location: string;
  workplace_type: 'Remote' | 'Hybrid' | 'On-site';
  employment_type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  salary_range?: string;
  description: string;
  skills: string[];
}): Promise<Job> {
  return (
    await request<{ data: Job }>('/api/employer/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  ).data;
}
