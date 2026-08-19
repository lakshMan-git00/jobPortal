import { useEffect, useState } from 'react';
import { jobs } from './data/mockData';
import type { Job, Role } from './types';
import { PublicHeader, DashboardLayout } from './components/layout/Shell';
import { navigate } from './routes/navigation';
import { Button } from './components/common/Ui';
import { Icon } from './components/common/Icon';
import { HomePage, JobDetailsPage, JobsPage } from './pages/PublicPages';
import { DashboardPage, ListPage } from './pages/DashboardPages';
import './App.css';

function usePathname() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onChange = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onChange);
    return () => window.removeEventListener('popstate', onChange);
  }, []);
  return path;
}
function getJob(path: string) {
  const slug = path.replace('/jobs/', '');
  return jobs.find((job) => job.slug === slug);
}

function App() {
  const path = usePathname();
  const [role, setRole] = useState<Role>('guest');
  const [saved, setSaved] = useState<number[]>([]);
  const [toast, setToast] = useState('');
  const toggleSaved = (id: number) => {
    const isSaved = saved.includes(id);
    setSaved((items) => (isSaved ? items.filter((item) => item !== id) : [...items, id]));
    setToast(isSaved ? 'Removed from saved jobs.' : 'Job saved successfully.');
  };
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const openJob = (job: Job) => navigate(`/jobs/${job.slug}`);
  const isDashboard = /^\/(candidate|employer|admin)\//.test(path);
  const routeRole = isDashboard ? (path.split('/')[1] as Exclude<Role, 'guest'>) : null;
  const page = (() => {
    if (path === '/') return <HomePage saved={saved} toggleSaved={toggleSaved} openJob={openJob} />;
    if (path === '/jobs')
      return <JobsPage saved={saved} toggleSaved={toggleSaved} openJob={openJob} />;
    if (path.startsWith('/jobs/')) {
      const job = getJob(path);
      return (
        <JobDetailsPage
          job={job}
          saved={job ? saved.includes(job.id) : false}
          toggleSaved={() => job && toggleSaved(job.id)}
          apply={() => {
            setRole('candidate');
            setToast(`Your application for ${job?.title} is ready to complete.`);
            navigate('/candidate/applications');
          }}
        />
      );
    }
    if (path === '/login')
      return (
        <LoginPage
          onRole={(nextRole) => {
            setRole(nextRole);
            navigate(`/${nextRole}/dashboard`);
          }}
        />
      );
    if (path === '/companies' || path === '/resources') return <InfoPage type={path.slice(1)} />;
    return <NotFound />;
  })();
  if (isDashboard && routeRole) {
    const dashboardPage = path.endsWith('/dashboard') ? (
      <DashboardPage role={routeRole} />
    ) : (
      <WorkspaceRoute role={routeRole} path={path} saved={saved} />
    );
    return (
      <>
        <DashboardLayout role={routeRole} path={path}>
          {dashboardPage}
        </DashboardLayout>
        {toast && <Toast text={toast} />}
      </>
    );
  }
  return (
    <>
      <PublicHeader role={role} onRole={setRole} />
      {page}
      <PublicFooter />
      {toast && <Toast text={toast} />}
    </>
  );
}

