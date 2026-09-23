import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Application, Interview, Notification, Page, Role } from '../types';
import { apiSend, downloadResume } from '../services/client';
import { useAction, useData, useDebounce, useWrite } from './hooks';
import { date, ErrorText, Modal, PageHeader, Pagination, QueryState, Status } from './shared';
import { Button, EmptyState } from '../components/common/Ui';
import { useUi } from '../services/ui';

const stages = [
  'submitted',
  'reviewing',
  'shortlisted',
  'interview',
  'offer',
  'hired',
  'rejected',
  'withdrawn',
];
const transitions: Record<string, string[]> = {
  submitted: ['reviewing', 'shortlisted', 'rejected'],
  reviewing: ['shortlisted', 'rejected'],
  shortlisted: ['interview', 'offer', 'rejected'],
  interview: ['offer', 'rejected'],
  offer: ['hired', 'rejected'],
};
export function ApplicationsPage({
  role,
  jobId,
}: {
  role: Exclude<Role, 'guest'>;
  jobId?: number;
}) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const search = useDebounce(keyword);
  const query = useData<Page<Application>>(
    `/api/workspace/applications?${new URLSearchParams({ page: String(page), status, keyword: search, ...(jobId ? { job_id: String(jobId) } : {}) })}`,
  );
  return (
    <main className="dashboard-content">
      <PageHeader
        title={role === 'candidate' ? 'Every application. One place.' : 'Meet your next hire.'}
        description={
          role === 'candidate'
            ? 'Track your progress, messages, and next steps.'
            : 'Review applications and move promising candidates forward.'
        }
      />
      <div className="toolbar">
        <label>
          Application stage
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All stages</option>
            {stages.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        {role !== 'candidate' && (
          <label>
            Find a candidate
            <input
              type="search"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name"
            />
          </label>
        )}
      </div>
      <QueryState query={query}>
        {(data) => (
          <>
            <section className="panel">
              {data.data.length ? (
                data.data.map((app) => (
                  <Link className="record-row" key={app.id} to={`/${role}/applications/${app.id}`}>
                    <div className="initial-avatar">
                      {(role === 'candidate' ? app.job.company.name : app.candidate.name)
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="record-copy">
                      <strong>{role === 'candidate' ? app.job.title : app.candidate.name}</strong>
                      <small>
                        {role === 'candidate' ? app.job.company.name : app.job.title} ·{' '}
                        {date(app.created_at)}
                      </small>
                    </div>
                    <Status value={app.status} />
                    <span aria-hidden="true">→</span>
                  </Link>
                ))
              ) : (
                <EmptyState
                  title="No applications found"
                  text="Try a different filter or check back when applications arrive."
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
export function ApplicationPage({ id, role }: { id: number; role: Exclude<Role, 'guest'> }) {
  const query = useData<{ data: Application }>(`/api/workspace/applications/${id}`);
  const update = useWrite(
    `/api/workspace/applications/${id}/status`,
    'PATCH',
    'Application status updated.',
  );
  const [scheduling, setScheduling] = useState(false);
  const notify = useUi((state) => state.notify);
  return (
    <main className="dashboard-content">
      <Link className="back-link" to={`/${role}/applications`}>
        ← All applications
      </Link>
      <QueryState query={query}>
        {({ data: app }) => (
          <>
            <PageHeader
              title={app.job.title}
              description={`${app.candidate.name} · ${app.job.company.name}`}
            >
              <Status value={app.status} />
            </PageHeader>
            <ErrorText error={update.error} />
            <section className="panel">
              <div className="actions">
                {role === 'employer' &&
                  (transitions[app.status] ?? []).map((status) => (
                    <Button
                      key={status}
                      className={status === 'rejected' ? 'danger-button' : 'outline-button'}
                      disabled={update.isPending}
                      onClick={() => {
                        if (
                          status !== 'rejected' ||
                          window.confirm('Reject this application? The candidate will be notified.')
                        )
                          update.mutate({ status });
                      }}
                    >
                      Move to {status}
                    </Button>
                  ))}
                {role === 'candidate' &&
                  !['hired', 'rejected', 'withdrawn'].includes(app.status) && (
                    <Button
                      className="danger-button"
                      disabled={update.isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            'Withdraw this application? You will not be able to reapply for this job.',
                          )
                        )
                          update.mutate({ status: 'withdrawn' });
                      }}
                    >
                      Withdraw application
                    </Button>
                  )}
                {role === 'employer' && ['shortlisted', 'interview'].includes(app.status) && (
                  <Button onClick={() => setScheduling(true)}>Schedule interview</Button>
                )}
                {app.resume && (
                  <Button
                    className="outline-button"
                    onClick={() =>
                      void downloadResume(app.resume!.id, app.resume!.name).catch((e) =>
                        notify(e.message),
                      )
                    }
                  >
                    Download resume
                  </Button>
                )}
              </div>
            </section>
            <div className="dashboard-grid">
              <section className="panel">
                <h2>Application story</h2>
                <ol className="timeline">
                  {(app.history?.length
                    ? app.history
                    : [{ status: 'submitted', at: app.created_at }]
                  ).map((event, index) => (
                    <li key={index}>
                      <Status value={event.status} />
                      <small>{date(event.at)}</small>
                    </li>
                  ))}
                </ol>
                <h3>Cover letter</h3>
                <p className="pre-wrap">{app.cover_letter || 'No cover letter included.'}</p>
                {app.answers?.map((answer, index) => (
                  <div key={index}>
                    <h3>{app.questions?.[index] ?? `Screening answer ${index + 1}`}</h3>
                    <p className="pre-wrap">{answer}</p>
                  </div>
                ))}
              </section>
              <section className="panel">
                <h2>Candidate profile</h2>
                <h3>{app.candidate.name}</h3>
                <p>{app.candidate.profile?.headline}</p>
                <p>{app.candidate.email}</p>
                {[
                  'summary',
                  'experience',
                  'education',
                  'projects',
                  'certifications',
                  'languages',
                ].map((field) => {
                  const text =
                    app.candidate.profile?.[
                      field as keyof NonNullable<typeof app.candidate.profile>
                    ];
                  return text ? (
                    <div key={field}>
                      <h3 className="capitalize">{field}</h3>
                      <p className="pre-wrap">{String(text)}</p>
                    </div>
                  ) : null;
                })}
                <div className="tags">
                  {app.candidate.profile?.skills?.map((skill) => (
                    <span className="badge" key={skill}>
                      {skill}
                    </span>
                  ))}
                </div>
                {app.interviews?.map((interview) => (
                  <div className="record-row" key={interview.id}>
                    <div>
                      <strong>{date(interview.starts_at)}</strong>
                      <small>{interview.location}</small>
                    </div>
                    <Status value={interview.status} />
                  </div>
                ))}
              </section>
            </div>
            <Messages id={id} canSend={role !== 'admin'} />
            {scheduling && (
              <InterviewForm applicationId={id} onClose={() => setScheduling(false)} />
            )}
          </>
        )}
      </QueryState>
    </main>
  );
}
function Messages({ id, canSend }: { id: number; canSend: boolean }) {
  const [page, setPage] = useState(1);
  const [body, setBody] = useState('');
  const query = useData<
    Page<{
      id: number;
      sender_name: string;
      body: string;
      created_at: string;
      read_at: string | null;
    }>
  >(`/api/workspace/applications/${id}/messages?page=${page}`, true, true);
  const send = useAction(async () => {
    await apiSend(`/api/workspace/applications/${id}/messages`, 'POST', { body });
    setBody('');
    setPage(1);
  }, 'Message sent.');
  return (
    <section className="panel">
      <h2>Conversation</h2>
      <p className="muted">
        Discuss this application with the hiring team. Updates refresh automatically.
      </p>
      <QueryState query={query}>
        {(data) => (
          <>
            <div className="message-list">
              {[...data.data].reverse().map((message) => (
                <article key={message.id} className="message">
                  <div>
                    <strong>{message.sender_name}</strong>
                    <small>
                      {date(message.created_at)}
                      {message.read_at ? ' · Read' : ''}
                    </small>
                  </div>
                  <p>{message.body}</p>
                </article>
              ))}
              {!data.data.length && <p className="muted">No messages yet.</p>}
            </div>
            <Pagination page={data} onChange={setPage} />
          </>
        )}
      </QueryState>
      {canSend && (
        <form
          className="auth-form"
          onSubmit={(e) => {
            e.preventDefault();
            send.mutate(undefined);
          }}
        >
          <label>
            Your message
            <textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={5000}
              required
            />
          </label>
          <ErrorText error={send.error} />
          <Button disabled={send.isPending || !body.trim()}>
            {send.isPending ? 'Sending…' : 'Send message'}
          </Button>
        </form>
      )}
    </section>
  );
}
function InterviewForm({
  applicationId,
  interview,
  onClose,
}: {
  applicationId: number;
  interview?: Interview;
  onClose: () => void;
}) {
  const action = useAction(
    async (input: unknown) => {
      await apiSend(
        interview ? `/api/employer/interviews/${interview.id}` : '/api/employer/interviews',
        interview ? 'PATCH' : 'POST',
        input,
      );
      onClose();
    },
    interview ? 'Interview rescheduled.' : 'Interview scheduled.',
  );
  const localDate = interview
    ? new Date(new Date(interview.starts_at).getTime() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : '';
  return (
    <Modal title={interview ? 'Reschedule interview' : 'Schedule interview'} onClose={onClose}>
      <form
        className="auth-form"
        onSubmit={(e) => {
          e.preventDefault();
          const data = Object.fromEntries(new FormData(e.currentTarget));
          action.mutate({
            ...data,
            job_application_id: applicationId,
            starts_at: new Date(String(data.starts_at)).toISOString(),
            duration_minutes: Number(data.duration_minutes),
          });
        }}
      >
        <label>
          Date & time (your local timezone)
          <input type="datetime-local" name="starts_at" required defaultValue={localDate} />
        </label>
        <label>
          Duration (minutes)
          <input
            type="number"
            name="duration_minutes"
            min={15}
            max={240}
            required
            defaultValue={interview?.duration_minutes ?? 30}
          />
        </label>
        <label>
          Meeting URL or location
          <input name="location" required maxLength={255} defaultValue={interview?.location} />
        </label>
        <label>
          Notes for the candidate
          <textarea name="notes" rows={3} maxLength={2000} defaultValue={interview?.notes} />
        </label>
        <ErrorText error={action.error} />
        <Button disabled={action.isPending}>
          {action.isPending ? 'Saving…' : 'Confirm interview'}
        </Button>
      </form>
    </Modal>
  );
}
export function InterviewsPage({ role }: { role: Exclude<Role, 'guest'> }) {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Interview>();
  const query = useData<Page<Interview>>(`/api/workspace/interviews?page=${page}`);
  const cancel = useAction(
    (id: number) => apiSend(`/api/employer/interviews/${id}`, 'PATCH', { status: 'cancelled' }),
    'Interview cancelled.',
  );
  return (
    <main className="dashboard-content">
      <PageHeader
        title="Good conversations start here."
        description="Upcoming and past interviews. All times are shown in your local timezone."
      />
      <ErrorText error={cancel.error} />
      <QueryState query={query}>
        {(data) => (
          <>
            <section className="panel">
              {data.data.length ? (
                data.data.map((interview) => (
                  <article className="interview-card" key={interview.id}>
                    <div>
                      <Status value={interview.status} />
                      <h2>{interview.application.job.title}</h2>
                      <p>
                        {interview.application.candidate.name} ·{' '}
                        {interview.application.job.company.name}
                      </p>
                      <strong>
                        {date(interview.starts_at)} · {interview.duration_minutes} minutes
                      </strong>
                      <p>
                        {/^https?:\/\//.test(interview.location) ? (
                          <a href={interview.location} target="_blank" rel="noopener noreferrer">
                            Open meeting →
                          </a>
                        ) : (
                          interview.location
                        )}
                      </p>
                      {interview.notes && <p className="pre-wrap">{interview.notes}</p>}
                    </div>
                    <div className="actions">
                      <Link
                        className="button outline-button"
                        to={`/${role}/applications/${interview.job_application_id}`}
                      >
                        Application
                      </Link>
                      {role === 'employer' && interview.status === 'scheduled' && (
                        <>
                          <Button className="outline-button" onClick={() => setEditing(interview)}>
                            Reschedule
                          </Button>
                          <Button
                            className="danger-button"
                            disabled={cancel.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  'Cancel this interview? The candidate will be notified.',
                                )
                              )
                                cancel.mutate(interview.id);
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState
                  title="No interviews yet"
                  text={
                    role === 'employer'
                      ? 'Open a shortlisted application to schedule an interview.'
                      : 'Your interviews will appear here when scheduled.'
                  }
                />
              )}
            </section>
            <Pagination page={data} onChange={setPage} />
          </>
        )}
      </QueryState>
      {editing && (
        <InterviewForm
          applicationId={editing.job_application_id}
          interview={editing}
          onClose={() => setEditing(undefined)}
        />
      )}
    </main>
  );
}
export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const query = useData<Page<Notification>>(
    `/api/workspace/notifications?page=${page}`,
    true,
    true,
  );
  const mark = useWrite('/api/workspace/notifications', 'PATCH', 'Notifications marked as read.');
  const remove = useAction(
    (id: number) => apiSend(`/api/workspace/notifications/${id}`, 'DELETE'),
    'Notification removed.',
  );
  return (
    <main className="dashboard-content">
      <PageHeader
        title="You’re in the loop."
        description="Application updates, interview invitations, and new messages."
      >
        <Button disabled={mark.isPending} onClick={() => mark.mutate({})}>
          Mark all read
        </Button>
      </PageHeader>
      <ErrorText error={mark.error || remove.error} />
      <QueryState query={query}>
        {(data) => (
          <>
            <section className="panel">
              {data.data.length ? (
                data.data.map((note) => (
                  <article className={`record-row ${note.read_at ? '' : 'unread'}`} key={note.id}>
                    <div className="record-copy">
                      <Link to={note.href} onClick={() => mark.mutate({ id: note.id })}>
                        <strong>{note.title}</strong>
                      </Link>
                      <small>
                        {date(note.created_at)}
                        {!note.read_at && ' · Unread'}
                      </small>
                    </div>
                    <div className="actions">
                      {!note.read_at && (
                        <Button
                          className="outline-button"
                          disabled={mark.isPending}
                          onClick={() => mark.mutate({ id: note.id })}
                        >
                          Mark read
                        </Button>
                      )}
                      <Button
                        className="outline-button"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(note.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState title="All quiet for now" text="We’ll keep your updates here." />
              )}
            </section>
            <Pagination page={data} onChange={setPage} />
          </>
        )}
      </QueryState>
    </main>
  );
}
