/**
 * Single API boundary. Set VITE_API_URL when the Laravel service is available.
 * Service methods deliberately return mock data during local front-end development.
 */
import { jobs } from '../data/mockData';
import type { Job } from '../types';

const baseUrl = import.meta.env.VITE_API_URL ?? '';

export async function getJobs(
  filters: { keyword?: string; location?: string } = {},
): Promise<Job[]> {
  if (baseUrl) {
    const params = new URLSearchParams();
    if (filters.keyword) params.set('keyword', filters.keyword);
    if (filters.location) params.set('location', filters.location);
    const response = await fetch(`${baseUrl}/api/jobs?${params}`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('Unable to load jobs. Please try again.');
    const payload = (await response.json()) as { data: Job[] };
    return payload.data;
  }
  const term = `${filters.keyword ?? ''} ${filters.location ?? ''}`.trim().toLowerCase();
  return jobs.filter(
    (job) =>
      !term ||
      `${job.title} ${job.company} ${job.location} ${job.skills.join(' ')}`
        .toLowerCase()
        .includes(term),
  );
}
