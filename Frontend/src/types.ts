export type Role = 'guest' | 'candidate' | 'employer' | 'admin';

export type Job = {
  id: number;
  slug: string;
  title: string;
  company: string;
  location: string;
  mode: 'Remote' | 'Hybrid' | 'On-site';
  type: 'Full-time' | 'Contract';
  salary: string | null;
  posted: string;
  skills: string[];
  description: string;
  company_description?: string | null;
};

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: Exclude<Role, 'guest'>;
  company_id: number | null;
};

export type Company = {
  id: number;
  name: string;
  slug: string;
  employers_count?: number;
  jobs_count?: number;
};
