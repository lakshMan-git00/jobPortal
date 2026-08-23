import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { AuthUser, Job, Role } from './types';
import { currentUser, register, signIn, signOut } from './services/api';
import { PublicHeader, DashboardLayout } from './components/layout/Shell';
import { navigate } from './routes/navigation';
import { Button } from './components/common/Ui';
import { Icon } from './components/common/Icon';
import { HomePage, JobDetailsPage, JobsPage } from './pages/PublicPages';
import { DashboardPage, ListPage } from './pages/DashboardPages';
import { AdminAccessPage, EmployerJobsPage } from './pages/ManagementPages';
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
function App() {
  const path = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    currentUser().then((activeUser) => {
      setUser(activeUser);
      setAuthReady(true);
    });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const openJob = (job: Job) => navigate(`/jobs/${job.slug}`);
  const isDashboard = /^\/(candidate|employer|admin)\//.test(path);
  const routeRole = isDashboard ? (path.split('/')[1] as Exclude<Role, 'guest'>) : null;
  useEffect(() => {
    if (!authReady) return;
    if (path === '/admin') {
      navigate(user?.role === 'admin' ? '/admin/dashboard' : '/login?next=%2Fadmin');
      return;
    }
    if (isDashboard && (!user || routeRole !== user.role)) {
      navigate(`/login?next=${encodeURIComponent(path)}`);
    }
  }, [authReady, isDashboard, path, routeRole, user]);
  const page = (() => {
    if (path === '/') return <HomePage openJob={openJob} />;
    if (path === '/jobs')
      return <JobsPage openJob={openJob} />;
    if (path.startsWith('/jobs/')) {
      return (
        <JobDetailsPage
          slug={path.replace('/jobs/', '')}
          user={user}
          notify={setToast}
        />
      );
    }
    if (path === '/login')
      return (
        <LoginPage
          onAuthenticated={(nextUser) => {
            setUser(nextUser);
            const next = new URLSearchParams(window.location.search).get('next');
            navigate(next && next.startsWith('/') ? next : `/${nextUser.role}/dashboard`);
          }}
        />
      );
    if (path === '/companies' || path === '/resources') return <InfoPage type={path.slice(1)} />;
    return <NotFound />;
  })();
  if ((path === '/admin' || isDashboard) && !authReady) {
    return <main className="not-found"><div className="loading">Checking your session…</div></main>;
  }
  if (isDashboard && routeRole && user?.role === routeRole) {
    const dashboardPage = path.endsWith('/dashboard') ? (
      <DashboardPage role={routeRole} />
    ) : (
      <WorkspaceRoute role={routeRole} path={path} />
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
      <PublicHeader
        user={user}
        onSignOut={() => {
          void signOut().finally(() => {
            setUser(null);
            navigate('/');
          });
        }}
      />
      {page}
      <PublicFooter />
      {toast && <Toast text={toast} />}
    </>
  );
}

function WorkspaceRoute({
  role,
  path,
}: {
  role: Exclude<Role, 'guest'>;
  path: string;
}) {
  const title = path.split('/').pop()?.replace(/-/g, ' ') ?? 'workspace';
  if (role === 'admin' && path.endsWith('/users')) return <AdminAccessPage />;
  if (role === 'employer' && path.endsWith('/jobs')) return <EmployerJobsPage />;
  const configs: Record<Exclude<Role, 'guest'>, Record<string, [string, string, string?]>> = {
    candidate: {
      resumes: ['Resumes', 'Upload and manage the resumes you use to apply.', 'Upload resume'],
      settings: ['Settings', 'Manage your profile and preferences.'],
    },
    employer: {
      candidates: ['Candidates', 'Candidate information will become available as applications arrive.'],
      analytics: ['Analytics', 'Live hiring analytics will appear as jobs receive applications.'],
      settings: ['Settings', 'Manage company and workspace preferences.'],
    },
    admin: {
      users: ['Users', 'Manage candidates, employers, and access.'],
      jobs: ['Job moderation', 'Job moderation tools will display live posting data.'],
      reports: ['Reports', 'Reported content will appear here when submitted.'],
      settings: ['Settings', 'Manage platform-wide configuration.'],
    },
  };
  const config = configs[role][title] ?? [
    'Workspace',
    'This section is ready for API-powered data.',
  ];
  return <ListPage title={config[0]} description={config[1]} action={config[2]} />;
}
function LoginPage({ onAuthenticated }: { onAuthenticated: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const activeUser = mode === 'signin'
        ? await signIn(email, password)
        : await register(name, email, password, passwordConfirmation);
      onAuthenticated(activeUser);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Unable to continue.');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <main className="login-page">
      <section>
        <span className="eyebrow dark">
          <i />
          Welcome to Eyros
        </span>
        <h1>{mode === 'signin' ? <>Welcome <em>back.</em></> : <>Start your <em>next chapter.</em></>}</h1>
        <p>
          {mode === 'signin'
            ? 'Sign in to manage your account or continue an application.'
            : 'Create a candidate account to save roles and apply securely.'}
        </p>
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          {mode === 'register' && <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" autoComplete="name" required />}
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" type="email" autoComplete="email" required />
          <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required />
          {mode === 'register' && <input value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} placeholder="Confirm password" type="password" autoComplete="new-password" required />}
          {error && <p className="auth-error">{error}</p>}
          <Button type="submit" disabled={submitting}>{submitting ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}</Button>
        </form>
        <button className="text-link auth-switch" onClick={() => { setMode(mode === 'signin' ? 'register' : 'signin'); setError(''); }}>
          {mode === 'signin' ? 'Need an account? Register' : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>
  );
}
function InfoPage({ type }: { type: string }) {
  return (
    <main className="info-page">
      <span className="eyebrow dark">
        <i />
        Eyros
      </span>
      <h1>
        {type === 'companies'
          ? 'Meet teams building what’s next.'
          : 'Career growth, made practical.'}
      </h1>
      <p>{type === 'companies' ? 'Employer profiles will appear once they are created and published by the platform team.' : 'Career resources are being prepared.'}</p>
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
          <span className="brand-mark">N</span>Eyros
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
        © 2026 Eyros <span>Privacy</span>
        <span>Terms</span>
      </small>
    </footer>
  );
}
export default App;
