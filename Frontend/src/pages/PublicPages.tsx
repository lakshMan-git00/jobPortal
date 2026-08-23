import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { applyForJob, getJob, getJobs } from '../services/api';
import type { AuthUser, Job } from '../types';
import { Icon } from '../components/common/Icon';
import { Badge, Button, EmptyState } from '../components/common/Ui';
import { JobCard } from '../components/jobs/JobCard';
import { navigate } from '../routes/navigation';

export function HomePage({ openJob }: { openJob: (job: Job) => void }) {
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getJobs()
      .then(setJobs)
      .finally(() => setLoading(false));
  }, []);
  const search = (e: FormEvent) => {
    e.preventDefault();
    navigate(
      `/jobs?keyword=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}`,
    );
  };
  return (
    <>
      <section className="hero">
        <span className="eyebrow">
          <i />
          Built for meaningful work
        </span>
        <h1>
          Find work that
          <br />
          <em>moves you forward.</em>
        </h1>
        <p>Discover thoughtfully curated opportunities at companies building the future.</p>
        <form className="hero-search" onSubmit={search}>
          <label>
            <Icon name="search" />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Job title, skill, or company"
            />
          </label>
          <label>
            <Icon name="pin" />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, state, or remote"
            />
          </label>
          <Button type="submit">
            Search jobs <Icon name="arrow" size={16} />
          </Button>
        </form>
        <div className="popular">
          Popular: <button onClick={() => setKeyword('Designer')}>Product Designer</button>
          <button onClick={() => setKeyword('Engineer')}>Software Engineer</button>
          <button onClick={() => setKeyword('Marketing')}>Marketing</button>
        </div>
        <div className="orb one" />
        <div className="orb two" />
      </section>
      <TrustStrip />
      <section className="public-section">
        <div className="section-title">
          <div>
            <span className="eyebrow dark">
              <i />
              Fresh opportunities
            </span>
            <h2>
              Roles worth getting
              <br />
              excited about.
            </h2>
          </div>
          <button className="text-link" onClick={() => navigate('/jobs')}>
            View all jobs <Icon name="arrow" size={16} />
          </button>
        </div>
        <div className="job-list home-jobs">
          {loading ? (
            <div className="loading">Loading opportunities…</div>
          ) : (
            jobs
              .slice(0, 4)
              .map((job) => <JobCard job={job} onOpen={() => openJob(job)} key={job.id} />)
          )}
          {!loading && jobs.length === 0 && (
            <EmptyState
              title="No jobs are live yet"
              text="Please check back soon for new opportunities."
            />
          )}
        </div>
      </section>
      <CareerCta />
    </>
  );
}
export function JobsPage({ openJob }: { openJob: (job: Job) => void }) {
  const params = new URLSearchParams(window.location.search);
  const [keyword, setKeyword] = useState(params.get('keyword') ?? '');
  const [location, setLocation] = useState(params.get('location') ?? '');
  const [result, setResult] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('All');
  const load = async (nextKeyword = keyword, nextLocation = location) => {
    setLoading(true);
    setError('');
    try {
      setResult(await getJobs({ keyword: nextKeyword, location: nextLocation }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load jobs.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    getJobs({ keyword, location })
      .then(setResult)
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : 'Unable to load jobs.'),
      )
      .finally(() => setLoading(false));
    // Search values are read from the URL once on this route entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate(
      `/jobs?keyword=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}`,
    );
    void load();
  };
  const displayed = mode === 'All' ? result : result.filter((job) => job.mode === mode);
  return (
    <section className="jobs-page">
      <div className="page-intro">
        <span className="eyebrow dark">
          <i />
          Find your next opportunity
        </span>
        <h1>Browse open roles.</h1>
        <p>Search roles from teams doing work that matters.</p>
      </div>
      <form className="search-row" onSubmit={submit}>
        <label>
          <Icon name="search" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Job title, skill, or company"
          />
        </label>
        <label>
          <Icon name="pin" />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
          />
        </label>
        <Button>Search</Button>
      </form>
      <div className="filter-row">
        <span>
          <b>{displayed.length}</b> opportunities
        </span>
        <div>
          {['All', 'Remote', 'Hybrid', 'On-site'].map((item) => (
            <button
              className={mode === item ? 'selected' : ''}
              onClick={() => setMode(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="job-list">
        {loading ? (
          <div className="loading">Loading opportunities…</div>
        ) : error ? (
          <EmptyState
            title="Jobs are unavailable"
            text={error}
            action={<Button onClick={() => void load()}>Try again</Button>}
          />
        ) : displayed.length ? (
          displayed.map((job) => <JobCard job={job} onOpen={() => openJob(job)} key={job.id} />)
        ) : (
          <EmptyState
            title="No jobs matched your search"
            text="Try a different keyword, location, or work mode."
            action={
              <Button
                onClick={() => {
                  setKeyword('');
                  setLocation('');
                  setMode('All');
                  void load('', '');
                }}
              >
                Clear search
              </Button>
            }
          />
        )}
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
  const [job, setJob] = useState<Job>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    getJob(slug)
      .then(setJob)
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : 'Job not found.'),
      )
      .finally(() => setLoading(false));
  }, [slug]);

  const apply = async () => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/jobs/${slug}`)}`);
      return;
    }
    if (user.role !== 'candidate') {
      notify('Only candidate accounts can apply for jobs.');
      return;
    }
    setApplying(true);
    try {
      await applyForJob(job!.id);
      notify('Your application was submitted successfully.');
    } catch (applicationError) {
      notify(
        applicationError instanceof Error
          ? applicationError.message
          : 'Unable to submit application.',
      );
    } finally {
      setApplying(false);
    }
  };

  if (loading)
    return (
      <section className="not-found">
        <div className="loading">Loading role…</div>
      </section>
    );
  if (!job)
    return (
      <section className="not-found">
        <h1>{error || 'Job not found.'}</h1>
        <Button onClick={() => navigate('/jobs')}>Browse open roles</Button>
      </section>
    );
  return (
    <section className="details">
      <button className="back-link" onClick={() => navigate('/jobs')}>
        ← Back to jobs
      </button>
      <div className="detail-grid">
        <div>
          <div className="company-logo large violet">{job.company[0]}</div>
          <span className="eyebrow dark">
            <i />
            {job.posted}
          </span>
          <h1>{job.title}</h1>
          <p className="detail-company">
            {job.company} · {job.location}
          </p>
          <div className="detail-actions">
            <Button onClick={() => void apply()} disabled={applying}>
              {applying ? 'Submitting…' : 'Apply now'} <Icon name="arrow" size={16} />
            </Button>
          </div>
          <article className="description">
            <h2>About the role</h2>
            <p>{job.description}</p>
            <h2>Skills we’re looking for</h2>
            <div className="tags">
              {job.skills.map((skill) => (
                <Badge key={skill}>{skill}</Badge>
              ))}
            </div>
          </article>
        </div>
        <aside className="job-overview">
          <h3>Job overview</h3>
          <p>
            <Icon name="briefcase" />
            {job.type}
          </p>
          <p>
            <Icon name="pin" />
            {job.mode}
          </p>
          <p>
            <Icon name="chart" />
            {job.salary ?? 'Not disclosed'}
          </p>
          <hr />
          <h3>About {job.company}</h3>
          <p>{job.company_description || 'No company description has been provided.'}</p>
        </aside>
      </div>
    </section>
  );
}
function TrustStrip() {
  return (
    <section className="trust">
      <span>Thoughtful opportunities, published by verified employers</span>
      <div>
        <b>Discover</b>
        <b>Apply</b>
        <b>Grow</b>
      </div>
    </section>
  );
}
function CareerCta() {
  return (
    <section className="career-cta">
      <div>
        <span className="eyebrow">
          <i />
          Your career, with intention
        </span>
        <h2>
          Move with clarity.
          <br />
          <em>Grow with confidence.</em>
        </h2>
        <p>Practical guides, real-world advice, and tools for your next move.</p>
        <Button className="light" onClick={() => navigate('/resources')}>
          Explore career resources <Icon name="arrow" size={16} />
        </Button>
      </div>
      <div className="chapter">
        YOUR NEXT
        <br />
        <b>CHAPTER</b>
      </div>
    </section>
  );
}
