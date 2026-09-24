import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { getJobs } from '../services/api';
import type { Job } from '../types';
import { Icon } from '../components/common/Icon';
import { Button, EmptyState } from '../components/common/Ui';
import { JobCard } from '../components/jobs/JobCard';
import { navigate } from '../routes/navigation';

export function HomePage({ openJob }: { openJob: (job: Job) => void }) {
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getJobs()
      .then(setJobs)
      .catch((error: Error) => setError(error.message))
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
              aria-label="Job title, skill, or company"
              placeholder="Job title, skill, or company"
            />
          </label>
          <label>
            <Icon name="pin" />
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              aria-label="Location"
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
          {error && (
            <p role="alert" className="auth-error">
              {error}
            </p>
          )}
          {!loading && !error && jobs.length === 0 && (
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
