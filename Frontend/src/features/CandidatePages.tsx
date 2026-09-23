import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Job, Page, Profile, Resume } from '../types';
import { apiSend, downloadResume } from '../services/client';
import { useAction, useData, useWrite } from './hooks';
import { date, ErrorText, PageHeader, Pagination, QueryState, Status } from './shared';
import { Button, EmptyState } from '../components/common/Ui';
import { useUi } from '../services/ui';

export function ProfilePage() {
  const query = useData<{ data: Profile }>('/api/workspace/profile');
  return (
    <main className="dashboard-content">
      <PageHeader
        title="Tell your story."
        description="Help employers understand what you bring to their team."
      />
      <QueryState query={query}>{({ data }) => <ProfileForm profile={data} />}</QueryState>
    </main>
  );
}
function ProfileForm({ profile }: { profile: Profile }) {
  const [form, setForm] = useState(profile);
  const save = useWrite('/api/workspace/profile', 'PUT', 'Your profile has been updated.');
  const fields = [
    'name',
    'headline',
    'location',
    'phone',
    'summary',
    'experience',
    'education',
    'projects',
    'certifications',
    'languages',
    'portfolio',
    'linkedin',
  ] as const;
  const complete = Math.round(
    (fields.filter((key) => form[key]?.trim()).length / fields.length) * 100,
  );
  return (
    <>
      <section className="panel">
        <div className="section-heading">
          <h2>Profile completion</h2>
          <strong>{complete}%</strong>
        </div>
        <progress max="100" value={complete} aria-label="Profile completion" />
      </section>
      <form
        className="panel form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(form);
        }}
      >
        {fields.map((field) => (
          <label
            className={
              ['summary', 'experience', 'education', 'projects', 'certifications'].includes(field)
                ? 'full-width'
                : ''
            }
            key={field}
          >
            {field === 'linkedin' ? 'LinkedIn URL' : field.charAt(0).toUpperCase() + field.slice(1)}
            {['summary', 'experience', 'education', 'projects', 'certifications'].includes(
              field,
            ) ? (
              <textarea
                rows={4}
                value={form[field] ?? ''}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                maxLength={field === 'education' || field === 'experience' ? 10000 : 5000}
              />
            ) : (
              <input
                required={field === 'name'}
                type={['portfolio', 'linkedin'].includes(field) ? 'url' : 'text'}
                value={form[field] ?? ''}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              />
            )}
          </label>
        ))}
        <label className="full-width">
          Skills (comma separated)
          <input
            value={(form.skills ?? []).join(',')}
            onChange={(e) => setForm({ ...form, skills: e.target.value.split(',') })}
          />
        </label>
        <div className="full-width">
          <ErrorText error={save.error} />
          <Button disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save profile'}</Button>
        </div>
      </form>
    </>
  );
}
export function ResumesPage() {
  const query = useData<{ data: Resume[] }>('/api/candidate/resumes');
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const notify = useUi((state) => state.notify);
  const upload = useAction(async () => {
    if (!file) return;
    const data = new FormData();
    data.append('file', file);
    await apiSend('/api/candidate/resumes', 'POST', data);
    setFile(null);
    if (ref.current) ref.current.value = '';
  }, 'Resume uploaded.');
  const action = useAction(({ id, method, data }: { id: number; method: string; data?: unknown }) =>
    apiSend(`/api/candidate/resumes/${id}`, method, data),
  );
  const choose = (selected?: File) => {
    setValidation('');
    setFile(null);
    if (!selected) return;
    if (selected.size > 10 * 1024 * 1024 || !/\.(pdf|doc|docx)$/i.test(selected.name)) {
      setValidation('Choose a PDF, DOC, or DOCX file up to 10 MB.');
      return;
    }
    setFile(selected);
  };
  return (
    <main className="dashboard-content">
      <PageHeader
        title="Your experience, on paper."
        description="Keep up to 10 resumes. Submitted versions are retained with your applications."
      />
      <section
        className="panel upload-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          choose(e.dataTransfer.files[0]);
        }}
      >
        <h2>Drop your resume here</h2>
        <p>PDF, DOC, or DOCX · Maximum 10 MB</p>
        <label>
          Choose a resume
          <input
            ref={ref}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => choose(e.target.files?.[0])}
          />
        </label>
        {file && <p>{file.name}</p>}
        {validation && (
          <p className="auth-error" role="alert">
            {validation}
          </p>
        )}
        <ErrorText error={upload.error} />
        <Button disabled={!file || upload.isPending} onClick={() => upload.mutate(undefined)}>
          {upload.isPending ? 'Uploading…' : 'Upload resume'}
        </Button>
      </section>
      <ErrorText error={action.error} />
      <QueryState query={query}>
        {({ data }) => (
          <section className="panel">
            {data.length ? (
              data.map((resume) => (
                <div className="record-row" key={resume.id}>
                  <div>
                    <strong>{resume.name}</strong>
                    <small>
                      {Math.ceil(resume.size / 1024)} KB · {date(resume.created_at)}
                    </small>
                    {resume.is_default && <Status value="default" />}
                  </div>
                  <div className="actions">
                    <Button
                      className="outline-button"
                      onClick={() =>
                        void downloadResume(resume.id, resume.name).catch((e) => notify(e.message))
                      }
                    >
                      Download
                    </Button>
                    <Button
                      className="outline-button"
                      disabled={action.isPending}
                      onClick={() => {
                        const name = window.prompt('Resume name', resume.name);
                        if (name?.trim())
                          action.mutate({ id: resume.id, method: 'PATCH', data: { name } });
                      }}
                    >
                      Rename
                    </Button>
                    {!resume.is_default && (
                      <Button
                        className="outline-button"
                        disabled={action.isPending}
                        onClick={() =>
                          action.mutate({
                            id: resume.id,
                            method: 'PATCH',
                            data: { is_default: true },
                          })
                        }
                      >
                        Set default
                      </Button>
                    )}
                    <Button
                      className="danger-button"
                      disabled={action.isPending}
                      onClick={() => {
                        if (window.confirm(`Delete “${resume.name}”?`))
                          action.mutate({ id: resume.id, method: 'DELETE' });
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="Your first resume belongs here"
                text="Upload a resume to attach it when you apply."
              />
            )}
          </section>
        )}
      </QueryState>
    </main>
  );
}
export function SavedJobsPage() {
  const [page, setPage] = useState(1);
  const query = useData<Page<Job>>(`/api/candidate/saved-jobs?page=${page}`);
  const remove = useAction(
    (id: number) => apiSend(`/api/candidate/saved-jobs/${id}`, 'DELETE'),
    'Job removed from saved jobs.',
  );
  return (
    <main className="dashboard-content">
      <PageHeader
        title="Worth coming back to."
        description="Your saved opportunities, all in one place."
      />
      <ErrorText error={remove.error} />
      <QueryState query={query}>
        {(data) => (
          <>
            <section className="panel">
              {data.data.length ? (
                data.data.map((job) => (
                  <div className="record-row" key={job.id}>
                    <div>
                      <strong>{job.title}</strong>
                      <small>
                        {job.company} · {job.location}
                      </small>
                      <Status value={job.status} />
                    </div>
                    <div className="actions">
                      {job.status === 'published' && (
                        <Link className="button" to={`/jobs/${job.slug}`}>
                          View & apply
                        </Link>
                      )}
                      <Button
                        className="outline-button"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(job.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No saved jobs yet"
                  text="Save roles you like while browsing."
                  action={
                    <Link className="button" to="/jobs">
                      Explore jobs
                    </Link>
                  }
                />
              )}
            </section>
            <Pagination page={data} onChange={setPage} />
          </>
        )}
      </QueryState>
    </main>
  );
}
export function SettingsPage() {
  const save = useAction(async (data: unknown) => {
    await apiSend('/api/workspace/password', 'PUT', data);
    window.dispatchEvent(new Event('auth-expired'));
  }, 'Password changed. Sign in with your new password.');
  return (
    <main className="dashboard-content">
      <PageHeader
        title="Account settings"
        description="Keep your account secure and your information up to date."
      />
      <section className="panel">
        <h2>Change password</h2>
        <p>Use at least 12 characters with uppercase, lowercase, and a number.</p>
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(Object.fromEntries(new FormData(e.currentTarget)));
          }}
        >
          {['current_password', 'password', 'password_confirmation'].map((name, index) => (
            <label key={name}>
              {['Current password', 'New password', 'Confirm new password'][index]}
              <input
                type="password"
                name={name}
                required
                minLength={index ? 12 : undefined}
                autoComplete={index ? 'new-password' : 'current-password'}
              />
            </label>
          ))}
          <ErrorText error={save.error} />
          <Button disabled={save.isPending}>
            {save.isPending ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </section>
    </main>
  );
}
