export type Role = 'guest' | 'candidate' | 'employer' | 'admin';

export type Job = {
  id: number;
  slug: string;
  title: string;
  company: string;
  location: string;
  mode: 'Remote' | 'Hybrid' | 'On-site';
  type: 'Full-time' | 'Contract';
  salary: string;
  posted: string;
  skills: string[];
  logo: string;
  tone: string;
  description: string;
};

export type Application = {
  id: number;
  job: string;
  company: string;
  applied: string;
  status: 'Submitted' | 'Under review' | 'Interview';
  tone: string;
};
