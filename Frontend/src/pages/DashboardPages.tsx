import type { ReactNode } from 'react';
import { Icon } from '../components/common/Icon';
import { Button, EmptyState } from '../components/common/Ui';
import { navigate } from '../routes/navigation';
import type { Role } from '../types';

export function DashboardPage({ role }: { role: Exclude<Role, 'guest'> }) {
  const config = role === 'candidate'
    ? { kicker: 'Your career workspace', title: 'Your account is ready.', copy: 'Browse live opportunities and submit applications from your account.', action: 'Browse jobs', href: '/jobs' }
    : role === 'employer'
      ? { kicker: 'Employer workspace', title: 'Ready to publish a role?', copy: 'Your administrator assigns your company before you can create job posts.', action: 'Manage jobs', href: '/employer/jobs' }
      : { kicker: 'Platform administration', title: 'Manage platform access.', copy: 'Create companies and employer accounts before job postings can be published.', action: 'Manage users', href: '/admin/users' };

  return (
    <main className="dashboard-content">
      <span className="eyebrow dark"><i />{config.kicker}</span>
      <div className="dashboard-title">
        <div><h1>{config.title}</h1><p>{config.copy}</p></div>
        <Button onClick={() => navigate(config.href)}><Icon name="arrow" size={17} />{config.action}</Button>
      </div>
      <section className="panel">
        <EmptyState title="No activity yet" text="Live activity will appear here as the platform is used." />
      </section>
    </main>
  );
}

export function ListPage({ title, description, action, children }: { title: string; description: string; action?: string; children?: ReactNode }) {
  return (
    <main className="dashboard-content">
      <div className="dashboard-title">
        <div><h1>{title}</h1><p>{description}</p></div>
        {action && <Button><Icon name="plus" size={17} />{action}</Button>}
      </div>
      {children ?? <section className="panel"><EmptyState title={`No ${title.toLowerCase()} yet`} text="When information is available, it will appear here." /></section>}
    </main>
  );
}
