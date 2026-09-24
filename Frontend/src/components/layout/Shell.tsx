import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useUi } from '../../services/ui';
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
  const [open, setOpen] = useState(false);
  return (
    <header className="topbar">
      <Brand />
      <button
        className="mobile-menu"
        aria-expanded={open}
        aria-controls="public-navigation"
        aria-label="Toggle navigation"
        onClick={() => setOpen(!open)}
      >
        <Icon name="menu" />
      </button>
      <nav
        id="public-navigation"
        className={open ? 'public-nav-open' : ''}
        onClick={() => setOpen(false)}
      >
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
  ['bookmark', 'Saved jobs', '/candidate/saved-jobs'],
  ['users', 'My profile', '/candidate/profile'],
  ['file', 'Resumes', '/candidate/resumes'],
  ['clock', 'Interviews', '/candidate/interviews'],
  ['bell', 'Notifications', '/candidate/notifications'],
  ['settings', 'Settings', '/candidate/settings'],
] as const;
const employer = [
  ['home', 'Overview', '/employer/dashboard'],
  ['briefcase', 'Jobs', '/employer/jobs'],
  ['users', 'Candidates', '/employer/candidates'],
  ['clock', 'Interviews', '/employer/interviews'],
  ['briefcase', 'Company', '/employer/company'],
  ['bell', 'Notifications', '/employer/notifications'],
  ['chart', 'Analytics', '/employer/analytics'],
  ['settings', 'Settings', '/employer/settings'],
] as const;
const admin = [
  ['home', 'Dashboard', '/admin/dashboard'],
  ['users', 'Users', '/admin/users'],
  ['briefcase', 'Job moderation', '/admin/jobs'],
  ['file', 'Applications', '/admin/applications'],
  ['clock', 'Interviews', '/admin/interviews'],
  ['chart', 'Reports', '/admin/reports'],
  ['settings', 'Settings', '/admin/settings'],
] as const;
export function DashboardLayout({
  role,
  path,
  user,
  onSignOut,
  children,
}: {
  role: Exclude<Role, 'guest'>;
  path: string;
  user: AuthUser;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const entries = role === 'candidate' ? candidate : role === 'employer' ? employer : admin;
  const { menuOpen, setMenuOpen } = useUi();
  return (
    <div className="dashboard">
      {menuOpen && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside id="workspace-navigation" className={menuOpen ? 'navigation-open' : ''}>
        <Brand />
        <button
          className="mobile-menu close-nav"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        >
          <Icon name="close" />
        </button>
        <span className="workspace-label">{role} workspace</span>
        <div className="side-links">
          {entries.map(([icon, label, href]) => (
            <Link
              className={path === href ? 'active' : ''}
              key={href}
              to={href}
              onClick={() => setMenuOpen(false)}
              aria-current={path === href ? 'page' : undefined}
            >
              <Icon name={icon} size={18} />
              {label}
            </Link>
          ))}
        </div>
        <div className="sidebar-user">
          <span className="avatar">{role[0].toUpperCase()}</span>
          <div>
            <b>{user.name}</b>
            <small>{user.email}</small>
            <button className="text-link" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-header">
          <button
            className="mobile-menu"
            aria-label="Open navigation"
            aria-expanded={menuOpen}
            aria-controls="workspace-navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name="menu" />
          </button>
          <div>
            <span className="workspace-breadcrumb">Eyros / {role}</span>
          </div>
          <button
            className="icon-button"
            aria-label="Notifications"
            onClick={() => navigate(`/${role}/notifications`)}
          >
            <Icon name="bell" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
