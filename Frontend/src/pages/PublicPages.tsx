import { useState } from 'react';
import type { FormEvent } from 'react';
import { jobs } from '../data/mockData';
import { getJobs } from '../services/api';
import type { Job } from '../types';
import { Icon } from '../components/common/Icon';
import { Badge, Button, EmptyState } from '../components/common/Ui';
import { JobCard } from '../components/jobs/JobCard';
import { navigate } from '../routes/navigation';

export function HomePage({
  saved,
  toggleSaved,
  openJob,
}: {
  saved: number[];
  toggleSaved: (id: number) => void;
  openJob: (job: Job) => void;
}) {
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
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
          {jobs.slice(0, 4).map((job) => (
            <JobCard
              job={job}
              saved={saved.includes(job.id)}
              onSave={() => toggleSaved(job.id)}
              onOpen={() => openJob(job)}
              key={job.id}
            />
          ))}
        </div>
      </section>
      <CareerCta />
    </>
  );
}
export function JobsPage({
  saved,
  toggleSaved,
  openJob,
}: {
  saved: number[];
  toggleSaved: (id: number) => void;
  openJob: (job: Job) => void;
}) {
  const params = new URLSearchParams(window.location.search);
  const [keyword, setKeyword] = useState(params.get('keyword') ?? '');
  const [location, setLocation] = useState(params.get('location') ?? '');
  const [result, setResult] = useState<Job[]>(jobs);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('All');
  const load = async (nextKeyword = keyword, nextLocation = location) => {
    setLoading(true);
    try {
      setResult(await getJobs({ keyword: nextKeyword, location: nextLocation }));
    } finally {
      setLoading(false);
    }
  };
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
        ) : displayed.length ? (
          displayed.map((job) => (
            <JobCard
              job={job}
              saved={saved.includes(job.id)}
              onSave={() => toggleSaved(job.id)}
              onOpen={() => openJob(job)}
              key={job.id}
            />
          ))
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
  job,
  saved,
  toggleSaved,
  apply,
}: {
  job?: Job;
  saved: boolean;
  toggleSaved: () => void;
  apply: () => void;
}) {
  if (!job)
    return (
      <section className="not-found">
        <h1>Job not found.</h1>
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
          <div className={`company-logo large ${job.tone}`}>{job.logo}</div>
          <span className="eyebrow dark">
            <i />
            {job.posted}
          </span>
          <h1>{job.title}</h1>
          <p className="detail-company">
            {job.company} · {job.location}
          </p>
          <div className="detail-actions">
            <Button onClick={apply}>
              Apply now <Icon name="arrow" size={16} />
            </Button>
            <Button className="outline-button" onClick={toggleSaved}>
              <Icon name="bookmark" size={17} />
              {saved ? 'Saved' : 'Save job'}
            </Button>
          </div>
          <article className="description">
            <h2>About the role</h2>
            <p>{job.description}</p>
            <p>
              You'll partner closely with a talented, kind team to create a product experience that
              feels clear, powerful, and remarkably human.
            </p>
            <h2>What you’ll do</h2>
            <ul>
              <li>Lead high-impact work from first conversation through launch.</li>
              <li>Collaborate with product, engineering, and customers.</li>
              <li>Raise the craft bar through thoughtful systems and feedback.</li>
            </ul>
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
            {job.salary}
          </p>
          <hr />
          <h3>About {job.company}</h3>
          <p>
            Building tools that help teams do their best work. A distributed team with a high bar
            for craft and care.
          </p>
        </aside>
      </div>
    </section>
  );
}
function TrustStrip() {
  return (
    <section className="trust">
      <span>Trusted by teams shaping what’s next</span>
      <div>
        <b>linear</b>
        <b>notion</b>
        <b>Webflow</b>
        <b>vercel</b>
        <b>framer</b>
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
