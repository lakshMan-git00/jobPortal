import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Company, Employer, Job, Page } from '../types';
import { apiSend } from '../services/client';
import { useAction, useData, useDebounce, useWrite } from './hooks';
import { ErrorText, PageHeader, Pagination, QueryState, Status } from './shared';
import { Button, EmptyState } from '../components/common/Ui';

export function ManagedJobs({ admin = false }: { admin?: boolean }) {
  const [page, setPage] = useState(1);
  const query = useData<Page<Job>>(`/api/${admin ? 'admin' : 'employer'}/jobs?page=${page}`);
  const action = useAction(
    ({
      id,
      suffix = '',
      method,
      data,
    }: {
      id: number;
      suffix?: string;
      method: string;
      data?: unknown;
    }) => apiSend(`/api/${admin ? 'admin' : 'employer'}/jobs/${id}${suffix}`, method, data),
  );
  const change = (id: number, status: string) => {
    if (
      ['rejected', 'closed', 'paused'].includes(status) &&
      !window.confirm(`Set this job to ${status}? It will no longer accept applications.`)
    )
      return;
    const moderation_note =
      admin && status === 'rejected'
        ? window.prompt('Reason for rejection (shared with the employer)')
        : undefined;
    if (moderation_note === null) return;
    action.mutate({ id, suffix: '/status', method: 'PATCH', data: { status, moderation_note } });
  };
  return (
    <main className="dashboard-content">
      <PageHeader
        title={admin ? 'Quality opportunities start here.' : 'Your roles. Their next chapter.'}
        description={
          admin
            ? 'Review postings before they appear in public search.'
            : 'Create drafts, submit for review, and manage your hiring.'
        }
      >
        {!admin && (
          <Link className="button" to="/employer/jobs/create">
            Create a job
          </Link>
        )}
      </PageHeader>
      <ErrorText error={action.error} />
      <QueryState query={query}>
        {(data) => (
          <>
            <div className="managed-jobs">
              {data.data.length ? (
                data.data.map((job) => (
                  <section className="panel" key={job.id}>
                    <div className="section-heading">
                      <div>
                        <Status value={job.status} />
                        <h2>{job.title}</h2>
                        <p>
                          {job.company} · {job.location} · {job.mode}
                        </p>
                      </div>
                      <span className="application-count">
                        {job.applications_count} applications
                      </span>
                    </div>
                    {job.moderation_note && (
                      <p className="review-note">Review note: {job.moderation_note}</p>
                    )}
                    <details>
                      <summary>Read job description</summary>
                      <p className="pre-wrap">{job.description}</p>
                      <p>{job.skills.join(' · ')}</p>
                      <p>{job.salary || 'Salary not disclosed'}</p>
                    </details>
                    <div className="actions">
                      {admin ? (
                        <>
                          {job.status !== 'published' && (
                            <Button
                              disabled={action.isPending}
                              onClick={() => change(job.id, 'published')}
                            >
                              Approve & publish
                            </Button>
                          )}
                          <Button
                            className="danger-button"
                            disabled={action.isPending}
                            onClick={() => change(job.id, 'rejected')}
                          >
                            Reject
                          </Button>
                          {job.status === 'published' && (
                            <Button
                              className="outline-button"
                              disabled={action.isPending}
                              onClick={() => change(job.id, 'paused')}
                            >
                              Suspend
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          <Link
                            className="button outline-button"
                            to={`/employer/jobs/${job.id}/edit`}
                          >
                            Edit
                          </Link>
                          <Link
                            className="button outline-button"
                            to={`/employer/jobs/${job.id}/applications`}
                          >
                            Applications
                          </Link>
                          {['draft', 'paused', 'closed'].includes(job.status) && (
                            <Button
                              disabled={action.isPending}
                              onClick={() => change(job.id, 'pending')}
                            >
                              Submit for review
                            </Button>
                          )}
                          {job.status === 'published' && (
                            <Button
                              className="outline-button"
                              disabled={action.isPending}
                              onClick={() => change(job.id, 'paused')}
                            >
                              Pause
                            </Button>
                          )}
                          {!['closed', 'rejected'].includes(job.status) && (
                            <Button
                              className="outline-button"
                              disabled={action.isPending}
                              onClick={() => change(job.id, 'closed')}
                            >
                              Close
                            </Button>
                          )}
                          <Button
                            className="outline-button"
                            disabled={action.isPending}
                            onClick={() =>
                              action.mutate({ id: job.id, suffix: '/duplicate', method: 'POST' })
                            }
                          >
                            Duplicate
                          </Button>
                          <Button
                            className="danger-button"
                            disabled={action.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  'Delete this job? Application history will be retained.',
                                )
                              )
                                action.mutate({ id: job.id, method: 'DELETE' });
                            }}
                          >
                            Delete
                          </Button>
                        </>
                      )}
                      {job.status === 'published' && (
                        <Link className="text-link" to={`/jobs/${job.slug}`}>
                          Public page →
                        </Link>
                      )}
                    </div>
                  </section>
                ))
              ) : (
                <section className="panel">
                  <EmptyState
                    title="No jobs yet"
                    text={
                      admin
                        ? 'Employer submissions will appear here for review.'
                        : 'Create your first role to start finding the right people.'
                    }
                  />
                </section>
              )}
            </div>
            <Pagination page={data} onChange={setPage} />
          </>
        )}
      </QueryState>
    </main>
  );
}
const jobSchema = z.object({
  title: z.string().min(3, 'Enter at least 3 characters.').max(160),
  location: z.string().min(2, 'Enter a location.').max(160),
  workplace_type: z.enum(['Remote', 'Hybrid', 'On-site']),
  employment_type: z.enum(['Full-time', 'Part-time', 'Contract', 'Internship']),
  salary_range: z.string().max(100),
  description: z.string().min(20, 'Describe the role in at least 20 characters.').max(20000),
  skills: z.string(),
  category: z.string(),
  experience_level: z.string(),
  screening_questions: z.string(),
  closes_at: z.string(),
});
type JobForm = z.infer<typeof jobSchema>;
export function JobEditor({ id }: { id?: number }) {
  const query = useData<{ data: Job }>(`/api/employer/jobs/${id}`, !!id);
  return (
    <main className="dashboard-content">
      <PageHeader
        title={id ? 'Make this role stand out.' : 'Find the person who fits.'}
        description="Build a clear job description. An administrator reviews submissions before publication."
      />
      {id ? (
        <QueryState query={query}>{({ data }) => <Editor job={data} />}</QueryState>
      ) : (
        <Editor />
      )}
    </main>
  );
}
function Editor({ job }: { job?: Job }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const form = useForm<JobForm>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: job?.title ?? '',
      location: job?.location ?? '',
      workplace_type: job?.mode ?? 'Remote',
      employment_type: job?.type ?? 'Full-time',
      salary_range: job?.salary ?? '',
      description: job?.description ?? '',
      skills: job?.skills.join(', ') ?? '',
      category: job?.category ?? '',
      experience_level: job?.experience_level ?? '',
      screening_questions: job?.screening_questions.join('\n') ?? '',
      closes_at: job?.closes_at?.slice(0, 10) ?? '',
    },
  });
  const action = useAction(async ({ values, status }: { values: JobForm; status: string }) => {
    await apiSend(
      job ? `/api/employer/jobs/${job.id}` : '/api/employer/jobs',
      job ? 'PUT' : 'POST',
      {
        ...values,
        status,
        closes_at: values.closes_at || null,
        skills: values.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        screening_questions: values.screening_questions
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      },
    );
    navigate('/employer/jobs');
  }, 'Job saved.');
  const steps = ['The essentials', 'The opportunity', 'Screening', 'Review & submit'];
  const next = async () => {
    const fields: (keyof JobForm)[][] = [
      ['title', 'location', 'workplace_type', 'employment_type', 'salary_range'],
      ['description', 'skills'],
      ['screening_questions', 'closes_at'],
    ];
    if (await form.trigger(fields[step])) setStep(step + 1);
  };
  const input = (name: keyof JobForm, label: string, options?: string[]) => (
    <label key={name}>
      {label}
      {options ? (
        <select {...form.register(name)}>
          {options.map((v) => (
            <option key={v} value={v}>
              {v || 'Not specified'}
            </option>
          ))}
        </select>
      ) : ['description', 'screening_questions'].includes(name) ? (
        <textarea {...form.register(name)} rows={name === 'description' ? 10 : 5} />
      ) : (
        <input {...form.register(name)} type={name === 'closes_at' ? 'date' : 'text'} />
      )}
      <small className="field-error" role={form.formState.errors[name] ? 'alert' : undefined}>
        {form.formState.errors[name]?.message}
      </small>
    </label>
  );
  return (
    <>
      <ol className="steps">
        {steps.map((s, i) => (
          <li
            className={i === step ? 'current' : ''}
            aria-current={i === step ? 'step' : undefined}
            key={s}
          >
            <span>{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <section className="panel">
        <form
          onSubmit={form.handleSubmit((values) => action.mutate({ values, status: 'pending' }))}
        >
          <div className="form-grid">
            {step === 0 && (
              <>
                {input('title', 'Job title')}
                {input('location', 'Location')}
                {input('workplace_type', 'Work mode', ['Remote', 'Hybrid', 'On-site'])}
                {input('employment_type', 'Employment type', [
                  'Full-time',
                  'Part-time',
                  'Contract',
                  'Internship',
                ])}
                {input('salary_range', 'Salary range (include currency)')}
                {input('category', 'Category', [
                  '',
                  'Engineering',
                  'Design',
                  'Marketing',
                  'Sales',
                  'Operations',
                  'Finance',
                  'Other',
                ])}
                {input('experience_level', 'Experience level', [
                  '',
                  'Entry',
                  'Mid',
                  'Senior',
                  'Lead',
                ])}
              </>
            )}
            {step === 1 && (
              <div className="full-width auth-form">
                {input('description', 'Responsibilities, requirements, qualifications & benefits')}
                {input('skills', 'Skills (comma separated)')}
              </div>
            )}
            {step === 2 && (
              <div className="full-width auth-form">
                {input('screening_questions', 'Screening questions (one per line, up to 20)')}
                {input('closes_at', 'Application deadline (optional)')}
              </div>
            )}
            {step === 3 && (
              <div className="full-width">
                <h2>{form.getValues('title')}</h2>
                <p>
                  {form.getValues('location')} · {form.getValues('workplace_type')} ·{' '}
                  {form.getValues('employment_type')}
                </p>
                <p>{form.getValues('salary_range') || 'Salary not disclosed'}</p>
                <p className="pre-wrap">{form.getValues('description')}</p>
                <p>{form.getValues('skills')}</p>
                <h3>Screening questions</h3>
                <p className="pre-wrap">{form.getValues('screening_questions') || 'None'}</p>
                <p>Deadline: {form.getValues('closes_at') || 'Open until closed'}</p>
              </div>
            )}
          </div>
          <ErrorText error={action.error} />
          <div className="actions">
            {step > 0 && (
              <Button type="button" className="outline-button" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button type="button" onClick={() => void next()}>
                Continue
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  className="outline-button"
                  disabled={action.isPending}
                  onClick={form.handleSubmit((values) =>
                    action.mutate({ values, status: 'draft' }),
                  )}
                >
                  Save draft
                </Button>
                <Button disabled={action.isPending}>
                  {action.isPending ? 'Saving…' : 'Submit for review'}
                </Button>
              </>
            )}
            <Link to="/employer/jobs">Cancel</Link>
          </div>
        </form>
      </section>
    </>
  );
}
export function CompanyEditor() {
  const query = useData<{ data: Company }>('/api/employer/company');
  const save = useWrite('/api/employer/company', 'PUT', 'Company profile updated.');
  return (
    <main className="dashboard-content">
      <PageHeader
        title="Introduce your team."
        description="Help candidates understand the company behind the opportunity."
      />
      <QueryState query={query}>
        {({ data }) => (
          <section className="panel">
            <form
              className="auth-form"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate(Object.fromEntries(new FormData(e.currentTarget)));
              }}
            >
              <label>
                Company name
                <input name="name" defaultValue={data.name} required maxLength={160} />
              </label>
              <label>
                Website
                <input name="website" type="url" defaultValue={data.website} />
              </label>
              <label>
                About the company
                <textarea
                  name="description"
                  rows={10}
                  defaultValue={data.description}
                  maxLength={10000}
                />
              </label>
              <ErrorText error={save.error} />
              <Button disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save company'}
              </Button>
              <Link to={`/companies/${data.slug}`}>View public profile →</Link>
            </form>
          </section>
        )}
      </QueryState>
    </main>
  );
}
export function AdminUsers() {
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [keyword, setKeyword] = useState('');
  const search = useDebounce(keyword);
  const query = useData<Page<Employer>>(
    `/api/admin/users?${new URLSearchParams({ page: String(page), role, keyword: search })}`,
  );
  const action = useAction(
    (user: Employer) =>
      apiSend(`/api/admin/users/${user.id}/status`, 'PATCH', { is_active: !user.is_active }),
    'Account access updated.',
  );
  return (
    <>
      <div className="toolbar">
        <label>
          Search users
          <input
            type="search"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label>
          Role
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All roles</option>
            <option>candidate</option>
            <option>employer</option>
            <option>admin</option>
          </select>
        </label>
      </div>
      <ErrorText error={action.error} />
      <QueryState query={query}>
        {(data) => (
          <>
            <section className="panel">
              <h2>All platform users</h2>
              {data.data.map((user) => (
                <div className="record-row" key={user.id}>
                  <div className="record-copy">
                    <strong>{user.name}</strong>
                    <small>
                      {user.email} · {user.role}
                    </small>
                  </div>
                  <Status value={user.is_active ? 'active' : 'suspended'} />
                  {user.role !== 'admin' && (
                    <Button
                      className="outline-button"
                      disabled={action.isPending}
                      onClick={() => {
                        if (
                          !user.is_active ||
                          window.confirm(`Suspend ${user.name}? Their active sessions will end.`)
                        )
                          action.mutate(user);
                      }}
                    >
                      {user.is_active ? 'Suspend' : 'Activate'}
                    </Button>
                  )}
                </div>
              ))}
              {!data.data.length && (
                <EmptyState title="No matching users" text="Try another search or role." />
              )}
            </section>
            <Pagination page={data} onChange={setPage} />
          </>
        )}
      </QueryState>
    </>
  );
}
