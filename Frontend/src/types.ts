export type Role = 'guest' | 'candidate' | 'employer' | 'admin';

export type Job = {
  id: number;
  slug: string;
  title: string;
  company: string;
  location: string;
  mode: 'Remote' | 'Hybrid' | 'On-site';
  type: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
  salary: string | null;
  posted: string;
  skills: string[];
  description: string;
  company_description?: string | null;
  company_slug: string;
  status: string;
  category: string | null;
  experience_level: string | null;
  screening_questions: string[];
  moderation_note: string | null;
  applications_count: number;
  published_at: string | null;
  closes_at: string | null;
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
  description?: string;
  website?: string;
  jobs?: Job[];
};

export type Page<T> = {
  data: T[];
  current_page?: number;
  last_page?: number;
  total?: number;
  meta?: { current_page: number; last_page: number; total: number };
};
export type Profile = {
  name: string;
  email: string;
  headline?: string;
  location?: string;
  phone?: string;
  summary?: string;
  skills?: string[];
  experience?: string;
  education?: string;
  projects?: string;
  certifications?: string;
  languages?: string;
  portfolio?: string;
  linkedin?: string;
};
export type Resume = {
  id: number;
  name: string;
  size: number;
  is_default: boolean;
  created_at: string;
};
export type Application = {
  id: number;
  status: string;
  created_at: string;
  candidate_id: number;
  cover_letter: string;
  answers: string[];
  questions?: string[];
  history: { status: string; at: string }[];
  resume?: Resume;
  resume_id?: number;
  candidate: AuthUser & { profile?: Profile };
  job: { id: number; title: string; slug: string; company: Company };
  interviews?: Interview[];
};
export type Interview = {
  id: number;
  job_application_id: number;
  starts_at: string;
  duration_minutes: number;
  location: string;
  notes?: string;
  status: string;
  application: Application;
};
export type Notification = {
  id: number;
  title: string;
  href: string;
  read_at: string | null;
  created_at: string;
};

export type Employer = AuthUser & {
  company: string | null;
  is_active: boolean;
};
