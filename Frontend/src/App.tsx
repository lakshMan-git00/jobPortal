import { lazy, Suspense, useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { currentUser, signOut } from './services/api';
import { queryClient } from './services/query';
import { useUi } from './services/ui';
import { DashboardLayout, PublicHeader } from './components/layout/Shell';
import { destinationAfterLogin, navigate } from './routes/navigation';
import type { AuthUser, Role } from './types';
import { Button } from './components/common/Ui';
import { ErrorBoundary } from './features/shared';
import './App.css';
import './features/workspace.css';

const HomePage = lazy(() => import('./pages/PublicPages').then((m) => ({ default: m.HomePage })));
const JobsPage = lazy(() =>
  import('./features/PublicDiscovery').then((m) => ({ default: m.JobsPage })),
);
const JobDetailsPage = lazy(() =>
  import('./features/PublicDiscovery').then((m) => ({ default: m.JobDetailsPage })),
);
const CompaniesPage = lazy(() =>
  import('./features/PublicDiscovery').then((m) => ({ default: m.CompaniesPage })),
);
const AuthPage = lazy(() => import('./features/AuthPages').then((m) => ({ default: m.AuthPage })));
const PasswordRecovery = lazy(() =>
  import('./features/AuthPages').then((m) => ({ default: m.PasswordRecovery })),
);
const DashboardPage = lazy(() => import('./pages/DashboardPages'));
const WorkspaceRoutes = lazy(() => import('./features/WorkspaceRoutes'));

export default function App() {
  const location = useLocation();
  const session = useQuery({
    queryKey: ['session'],
    queryFn: currentUser,
    retry: false,
    staleTime: 60000,
  });
  const user = session.data ?? null;
  const { toast, notify, setMenuOpen } = useUi();
  const role = location.pathname.match(/^\/(candidate|employer|admin)(?:\/|$)/)?.[1] as
    Exclude<Role, 'guest'> | undefined;
  useEffect(() => {
    const expire = () => {
      queryClient.clear();
      queryClient.setQueryData(['session'], null);
      notify('Your session has ended. Please sign in again.');
    };
    window.addEventListener('auth-expired', expire);
    return () => window.removeEventListener('auth-expired', expire);
  }, [notify]);
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname, setMenuOpen]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => notify(''), 5000);
    return () => clearTimeout(timer);
  }, [toast, notify]);
  const authenticated = (nextUser: AuthUser) => {
    queryClient.clear();
    queryClient.setQueryData(['session'], nextUser);
    navigate(
      destinationAfterLogin(nextUser.role, new URLSearchParams(location.search).get('next')),
    );
  };
  const logout = async () => {
    try {
      await signOut();
      queryClient.clear();
      queryClient.setQueryData(['session'], null);
      navigate('/login');
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Unable to sign out. Please retry.');
    }
  };
  const loading = (
    <main className="not-found">
      <div className="loading" role="status">
        Loading your workspace…
      </div>
    </main>
  );
  let page;
  if (role) {
    if (session.isPending) page = loading;
    else if (session.isError)
      page = (
        <main className="not-found">
          <h1>Unable to check your session.</h1>
          <p role="alert">{session.error.message}</p>
          <Button onClick={() => void session.refetch()}>Retry</Button>
        </main>
      );
    else if (!user)
      page = <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
    else if (user.role !== role || location.pathname === `/${role}`)
      page = <Navigate to={`/${user.role}/dashboard`} replace />;
    else
      page = (
        <DashboardLayout
          role={role}
          path={location.pathname}
          user={user}
          onSignOut={() => void logout()}
        >
          <Suspense fallback={loading}>
            <ErrorBoundary key={location.pathname}>
              {location.pathname === `/${role}/dashboard` ? (
                <DashboardPage role={role} />
              ) : (
                <WorkspaceRoutes role={role} path={location.pathname} />
              )}
            </ErrorBoundary>
          </Suspense>
        </DashboardLayout>
      );
  } else
    page = (
      <>
        <PublicHeader user={user} onSignOut={() => void logout()} />
        <Suspense fallback={loading}>
          <Routes>
            <Route
              path="/"
              element={<HomePage openJob={(job) => navigate(`/jobs/${job.slug}`)} />}
            />
            <Route
              path="/jobs"
              element={<JobsPage openJob={(job) => navigate(`/jobs/${job.slug}`)} />}
            />
            <Route
              path="/jobs/:slug"
              element={
                <JobDetailsPage
                  key={location.pathname}
                  slug={decodeURIComponent(location.pathname.split('/')[2])}
                  user={user}
                  notify={notify}
                />
              }
            />
            <Route path="/companies" element={<CompaniesPage />} />
            <Route
              path="/companies/:slug"
              element={
                <CompaniesPage
                  key={location.pathname}
                  slug={decodeURIComponent(location.pathname.split('/')[2])}
                />
              }
            />
            <Route
              path="/login"
              element={
                user ? (
                  <Navigate to={`/${user.role}/dashboard`} replace />
                ) : (
                  <AuthPage key="login" mode="login" onAuthenticated={authenticated} />
                )
              }
            />
            <Route
              path="/register"
              element={
                user ? (
                  <Navigate to={`/${user.role}/dashboard`} replace />
                ) : (
                  <AuthPage key="register" mode="register" onAuthenticated={authenticated} />
                )
              }
            />
            <Route path="/forgot-password" element={<PasswordRecovery reset={false} />} />
            <Route path="/reset-password" element={<PasswordRecovery reset />} />
            <Route
              path="/notifications"
              element={<Navigate to={user ? `/${user.role}/notifications` : '/login'} replace />}
            />
            <Route
              path="/messages"
              element={<Navigate to={user ? `/${user.role}/applications` : '/login'} replace />}
            />
            <Route path="/resources" element={<Resources />} />
            <Route
              path="*"
              element={
                <main className="not-found">
                  <h1>We couldn’t find that page.</h1>
                  <Link className="button" to="/">
                    Return home
                  </Link>
                </main>
              }
            />
          </Routes>
        </Suspense>
        <footer>
          <div>
            <Link className="brand" to="/">
              Eyros
            </Link>
            <p>Find work that moves you forward.</p>
          </div>
          <div>
            <h4>For candidates</h4>
            <Link to="/jobs">Browse opportunities</Link>
            <p>
              <Link to="/resources">Career resources</Link>
            </p>
          </div>
          <div>
            <h4>For companies</h4>
            <Link to="/employer/jobs">Manage jobs</Link>
            <p>
              <Link to="/companies">Company directory</Link>
            </p>
          </div>
          <div>
            <h4>Your next chapter</h4>
            <Link to="/register">Create a candidate account →</Link>
          </div>
          <small>© 2026 Eyros</small>
        </footer>
      </>
    );
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div id="main-content">{page}</div>
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          {toast}
          <button onClick={() => notify('')} aria-label="Dismiss notification">
            ×
          </button>
        </div>
      )}
    </>
  );
}
function Resources() {
  return (
    <main className="jobs-page">
      <div className="page-intro">
        <h1>Your next chapter, thoughtfully planned.</h1>
        <p>A few practical steps for a stronger application.</p>
      </div>
      <div className="company-grid">
        {[
          [
            'Make your resume specific',
            'Lead with recent, relevant experience. Describe what you accomplished, add clear outcomes, and match your skills to the role.',
          ],
          [
            'Prepare your story',
            'Explain why the opportunity interests you. Use short examples that show how you approach problems and work with others.',
          ],
          [
            'Make the interview a conversation',
            'Read about the company, prepare questions about the team and role, and check your meeting link and timezone ahead of time.',
          ],
        ].map(([title, text]) => (
          <article className="panel" key={title}>
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <Link className="button" to="/jobs">
        Find your next opportunity
      </Link>
    </main>
  );
}
