import type { ReactNode } from 'react';
import type { AuthUser, Role } from '../../types';
import { Icon } from '../common/Icon';
import { navigate } from '../../routes/navigation';

export function Brand() {
  return (
    <button className="brand" onClick={() => navigate('/')}>
      <span className="brand-mark">E</span>Eyros
    </button>
  );
}
export function PublicHeader({
  user,
  onSignOut,
}: {
  user: AuthUser | null;
  onSignOut: () => void;
}) {
  return (
    <header className="topbar">
      <Brand />
      <nav>
        <button onClick={() => navigate('/jobs')}>Find jobs</button>
        <button onClick={() => navigate('/companies')}>Companies</button>
        <button onClick={() => navigate('/resources')}>Career resources</button>
      </nav>
      <div className="header-actions">
        {!user ? (
          <>
            <button className="quiet" onClick={() => navigate('/login')}>
              Sign in
            </button>
            <button className="button compact" onClick={() => navigate('/login')}>
              Post a job <Icon name="arrow" size={15} />
            </button>
          </>
        ) : (
          <>
            <button className="quiet" onClick={() => navigate(`/${user.role}/dashboard`)}>
              {user.role === 'candidate' ? 'My dashboard' : 'Workspace'}
            </button>
            <button className="avatar" onClick={onSignOut} aria-label="Sign out">
              {user.name.slice(0, 2).toUpperCase()}
            </button>
          </>
        )}
      </div>
    </header>
  );
}
const candidate = [
  ['home', 'Dashboard', '/candidate/dashboard'],
  ['briefcase', 'Applications', '/candidate/applications'],
  ['file', 'Resumes', '/candidate/resumes'],
  ['settings', 'Settings', '/candidate/settings'],
] as const;
const employer = [
  ['home', 'Overview', '/employer/dashboard'],
  ['briefcase', 'Jobs', '/employer/jobs'],
  ['users', 'Candidates', '/employer/candidates'],
  ['chart', 'Analytics', '/employer/analytics'],
  ['settings', 'Settings', '/employer/settings'],
] as const;
const admin = [
  ['home', 'Dashboard', '/admin/dashboard'],
  ['users', 'Users', '/admin/users'],
  ['briefcase', 'Job moderation', '/admin/jobs'],
  ['chart', 'Reports', '/admin/reports'],
  ['settings', 'Settings', '/admin/settings'],
] as const;
export function DashboardLayout({
  role,
  path,
  children,
}: {
  role: Exclude<Role, 'guest'>;
  path: string;
  children: ReactNode;
}) {
  const entries = role === 'candidate' ? candidate : role === 'employer' ? employer : admin;
  return (
    <div className="dashboard">
      <aside>
        <Brand />
        <span className="workspace-label">{role} workspace</span>
        <div className="side-links">
          {entries.map(([icon, label, href]) => (
            <button
              className={path === href ? 'active' : ''}
              key={href}
              onClick={() => navigate(href)}
            >
              <Icon name={icon} size={18} />
              {label}
            </button>
          ))}
        </div>
        <div className="sidebar-user">
          <span className="avatar">{role[0].toUpperCase()}</span>
          <div>
            <b>{role} account</b>
            <small>Signed-in workspace</small>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-header">
          <button className="mobile-menu" aria-label="Open navigation">
            <Icon name="menu" />
          </button>
          <div>
            <span className="workspace-breadcrumb">Eyros / {role}</span>
          </div>
          <button className="icon-button" aria-label="Notifications">
            <Icon name="bell" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
