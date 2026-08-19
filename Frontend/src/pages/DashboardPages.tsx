import { applications, jobs } from '../data/mockData';
import type { ReactNode } from 'react';
import { Icon } from '../components/common/Icon';
import { Badge, Button, EmptyState } from '../components/common/Ui';
import { navigate } from '../routes/navigation';
import type { Role } from '../types';

export function DashboardPage({ role }: { role: Exclude<Role, 'guest'> }) {
  const config =
    role === 'candidate'
      ? {
          kicker: 'Your career command centre',
          title: 'Good morning, Alex.',
          copy: 'You have 3 active applications and 12 new roles that match your profile.',
          stats: [
            ['3', 'Active applications'],
            ['1', 'Upcoming interview'],
            ['8', 'Saved jobs'],
          ],
          action: 'Browse jobs',
        }
      : role === 'employer'
        ? {
            kicker: 'Hiring overview',
            title: 'Build your best team.',
            copy: 'Your roles have received 48 new applications this week.',
            stats: [
              ['6', 'Active jobs'],
              ['148', 'Total applicants'],
              ['14', 'In interviews'],
            ],
            action: 'Post a job',
          }
        : {
            kicker: 'Platform overview',
            title: 'The platform is healthy.',
            copy: 'Keep an eye on marketplace quality and growth trends.',
            stats: [
              ['12,480', 'Total users'],
              ['842', 'Live jobs'],
              ['68%', 'Application rate'],
            ],
            action: 'Review jobs',
          };
  return (
    <main className="dashboard-content">
      <span className="eyebrow dark">
        <i />
        {config.kicker}
      </span>
      <div className="dashboard-title">
        <div>
          <h1>{config.title}</h1>
          <p>{config.copy}</p>
        </div>
        <Button
          onClick={() =>
            navigate(
              role === 'candidate'
                ? '/jobs'
                : role === 'employer'
                  ? '/employer/jobs'
                  : '/admin/jobs',
            )
          }
        >
          <Icon name="plus" size={17} />
          {config.action}
        </Button>
      </div>
      <div className="stats">
        {config.stats.map(([value, label]) => (
          <article key={label}>
            <strong>{value}</strong>
            <span>{label}</span>
            <small>↑ 12% this month</small>
          </article>
        ))}
      </div>
      {role === 'candidate' ? <CandidateActivity /> : <HiringActivity role={role} />}
    </main>
  );
}
function CandidateActivity() {
  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <h2>Recent applications</h2>
          <p>Track progress as your applications move forward.</p>
        </div>
        <button className="text-link" onClick={() => navigate('/candidate/applications')}>
          View all
        </button>
      </div>
      <div className="table">
        {applications.map((app) => (
          <div className="table-row" key={app.id}>
            <span className={`tiny-logo ${app.tone}`}>{app.company[0]}</span>
            <div>
              <b>{app.job}</b>
              <small>
                {app.company} · Applied {app.applied}
              </small>
            </div>
            <Badge
              tone={
                app.status === 'Interview'
                  ? 'success'
                  : app.status === 'Under review'
                    ? 'accent'
                    : 'neutral'
              }
            >
              {app.status}
            </Badge>
            <button className="row-action" onClick={() => navigate('/candidate/applications')}>
              View
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
function HiringActivity({ role }: { role: 'employer' | 'admin' }) {
  return (
    <div className="dashboard-grid">
      <section className="panel">
        <div className="panel-title">
          <div>
            <h2>{role === 'employer' ? 'Top roles' : 'Jobs awaiting review'}</h2>
            <p>
              {role === 'employer'
                ? 'Your jobs with the most activity this week.'
                : 'Keep quality high across the marketplace.'}
            </p>
          </div>
          <button
            className="text-link"
            onClick={() => navigate(role === 'employer' ? '/employer/jobs' : '/admin/jobs')}
          >
            View all
          </button>
        </div>
        <div className="bar-list">
          {jobs.slice(0, 4).map((job, index) => (
            <div key={job.id}>
              <span>{job.title}</span>
              <b>{48 - index * 8}</b>
              <i style={{ width: `${75 - index * 13}%` }} />
            </div>
          ))}
        </div>
      </section>
      <section className="panel panel-accent">
        <Icon name="users" size={22} />
        <h2>{role === 'employer' ? 'Discover great talent' : 'Review flagged reports'}</h2>
        <p>
          {role === 'employer'
            ? 'Search our candidate pool to find your next great hire.'
            : 'There are 6 reports requiring a decision today.'}
        </p>
        <Button
          className="outline-button"
          onClick={() => navigate(role === 'employer' ? '/employer/candidates' : '/admin/reports')}
        >
          Open workspace
        </Button>
      </section>
    </div>
  );
}
export function ListPage({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: string;
  children?: ReactNode;
}) {
  return (
    <main className="dashboard-content">
      <div className="dashboard-title">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {action && (
          <Button>
            <Icon name="plus" size={17} />
            {action}
          </Button>
        )}
      </div>
      {children ?? (
        <section className="panel">
          <EmptyState
            title={`No ${title.toLowerCase()} yet`}
            text="When information is available, it will appear here."
          />
        </section>
      )}
    </main>
  );
}
