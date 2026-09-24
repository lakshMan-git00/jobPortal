import { Navigate } from 'react-router-dom';
import type { Role } from '../types';
import DashboardPage from '../pages/DashboardPages';
import { AdminAccessPage } from '../pages/ManagementPages';
import { ProfilePage, ResumesPage, SavedJobsPage, SettingsPage } from './CandidatePages';
import {
  ApplicationPage,
  ApplicationsPage,
  InterviewsPage,
  NotificationsPage,
} from './ApplicationPages';
import { CompanyEditor, JobEditor, ManagedJobs } from './EmployerPages';
export default function WorkspaceRoutes({
  role,
  path,
}: {
  role: Exclude<Role, 'guest'>;
  path: string;
}) {
  const suffix = path.replace(`/${role}/`, '');
  if (suffix === 'notifications') return <NotificationsPage />;
  if (suffix === 'settings') return <SettingsPage />;
  if (suffix === 'profile') return <ProfilePage />;
  if (suffix === 'applications' || suffix === 'candidates' || suffix === 'messages')
    return <ApplicationsPage role={role} />;
  if (/^applications\/\d+$/.test(suffix))
    return <ApplicationPage role={role} id={Number(suffix.split('/')[1])} />;
  if (suffix === 'interviews') return <InterviewsPage role={role} />;
  if (role === 'candidate') {
    if (suffix === 'resumes') return <ResumesPage />;
    if (suffix === 'saved-jobs') return <SavedJobsPage />;
  }
  if (role === 'employer') {
    if (suffix === 'jobs') return <ManagedJobs />;
    if (suffix === 'jobs/create') return <JobEditor />;
    if (/^jobs\/\d+\/edit$/.test(suffix)) return <JobEditor id={Number(suffix.split('/')[1])} />;
    if (/^jobs\/\d+\/applications$/.test(suffix))
      return <ApplicationsPage role={role} jobId={Number(suffix.split('/')[1])} />;
    if (suffix === 'company') return <CompanyEditor />;
    if (suffix === 'analytics') return <DashboardPage role={role} analytics />;
  }
  if (role === 'admin') {
    if (['users', 'companies', 'employers'].includes(suffix)) return <AdminAccessPage />;
    if (suffix === 'jobs') return <ManagedJobs admin />;
    if (suffix === 'reports') return <DashboardPage role={role} analytics />;
  }
  return <Navigate to={`/${role}/dashboard`} replace />;
}
