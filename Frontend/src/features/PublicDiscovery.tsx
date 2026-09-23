import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import type { AuthUser, Company, Job, Page, Resume } from '../types';
import { apiSend } from '../services/client';
import { queryClient } from '../services/query';
import { useAction, useData, useDebounce } from './hooks';
import { ErrorText, Modal, Pagination, QueryState } from './shared';
import { Button, EmptyState } from '../components/common/Ui';
import { JobCard } from '../components/jobs/JobCard';
import { navigate } from '../routes/navigation';

export function JobsPage({ openJob }: { openJob: (job: Job) => void }) {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('keyword') ?? '');
  const keyword = useDebounce(search);
  useEffect(() => {
    if (keyword !== (params.get('keyword') ?? '')) {
      const next = new URLSearchParams(params);
      if (keyword) next.set('keyword', keyword);
      else next.delete('keyword');
      next.delete('page');
      setParams(next, { replace: true });
    }
  }, [keyword]); // eslint-disable-line react-hooks/exhaustive-deps
  const query = useData<Page<Job>>(`/api/jobs?${params}`);
  const filter = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== 'page') next.delete('page');
    setParams(next);
  };
  useEffect(() => {
    const sync = () => setSearch(new URLSearchParams(window.location.search).get('keyword') ?? '');
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  return (
    <section className="jobs-page">
      <div className="page-intro">
        <span className="eyebrow dark">
          <i />
          YOUR NEXT OPPORTUNITY
        </span>
        <h1>Find where you belong.</h1>
        <p>Good work starts with the right opportunity.</p>
      </div>
      <div className="discovery-grid">
        <aside className="filter-panel">
          <h2>Refine your search</h2>
          <label>
            Keyword
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title, skills, company"
            />
          </label>
          <label>
            Location
            <input
              key={params.get('location') ?? ''}
              defaultValue={params.get('location') ?? ''}
              onBlur={(e) => filter('location', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') filter('location', e.currentTarget.value);
              }}
              placeholder="City or region"
            />
          </label>
          {[
            {
              name: 'workplace_type',
              label: 'Work mode',
              options: ['Remote', 'Hybrid', 'On-site'],
            },
            {
              name: 'employment_type',
              label: 'Employment type',
              options: ['Full-time', 'Part-time', 'Contract', 'Internship'],
            },
            {
              name: 'experience_level',
              label: 'Experience',
              options: ['Entry', 'Mid', 'Senior', 'Lead'],
            },
            {
              name: 'category',
              label: 'Category',
              options: [
                'Engineering',
                'Design',
                'Marketing',
                'Sales',
                'Operations',
                'Finance',
                'Other',
              ],
            },
          ].map((field) => (
            <label key={field.name}>
              {field.label}
              <select
                value={params.get(field.name) ?? ''}
                onChange={(e) => filter(field.name, e.target.value)}
              >
                <option value="">Any</option>
                {field.options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          ))}
          <label>
            Date posted
            <select
              value={params.get('posted_days') ?? ''}
              onChange={(e) => filter('posted_days', e.target.value)}
            >
              <option value="">Any time</option>
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </label>
          <Button
            className="outline-button"
            onClick={() => {
              setSearch('');
              setParams({});
            }}
          >
            Clear filters
          </Button>
        </aside>
        <div>
          <div className="section-heading">
            <p aria-live="polite">
              <b>{query.data?.meta?.total ?? '—'}</b> opportunities
            </p>
            <label className="sort-label">
              Sort by
              <select
                value={params.get('sort') ?? 'newest'}
                onChange={(e) => filter('sort', e.target.value)}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </label>
          </div>
          <QueryState query={query}>
            {(data) => (
              <>
                <div className="job-list">
                  {data.data.length ? (
                    data.data.map((job) => (
                      <JobCard key={job.id} job={job} onOpen={() => openJob(job)} />
                    ))
                  ) : (
                    <EmptyState
                      title="No matching roles yet"
                      text="Try another keyword or broaden your filters."
                    />
                  )}
                </div>
                <Pagination page={data} onChange={(page) => filter('page', String(page))} />
              </>
            )}
          </QueryState>
        </div>
      </div>
    </section>
  );
}
export function JobDetailsPage({
  slug,
  user,
  notify,
}: {
  slug: string;
  user: AuthUser | null;
  notify: (message: string) => void;
}) {
  const query = useData<{ data: Job }>(`/api/jobs/${encodeURIComponent(slug)}`);
  const [applying, setApplying] = useState(false);
  const state = useData<{ data: { saved: boolean; applied: boolean } }>(
    `/api/candidate/jobs/${slug}/state`,
    user?.role === 'candidate',
  );
  const saved = state.data?.data.saved ?? false;
  const save = useMutation({
    mutationFn: () =>
      apiSend(`/api/candidate/saved-jobs/${query.data!.data.id}`, saved ? 'DELETE' : 'PUT'),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [`/api/candidate/jobs/${slug}/state`] });
      const previous = state.data;
      queryClient.setQueryData([`/api/candidate/jobs/${slug}/state`], {
        data: { ...previous?.data, saved: !saved },
      });
      return previous;
    },
    onError: (error, _variables, previous) => {
      queryClient.setQueryData([`/api/candidate/jobs/${slug}/state`], previous);
      notify(error.message);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        predicate: (q) =>
          String(q.queryKey[0]).includes('/candidate/') ||
          String(q.queryKey[0]).includes('/dashboard'),
      });
    },
  });
  useEffect(() => {
    if (!query.data) return;
    const job = query.data.data;
    const previous = document.title;
    document.title = `${job.title} at ${job.company} | Eyros`;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: job.title,
      description: job.description,
      datePosted: job.published_at,
      ...(job.closes_at ? { validThrough: job.closes_at } : {}),
      hiringOrganization: { '@type': 'Organization', name: job.company },
      employmentType: job.type.toUpperCase().replace('-', '_'),
      jobLocation: {
        '@type': 'Place',
        address: { '@type': 'PostalAddress', addressLocality: job.location },
      },
    });
    document.head.appendChild(script);
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = window.location.origin + `/jobs/${job.slug}`;
    document.head.appendChild(canonical);
    return () => {
      document.title = previous;
      script.remove();
      canonical.remove();
    };
  }, [query.data]);
  return (
    <section className="details">
      <Link className="back-link" to="/jobs">
        ← Back to opportunities
      </Link>
      <QueryState query={query}>
        {({ data: job }) => (
          <div className="detail-grid">
            <div>
              <div className="company-logo large violet">{job.company[0]}</div>
              <span className="eyebrow dark">{job.posted}</span>
              <h1>{job.title}</h1>
              <Link className="detail-company" to={`/companies/${job.company_slug}`}>
                {job.company} · {job.location}
              </Link>
              <div className="detail-actions">
                <Button
                  disabled={
                    user?.role === 'candidate' && (state.isPending || !!state.data?.data.applied)
                  }
                  onClick={() => {
                    if (!user) navigate(`/login?next=${encodeURIComponent(`/jobs/${slug}`)}`);
                    else if (user.role !== 'candidate')
                      notify('Sign in with a candidate account to apply.');
                    else setApplying(true);
                  }}
                >
                  {state.data?.data.applied ? 'Application submitted' : 'Apply for this role'}
                </Button>
                {(!user || user.role === 'candidate') && (
                  <Button
                    className="outline-button"
                    disabled={save.isPending || (!!user && state.isPending)}
                    aria-pressed={saved}
                    onClick={() =>
                      user
                        ? save.mutate(undefined)
                        : navigate(`/login?next=${encodeURIComponent(`/jobs/${slug}`)}`)
                    }
                  >
                    {saved ? 'Saved ✓' : 'Save job'}
                  </Button>
                )}
              </div>
              <article className="description">
                <h2>About the role</h2>
                <p className="pre-wrap">{job.description}</p>
                <h2>What you’ll bring</h2>
                <div className="tags">
                  {job.skills.map((skill) => (
                    <span className="badge" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
              </article>
            </div>
            <aside className="job-overview">
              <h3>The details</h3>
              <dl>
                <dt>Employment</dt>
                <dd>{job.type}</dd>
                <dt>Work mode</dt>
                <dd>{job.mode}</dd>
                <dt>Salary</dt>
                <dd>{job.salary || 'Not disclosed'}</dd>
                <dt>Experience</dt>
                <dd>{job.experience_level || 'Not specified'}</dd>
                {job.closes_at && (
                  <>
                    <dt>Apply before</dt>
                    <dd>{new Date(job.closes_at).toLocaleDateString()}</dd>
                  </>
                )}
              </dl>
              <hr />
              <h3>About {job.company}</h3>
              <p>
                {job.company_description || 'Learn more about this team on their company page.'}
              </p>
              <Link to={`/companies/${job.company_slug}`}>Meet the company →</Link>
            </aside>
            {applying && <ApplyDialog job={job} onClose={() => setApplying(false)} />}
          </div>
        )}
      </QueryState>
    </section>
  );
}
function ApplyDialog({ job, onClose }: { job: Job; onClose: () => void }) {
  const resumes = useData<{ data: Resume[] }>('/api/candidate/resumes');
  const [step, setStep] = useState(0);
  const [resumeId, setResumeId] = useState('');
  const [cover, setCover] = useState('');
  const [answers, setAnswers] = useState<string[]>(job.screening_questions.map(() => ''));
  const submit = useAction(async () => {
    await apiSend(`/api/jobs/${job.id}/apply`, 'POST', {
      resume_id: resumeId ? Number(resumeId) : null,
      cover_letter: cover,
      answers,
    });
    setStep(4);
  }, 'Your application has been submitted.');
  const selected = resumes.data?.data.find((r) => r.id === Number(resumeId));
  return (
    <Modal
      title={step === 4 ? 'You’ve taken the next step.' : `Apply to ${job.company}`}
      onClose={onClose}
    >
      {step === 4 ? (
        <div className="application-success">
          <h3>Application received</h3>
          <p>Track updates and messages from your candidate workspace.</p>
          <Link className="button" to="/candidate/applications">
            View applications
          </Link>
        </div>
      ) : (
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (step < 3) setStep(step + 1);
            else submit.mutate(undefined);
          }}
        >
          <p className="muted">
            Step {step + 1} of 4 ·{' '}
            {['Your resume', 'Cover letter', 'Screening questions', 'Review application'][step]}
          </p>
          {step === 0 && (
            <QueryState query={resumes}>
              {({ data }) => (
                <>
                  <label>
                    Choose a resume
                    <select value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
                      <option value="">Continue without a resume</option>
                      {data.map((resume) => (
                        <option key={resume.id} value={resume.id}>
                          {resume.name}
                          {resume.is_default ? ' (default)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p>
                    <Link to="/candidate/resumes">Upload or manage resumes →</Link>
                  </p>
                </>
              )}
            </QueryState>
          )}
          {step === 1 && (
            <label>
              Why are you a good fit? (optional)
              <textarea
                rows={8}
                value={cover}
                onChange={(e) => setCover(e.target.value)}
                maxLength={5000}
              />
            </label>
          )}
          {step === 2 &&
            (job.screening_questions.length ? (
              job.screening_questions.map((question, index) => (
                <label key={index}>
                  {question}
                  <textarea
                    required
                    value={answers[index]}
                    maxLength={2000}
                    onChange={(e) =>
                      setAnswers(
                        answers.map((answer, i) => (i === index ? e.target.value : answer)),
                      )
                    }
                  />
                </label>
              ))
            ) : (
              <p>This role has no screening questions.</p>
            ))}
          {step === 3 && (
            <div>
              <h3>{job.title}</h3>
              <p>Resume: {selected?.name ?? 'No resume attached'}</p>
              <h4>Cover letter</h4>
              <p className="pre-wrap">{cover || 'Not included'}</p>
              {answers.map((answer, index) => (
                <div key={index}>
                  <h4>{job.screening_questions[index]}</h4>
                  <p>{answer}</p>
                </div>
              ))}
              <p className="muted">
                Your profile and the selected resume will be shared with this employer. You can
                submit once per role.
              </p>
            </div>
          )}
          <ErrorText error={submit.error} />
          <div className="actions">
            {step > 0 && (
              <Button
                type="button"
                className="outline-button"
                disabled={submit.isPending}
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
            )}
            <Button disabled={submit.isPending || (step === 0 && !resumes.isSuccess)}>
              {submit.isPending ? 'Submitting…' : step === 3 ? 'Submit application' : 'Continue'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
export function CompaniesPage({ slug }: { slug?: string }) {
  const [page, setPage] = useState(1);
  const list = useData<Page<Company>>(`/api/companies?page=${page}`, !slug);
  const detail = useData<{ data: Company }>(`/api/companies/${slug}`, !!slug);
  return (
    <section className="jobs-page">
      {slug ? (
        <QueryState query={detail}>
          {({ data }) => (
            <>
              <Link to="/companies">← All companies</Link>
              <div className="page-intro">
                <span className="eyebrow dark">MEET THE TEAM</span>
                <h1>{data.name}</h1>
                <p className="pre-wrap">
                  {data.description || 'This team is building its company profile.'}
                </p>
                {data.website && /^https?:\/\//.test(data.website) && (
                  <a
                    className="text-link"
                    href={data.website}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Visit company website →
                  </a>
                )}
              </div>
              <h2>Open opportunities</h2>
              <div className="job-list">
                {data.jobs?.length ? (
                  data.jobs.map((job) => (
                    <JobCard key={job.id} job={job} onOpen={() => navigate(`/jobs/${job.slug}`)} />
                  ))
                ) : (
                  <EmptyState
                    title="No open roles right now"
                    text="Check back for this team’s next opportunity."
                  />
                )}
              </div>
            </>
          )}
        </QueryState>
      ) : (
        <>
          <div className="page-intro">
            <span className="eyebrow dark">GREAT WORK STARTS WITH GREAT TEAMS</span>
            <h1>Meet your next team.</h1>
            <p>Discover the people and companies shaping what’s next.</p>
          </div>
          <QueryState query={list}>
            {(data) => (
              <>
                <div className="company-grid">
                  {data.data.map((company) => (
                    <Link
                      className="panel company-card"
                      key={company.id}
                      to={`/companies/${company.slug}`}
                    >
                      <div className="company-logo violet">{company.name[0]}</div>
                      <h2>{company.name}</h2>
                      <p>
                        {company.description?.slice(0, 180) ||
                          'Explore this team and their opportunities.'}
                      </p>
                      <strong>{company.jobs_count ?? 0} open roles →</strong>
                    </Link>
                  ))}
                </div>
                {!data.data.length && (
                  <EmptyState
                    title="Teams are getting ready"
                    text="Company profiles will appear here as employers join."
                  />
                )}
                <Pagination page={data} onChange={setPage} />
              </>
            )}
          </QueryState>
        </>
      )}
    </section>
  );
}
