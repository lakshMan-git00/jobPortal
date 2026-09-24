import { AdminUsers } from '../features/EmployerPages';
import { useEffect, useState } from 'react';
import {
  createCompany,
  createEmployer,
  getCompanies,
  getEmployers,
  updateEmployer,
  removeEmployer,
} from '../services/api';
import type { Company, Employer } from '../types';
import { Button, EmptyState } from '../components/common/Ui';

export function AdminAccessPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Employer | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [companyName, setCompanyName] = useState('');
  const [employer, setEmployer] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    company_id: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const load = () =>
    Promise.all([getCompanies(), getEmployers()])
      .then(([nextCompanies, nextEmployers]) => {
        setCompanies(nextCompanies);
        setEmployers(nextEmployers);
      })
      .catch((loadError) =>
        setError(loadError instanceof Error ? loadError.message : 'Unable to load companies.'),
      )
      .finally(() => setLoading(false));

  useEffect(() => {
    void load();
  }, []);

  const addCompany = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await createCompany({ name: companyName });
      setCompanyName('');
      setMessage('Company created. You can now assign an employer account.');
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create company.');
    } finally {
      setBusy(false);
    }
  };
  const addEmployer = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      await createEmployer({ ...employer, company_id: Number(employer.company_id) });
      setEmployer({ name: '', email: '', password: '', password_confirmation: '', company_id: '' });
      setMessage(
        'Employer account created. They can sign in with the email and password you assigned.',
      );
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create employer.');
    } finally {
      setBusy(false);
    }
  };
  const manage = async (account: Employer, action: 'status' | 'remove') => {
    const prompt =
      action === 'remove'
        ? `Remove ${account.name} (${account.email})? Sign-in access will end. Jobs and applications will be retained. This email will remain reserved.`
        : `Suspend ${account.name}? They will be signed out and unable to sign in until reactivated.`;
    if ((action === 'remove' || account.is_active) && !window.confirm(prompt)) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (action === 'remove') await removeEmployer(account.id);
      else await updateEmployer(account.id, { is_active: !account.is_active });
      setMessage(
        action === 'remove'
          ? 'Employer account removed.'
          : account.is_active
            ? 'Employer suspended.'
            : 'Employer activated. They can sign in again.',
      );
      await load();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to update account.');
    } finally {
      setBusy(false);
    }
  };
  const filtered = employers.filter(
    (account) =>
      `${account.name} ${account.email} ${account.company ?? ''}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (status === 'all' || (status === 'active') === account.is_active),
  );
  return (
    <main className="dashboard-content">
      <div className="dashboard-title">
        <div>
          <h1>Companies & employer access</h1>
          <p>
            Create the company first, then issue employer accounts that are allowed to post jobs.
          </p>
        </div>
      </div>
      <AdminUsers />
      {error && (
        <div role="alert">
          <p className="auth-error">{error}</p>
          <button
            className="text-link"
            onClick={() => {
              setError('');
              void load();
            }}
          >
            Reload accounts
          </button>
        </div>
      )}
      {message && (
        <p className="success-message" role="status">
          {message}
        </p>
      )}
      <div className="dashboard-grid">
        <section className="panel">
          <h2>Create company</h2>
          <form className="auth-form" onSubmit={(event) => void addCompany(event)}>
            <input
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Company name"
              aria-label="Company name"
              required
            />
            <Button type="submit" disabled={busy || loading}>
              Create company
            </Button>
          </form>
        </section>
        <section className="panel">
          <h2>Create employer account</h2>
          <form className="auth-form" onSubmit={(event) => void addEmployer(event)}>
            <input
              value={employer.name}
              onChange={(event) => setEmployer({ ...employer, name: event.target.value })}
              placeholder="Employer name"
              aria-label="Employer name"
              required
            />
            <input
              value={employer.email}
              onChange={(event) => setEmployer({ ...employer, email: event.target.value })}
              placeholder="Employer email"
              aria-label="Employer email"
              type="email"
              required
            />
            <select
              aria-label="Assign a company"
              value={employer.company_id}
              onChange={(event) => setEmployer({ ...employer, company_id: event.target.value })}
              required
            >
              <option value="">Assign a company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <input
              value={employer.password}
              onChange={(event) => setEmployer({ ...employer, password: event.target.value })}
              placeholder="Temporary password (12+ chars)"
              aria-label="Employer password"
              autoComplete="new-password"
              type="password"
              minLength={12}
              required
            />
            <input
              value={employer.password_confirmation}
              onChange={(event) =>
                setEmployer({ ...employer, password_confirmation: event.target.value })
              }
              placeholder="Confirm temporary password"
              aria-label="Confirm employer password"
              autoComplete="new-password"
              type="password"
              minLength={12}
              required
            />
            <small>
              Use at least 12 characters with uppercase, lowercase, and a number. Share these
              credentials securely with the employer.
            </small>
            <Button type="submit" disabled={!companies.length || busy || loading}>
              Create employer
            </Button>
          </form>
        </section>
      </div>
      <section className="panel account-panel" aria-busy={loading || busy}>
        <h2>Employer accounts</h2>
        <div className="auth-form account-filters">
          <input
            aria-label="Search employer accounts"
            placeholder="Search name, email, or company"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            aria-label="Filter account status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        {loading ? (
          <p role="status">Loading accounts…</p>
        ) : filtered.length ? (
          <div className="table">
            {filtered.map((account) => (
              <div className="account-row" key={account.id}>
                <div>
                  <b>{account.name}</b>
                  <small>{account.email}</small>
                </div>
                <div>
                  <span>{account.company ?? 'No company assigned'}</span>
                  <small>{account.is_active ? 'Active' : 'Suspended'}</small>
                </div>
                <div className="account-actions">
                  <Button disabled={busy} onClick={() => setEditing(account)}>
                    Edit / reset password
                  </Button>
                  <Button disabled={busy} onClick={() => void manage(account, 'status')}>
                    {account.is_active ? 'Suspend' : 'Activate'}
                  </Button>
                  <Button
                    className="button-danger"
                    disabled={busy}
                    onClick={() => void manage(account, 'remove')}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title={employers.length ? 'No matching accounts' : 'No employer accounts yet'}
            text="Create an employer above or adjust your filters."
          />
        )}
      </section>
      {editing && (
        <EmployerEditor
          key={editing.id}
          account={editing}
          companies={companies}
          onCancel={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            setMessage(
              'Employer account updated. Credential or company changes require a new sign-in.',
            );
            await load();
          }}
        />
      )}
      <section className="panel">
        <h2>Companies</h2>
        {companies.length ? (
          <div className="table">
            {companies.map((company) => (
              <div className="account-row" key={company.id}>
                <b>{company.name}</b>
                <small>Company ID: {company.id}</small>
                <span>{company.employers_count ?? 0} employer account(s)</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No companies yet"
            text="Create the first company above. Nothing is pre-populated."
          />
        )}
      </section>
    </main>
  );
}

function EmployerEditor({
  account,
  companies,
  onCancel,
  onSaved,
}: {
  account: Employer;
  companies: Company[];
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: account.name,
    email: account.email,
    company_id: String(account.company_id ?? ''),
    password: '',
    password_confirmation: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateEmployer(account.id, {
        name: form.name,
        email: form.email,
        company_id: Number(form.company_id),
        ...(form.password
          ? { password: form.password, password_confirmation: form.password_confirmation }
          : {}),
      });
      await onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save account.');
    } finally {
      setSaving(false);
    }
  };
  return (
    <section className="panel account-panel" aria-labelledby="edit-employer-heading">
      <h2 id="edit-employer-heading">Edit {account.name}</h2>
      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <label>
          Name
          <input
            autoFocus
            required
            maxLength={120}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label>
          Email
          <input
            type="email"
            required
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </label>
        <label>
          Company
          <select
            required
            value={form.company_id}
            onChange={(event) => setForm({ ...form, company_id: event.target.value })}
          >
            <option value="">Assign a company</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          New password (optional)
          <input
            type="password"
            autoComplete="new-password"
            minLength={12}
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
        </label>
        <small>
          Leave blank to keep the current password. New passwords need 12 characters, uppercase,
          lowercase, and a number.
        </small>
        <label>
          Confirm new password
          <input
            type="password"
            autoComplete="new-password"
            required={!!form.password}
            value={form.password_confirmation}
            onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })}
          />
        </label>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="button" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
      </form>
    </section>
  );
}
