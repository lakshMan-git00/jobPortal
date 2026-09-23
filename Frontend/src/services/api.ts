import type { AuthUser, Company, Employer, Job } from '../types';
import { apiGet, apiSend, csrf, ApiError } from './client';
export { ApiError } from './client';

export async function getJobs(filters: Record<string, string> = {}): Promise<Job[]> {
  return (await apiGet<{ data: Job[] }>(`/api/jobs?${new URLSearchParams(filters)}`)).data;
}
export async function getJob(slug: string): Promise<Job> {
  return (await apiGet<{ data: Job }>(`/api/jobs/${encodeURIComponent(slug)}`)).data;
}
export async function signIn(email: string, password: string): Promise<AuthUser> {
  await csrf();
  return (await apiSend<{ user: AuthUser }>('/api/auth/login', 'POST', { email, password })).user;
}
export async function register(
  name: string,
  email: string,
  password: string,
  passwordConfirmation: string,
): Promise<AuthUser> {
  await csrf();
  return (
    await apiSend<{ user: AuthUser }>('/api/auth/register', 'POST', {
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
    })
  ).user;
}
export async function currentUser(): Promise<AuthUser | null> {
  // Remove tokens left by older builds; the browser now uses an HttpOnly session cookie.
  window.localStorage.removeItem('job_portal_auth_token');
  try {
    return (await apiGet<{ user: AuthUser }>('/api/auth/me')).user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}
export async function signOut(): Promise<void> {
  await apiSend('/api/auth/logout', 'POST');
}
export async function applyForJob(jobId: number, coverLetter = ''): Promise<void> {
  await apiSend(`/api/jobs/${jobId}/apply`, 'POST', { cover_letter: coverLetter });
}
export async function getCompanies(): Promise<Company[]> {
  return (await apiGet<{ data: Company[] }>('/api/admin/companies')).data;
}
export async function createCompany(input: {
  name: string;
  website?: string;
  description?: string;
}): Promise<Company> {
  return (await apiSend<{ data: Company }>('/api/admin/companies', 'POST', input)).data;
}
export async function createEmployer(input: {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  company_id: number;
}): Promise<void> {
  await apiSend('/api/admin/employers', 'POST', input);
}
export async function getEmployers(): Promise<Employer[]> {
  return (await apiGet<{ data: Employer[] }>('/api/admin/employers')).data;
}
export async function updateEmployer(
  id: number,
  input: Partial<{
    name: string;
    email: string;
    company_id: number;
    is_active: boolean;
    password: string;
    password_confirmation: string;
  }>,
): Promise<Employer> {
  return (await apiSend<{ data: Employer }>(`/api/admin/employers/${id}`, 'PATCH', input)).data;
}
export async function removeEmployer(id: number): Promise<void> {
  await apiSend(`/api/admin/employers/${id}`, 'DELETE');
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
  return (await apiSend<{ data: Job }>('/api/employer/jobs', 'POST', input)).data;
}