function WorkspaceRoute({
  role,
  path,
  saved,
}: {
  role: Exclude<Role, 'guest'>;
  path: string;
  saved: number[];
}) {
  const title = path.split('/').pop()?.replace(/-/g, ' ') ?? 'workspace';
  if (role === 'candidate' && path.endsWith('/applications'))
    return (
      <ListPage title="Applications" description="See each application and its latest status.">
        <section className="panel">
          <div className="table">
            {[
              'Senior Product Designer — Linear',
              'Product Designer — Webflow',
              'Brand Designer — Framer',
            ].map((item, i) => (
              <div className="table-row" key={item}>
                <span className="tiny-logo violet">{item[0]}</span>
                <div>
                  <b>{item}</b>
                  <small>Applied Aug {18 - i * 4}, 2026</small>
                </div>
                <span className="badge badge-accent">{i === 1 ? 'Interview' : 'Under review'}</span>
                <button className="row-action">View</button>
              </div>
            ))}
          </div>
        </section>
      </ListPage>
    );
  if (role === 'candidate' && path.endsWith('/saved-jobs'))
    return (
      <ListPage title="Saved jobs" description="Roles you saved for later.">
        {saved.length ? (
          <section className="panel">
            <p>
              {saved.length} saved role{saved.length > 1 ? 's' : ''}
            </p>
          </section>
        ) : (
          <section className="panel">
            <div className="empty">
              <h3>Your saved list is waiting.</h3>
              <p>Save roles to compare them and apply when you’re ready.</p>
              <Button onClick={() => navigate('/jobs')}>Browse jobs</Button>
            </div>
          </section>
        )}
      </ListPage>
    );
  const configs: Record<Exclude<Role, 'guest'>, Record<string, [string, string, string?]>> = {
    candidate: {
      resumes: ['Resumes', 'Upload and manage the resumes you use to apply.', 'Upload resume'],
      settings: ['Settings', 'Manage your profile and preferences.'],
    },
    employer: {
      jobs: ['Jobs', 'Create, publish, and manage your open roles.', 'Post a job'],
      candidates: ['Candidates', 'Search and review talented people in your pipeline.'],
      analytics: ['Analytics', 'Monitor views, applications, and hiring conversion.'],
      settings: ['Settings', 'Manage company and workspace preferences.'],
    },
    admin: {
      users: ['Users', 'Manage candidates, employers, and access.'],
      jobs: ['Job moderation', 'Review job listings before they go live.'],
      reports: ['Reports', 'Review platform health and reported content.'],
      settings: ['Settings', 'Manage platform-wide configuration.'],
    },
  };
  const config = configs[role][title] ?? [
    'Workspace',
    'This section is ready for API-powered data.',
  ];
  return <ListPage title={config[0]} description={config[1]} action={config[2]} />;
}
function LoginPage({ onRole }: { onRole: (role: Exclude<Role, 'guest'>) => void }) {
  return (
    <main className="login-page">
      <section>
        <span className="eyebrow dark">
          <i />
          Welcome to Northstar
        </span>
        <h1>
          Pick a workspace
          <br />
          <em>to continue.</em>
        </h1>
        <p>
          Demo access lets you explore every role-specific workspace without a backend connection.
        </p>
        <div className="role-cards">
          {(['candidate', 'employer', 'admin'] as const).map((item) => (
            <button key={item} onClick={() => onRole(item)}>
              <span className="role-icon">
                <Icon
                  name={item === 'candidate' ? 'home' : item === 'employer' ? 'briefcase' : 'users'}
                />
              </span>
              <div>
                <b>{item[0].toUpperCase() + item.slice(1)}</b>
                <small>
                  {item === 'candidate'
                    ? 'Find jobs and track applications'
                    : item === 'employer'
                      ? 'Manage jobs and candidates'
                      : 'Moderate the platform'}
                </small>
              </div>
              <Icon name="arrow" size={18} />
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
function InfoPage({ type }: { type: string }) {
  return (
    <main className="info-page">
      <span className="eyebrow dark">
        <i />
        Northstar
      </span>
      <h1>
        {type === 'companies'
          ? 'Meet teams building what’s next.'
          : 'Career growth, made practical.'}
      </h1>
      <p>More {type} content will connect here as the Laravel API and CMS are integrated.</p>
      <Button onClick={() => navigate('/jobs')}>Browse open roles</Button>
    </main>
  );
}
function NotFound() {
  return (
    <main className="not-found">
      <h1>We couldn’t find that page.</h1>
      <p>The link may be out of date, or the page has moved.</p>
      <Button onClick={() => navigate('/')}>Return home</Button>
    </main>
  );
}
function Toast({ text }: { text: string }) {
  return (
    <div className="toast">
      <Icon name="check" size={17} />
      {text}
    </div>
  );
}
function PublicFooter() {
  return (
    <footer>
      <div>
        <button className="brand" onClick={() => navigate('/')}>
          <span className="brand-mark">N</span>northstar
        </button>
        <p>Find work that moves you forward.</p>
      </div>
      <div>
        <h4>For candidates</h4>
        <button onClick={() => navigate('/jobs')}>Browse jobs</button>
        <button onClick={() => navigate('/resources')}>Career resources</button>
      </div>
      <div>
        <h4>For companies</h4>
        <button onClick={() => navigate('/login')}>Post a job</button>
        <button onClick={() => navigate('/companies')}>Company directory</button>
      </div>
      <div>
        <h4>Stay in the loop</h4>
        <p>New roles and career insights, weekly.</p>
        <form className="email">
          <input aria-label="Email address" placeholder="Your email address" type="email" />
          <button aria-label="Subscribe">
            <Icon name="arrow" size={16} />
          </button>
        </form>
      </div>
      <small>
        © 2026 Northstar, Inc. <span>Privacy</span>
        <span>Terms</span>
      </small>
    </footer>
  );
}
export default App;
