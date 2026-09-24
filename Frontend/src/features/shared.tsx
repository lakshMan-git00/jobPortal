import { Component, useEffect, useRef } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Button, EmptyState } from '../components/common/Ui';
import type { Page } from '../types';

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="dashboard-title">
      <div>
        <span className="eyebrow dark">
          <i />
          YOUR NEXT CHAPTER
        </span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function QueryState<T>({
  query,
  children,
}: {
  query: UseQueryResult<T, Error>;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending)
    return (
      <div className="skeleton-stack" role="status" aria-label="Loading">
        <div />
        <div />
        <div />
        <span className="sr-only">Loading…</span>
      </div>
    );
  if (query.isError)
    return (
      <div role="alert">
        <EmptyState
          title="Unable to load this section"
          text={query.error.message}
          action={<Button onClick={() => void query.refetch()}>Try again</Button>}
        />
      </div>
    );
  return <>{children(query.data)}</>;
}
export function Pagination({
  page,
  onChange,
}: {
  page: Page<unknown>;
  onChange: (page: number) => void;
}) {
  const meta = page.meta ?? page;
  const current = meta.current_page ?? 1;
  const last = meta.last_page ?? 1;
  if (last < 2) return null;
  return (
    <nav className="pagination" aria-label="Pagination">
      <Button
        className="outline-button"
        disabled={current <= 1}
        onClick={() => onChange(current - 1)}
      >
        Previous
      </Button>
      <span>
        Page {current} of {last}
      </span>
      <Button
        className="outline-button"
        disabled={current >= last}
        onClick={() => onChange(current + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog ref={ref} className="modal" aria-labelledby="dialog-title" onCancel={onClose}>
      <div className="modal-heading">
        <h2 id="dialog-title">{title}</h2>
        <button className="icon-button" aria-label="Close dialog" onClick={onClose}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ErrorText({ error }: { error: Error | null }) {
  return error ? (
    <p className="auth-error" role="alert">
      {error.message}
    </p>
  ) : null;
}
export function Status({ value }: { value: string }) {
  return <span className={`status status-${value}`}>{value.replaceAll('_', ' ')}</span>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function date(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error(error, info);
  }
  render() {
    return this.state.failed ? (
      <main className="not-found">
        <h1>This page could not load.</h1>
        <p>Your saved information is safe. Reload to try again.</p>
        <Button onClick={() => window.location.reload()}>Reload page</Button>
      </main>
    ) : (
      this.props.children
    );
  }
}
