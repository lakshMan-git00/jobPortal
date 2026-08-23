import { useEffect, useState } from 'react';
import { createCompany, createEmployer, createJob, getCompanies } from '../services/api';
import type { Company } from '../types';
import { Button, EmptyState } from '../components/common/Ui';

export function AdminAccessPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [employer, setEmployer] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    company_id: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const load = () =>
    getCompanies()
      .then(setCompanies)
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : 'Unable to load companies.'),
      );

  useEffect(() => {
    void load();
  }, []);

  const addCompany = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await createCompany({ name: companyName });
      setCompanyName('');
      setMessage('Company created. You can now assign an employer account.');
      void load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create company.');
    }
  };
  const addEmployer = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await createEmployer({ ...employer, company_id: Number(employer.company_id) });
      setEmployer({ name: '', email: '', password: '', password_confirmation: '', company_id: '' });
      setMessage('Employer account created and assigned to its company.');
      void load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create employer.');
    }
  };
  return (
    <main className="dashboard-content">
      <div className="dashboard-title">
        <div>
          <h1>Companies & employer access</h1>
          <p>
            Create the company first, then issue employer accounts that are allowed to post jobs.
          </p>
        </div>
      </div>
      {error && <p className="auth-error">{error}</p>}
      {message && <p className="success-message">{message}</p>}
      <div className="dashboard-grid">
        <section className="panel">
          <h2>Create company</h2>
          <form className="auth-form" onSubmit={(event) => void addCompany(event)}>
            <input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Company name"
              required
            />
            <Button type="submit">Create company</Button>
          </form>
        </section>
        <section className="panel">
          <h2>Create employer account</h2>
          <form className="auth-form" onSubmit={(event) => void addEmployer(event)}>
            <input
              value={employer.name}
              onChange={(event) => setEmployer({ ...employer, name: event.target.value })}
              placeholder="Employer name"
              required
            />
            <input
              value={employer.email}
              onChange={(event) => setEmployer({ ...employer, email: event.target.value })}
              placeholder="Employer email"
              type="email"
              required
            />
            <select
              value={employer.company_id}
              onChange={(event) => setEmployer({ ...employer, company_id: event.target.value })}
              required
            >
              <option value="">Assign a company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <input
              value={employer.password}
              onChange={(event) => setEmployer({ ...employer, password: event.target.value })}
              placeholder="Temporary password (12+ chars)"
              type="password"
              minLength={12}
              required
            />
            <input
              value={employer.password_confirmation}
              onChange={(event) =>
                setEmployer({ ...employer, password_confirmation: event.target.value })
              }
              placeholder="Confirm temporary password"
              type="password"
              minLength={12}
              required
            />
            <Button type="submit" disabled={!companies.length}>
              Create employer
            </Button>
          </form>
        </section>
      </div>
      <section className="panel">
        <h2>Companies</h2>
        {companies.length ? (
          <div className="table">
            {companies.map((company) => (
              <div className="table-row" key={company.id}>
                <b>{company.name}</b>
                <small>Company ID: {company.id}</small>
                <span>{company.employers_count ?? 0} employer account(s)</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No companies yet"
            text="Create the first company above. Nothing is pre-populated."
          />
        )}
      </section>
    </main>
  );
}

export function EmployerJobsPage() {
  const [form, setForm] = useState({
    title: '',
    location: '',
    workplace_type: 'Remote' as const,
    employment_type: 'Full-time' as const,
    salary_range: '',
    description: '',
    skills: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const job = await createJob({
        ...form,
        skills: form.skills
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      });
      setMessage(`“${job.title}” is now published.`);
      setForm({
        title: '',
        location: '',
        workplace_type: 'Remote',
        employment_type: 'Full-time',
        salary_range: '',
        description: '',
        skills: '',
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to publish job.');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <main className="dashboard-content">
      <div className="dashboard-title">
        <div>
          <h1>Post a job</h1>
          <p>Roles are published under the company assigned by your administrator.</p>
        </div>
      </div>
      {error && <p className="auth-error">{error}</p>}
      {message && <p className="success-message">{message}</p>}
      <section className="panel">
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          <input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            placeholder="Job title"
            required
          />
          <input
            value={form.location}
            onChange={(event) => setForm({ ...form, location: event.target.value })}
            placeholder="Location"
            required
          />
          <div className="form-row">
            <select
              value={form.workplace_type}
              onChange={(event) =>
                setForm({
                  ...form,
                  workplace_type: event.target.value as typeof form.workplace_type,
                })
              }
            >
              <option>Remote</option>
              <option>Hybrid</option>
              <option>On-site</option>
            </select>
            <select
              value={form.employment_type}
              onChange={(event) =>
                setForm({
                  ...form,
                  employment_type: event.target.value as typeof form.employment_type,
                })
              }
            >
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
              <option>Internship</option>
            </select>
          </div>
          <input
            value={form.salary_range}
            onChange={(event) => setForm({ ...form, salary_range: event.target.value })}
            placeholder="Salary range (optional)"
          />
          <input
            value={form.skills}
            onChange={(event) => setForm({ ...form, skills: event.target.value })}
            placeholder="Skills, separated by commas"
          />
          <textarea
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            placeholder="Describe the role, responsibilities, and requirements"
            rows={8}
            required
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Publishing…' : 'Publish job'}
          </Button>
        </form>
      </section>
    </main>
  );
}
