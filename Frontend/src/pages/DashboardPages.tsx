import { Link } from 'react-router-dom';
import type { Application, Interview } from '../types';
import { useData } from '../features/hooks';
import { date, PageHeader, QueryState, Status } from '../features/shared';
import { EmptyState } from '../components/common/Ui';

export default function DashboardPage({
  role,
  analytics = false,
}: {
  role: 'candidate' | 'employer' | 'admin';
  analytics?: boolean;
}) {
  const query = useData<{
    data: {
      stats: Record<string, number>;
      pipeline: Record<string, number>;
      trend: { date: string; applications: number }[];
      recent: Application[];
      interviews: Interview[];
    };
  }>('/api/workspace/dashboard');
  return (
    <main className="dashboard-content">
      <PageHeader
        title={
          analytics
            ? 'Hiring analytics'
            : role === 'candidate'
              ? 'Make your next move.'
              : role === 'employer'
                ? 'Build your next great team.'
                : 'Your platform, at a glance.'
        }
        description="A live view of your activity and what needs your attention."
      >
        <Link
          className="button"
          to={
            role === 'candidate'
              ? '/jobs'
              : role === 'employer'
                ? '/employer/jobs/create'
                : '/admin/jobs'
          }
        >
          {role === 'candidate'
            ? 'Explore jobs'
            : role === 'employer'
              ? 'Create a job'
              : 'Review jobs'}
        </Link>
      </PageHeader>
      <QueryState query={query}>
        {({ data }) => (
          <>
            <section className="metric-grid">
              {Object.entries(data.stats).map(([label, value]) => (
                <article className="metric-card" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <small>Across your workspace</small>
                </article>
              ))}
            </section>
            <div className="dashboard-grid">
              <section className="panel">
                <h2>Applications this week</h2>
                <p className="muted">Daily application activity</p>
                <div
                  className="bar-chart"
                  role="img"
                  aria-label={data.trend
                    .map((point) => `${point.date}: ${point.applications} applications`)
                    .join(', ')}
                >
                  {data.trend.map((point) => (
                    <div key={point.date}>
                      <b>{point.applications}</b>
                      <span
                        style={{
                          height: `${Math.max(3, (point.applications / Math.max(1, ...data.trend.map((p) => p.applications))) * 130)}px`,
                        }}
                      />
                      <small>{point.date}</small>
                    </div>
                  ))}
                </div>
              </section>
              <section className="panel">
                <h2>Application pipeline</h2>
                {Object.keys(data.pipeline).length ? (
                  Object.entries(data.pipeline).map(([status, count]) => (
                    <div className="pipeline-count" key={status}>
                      <Status value={status} />
                      <strong>{count}</strong>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title="Your pipeline starts here"
                    text="Applications will appear as candidates apply."
                  />
                )}
              </section>
            </div>
            <section className="panel">
              <div className="section-heading">
                <h2>Recent applications</h2>
                <Link to={`/${role}/applications`}>View all →</Link>
              </div>
              {data.recent.length ? (
                data.recent.map((app) => (
                  <Link className="record-row" to={`/${role}/applications/${app.id}`} key={app.id}>
                    <div>
                      <strong>{app.job.title}</strong>
                      <small>
                        {role === 'candidate' ? app.job.company.name : app.candidate.name} ·{' '}
                        {date(app.created_at)}
                      </small>
                    </div>
                    <Status value={app.status} />
                  </Link>
                ))
              ) : (
                <EmptyState
                  title="No applications yet"
                  text="Your latest application activity will appear here."
                />
              )}
            </section>
            <section className="panel">
              <h2>Upcoming interviews</h2>
              {data.interviews.length ? (
                data.interviews.map((interview) => (
                  <Link className="record-row" key={interview.id} to={`/${role}/interviews`}>
                    <div>
                      <strong>{interview.application.job.title}</strong>
                      <small>
                        {date(interview.starts_at)} · {interview.duration_minutes} minutes
                      </small>
                    </div>
                    <span>{interview.location}</span>
                  </Link>
                ))
              ) : (
                <EmptyState
                  title="Nothing scheduled yet"
                  text="Confirmed interviews will be listed here."
                />
              )}
            </section>
          </>
        )}
      </QueryState>
    </main>
  );
}
