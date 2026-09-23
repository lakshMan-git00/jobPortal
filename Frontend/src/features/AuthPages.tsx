import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import type { AuthUser } from '../types';
import { register as registerAccount, signIn } from '../services/api';
import { ApiError, apiSend, csrf } from '../services/client';
import { Button } from '../components/common/Ui';

const schema = z.object({
  name: z.string(),
  email: z.email('Enter a valid email.'),
  password: z.string().min(1, 'Enter your password.'),
  password_confirmation: z.string(),
});
export function AuthPage({
  mode,
  onAuthenticated,
}: {
  mode: 'login' | 'register';
  onAuthenticated: (user: AuthUser) => void;
}) {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', password_confirmation: '' },
  });
  const [error, setError] = useState('');
  const isRegister = mode === 'register';
  const submit = form.handleSubmit(async (values) => {
    setError('');
    if (isRegister && !values.name.trim()) {
      form.setError('name', { message: 'Enter your full name.' });
      return;
    }
    if (
      isRegister &&
      (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/.test(values.password) ||
        values.password !== values.password_confirmation)
    ) {
      form.setError('password', {
        message:
          'Use at least 12 characters with uppercase, lowercase, and a number. Both passwords must match.',
      });
      return;
    }
    try {
      onAuthenticated(
        isRegister
          ? await registerAccount(
              values.name,
              values.email,
              values.password,
              values.password_confirmation,
            )
          : await signIn(values.email, values.password),
      );
    } catch (e) {
      if (e instanceof ApiError)
        Object.entries(e.errors).forEach(([key, messages]) =>
          form.setError(key as keyof typeof values, { message: messages[0] }),
        );
      setError(e instanceof Error ? e.message : 'Unable to sign in.');
    }
  });
  return (
    <main className="login-page">
      <section>
        <span className="eyebrow dark">
          <i />
          WELCOME TO EYROS
        </span>
        <h1>
          {isRegister ? (
            <>
              Start your <em>next chapter.</em>
            </>
          ) : (
            <>
              Welcome <em>back.</em>
            </>
          )}
        </h1>
        <p>
          {isRegister
            ? 'Create your candidate account and find meaningful work.'
            : 'Your next opportunity starts here.'}
        </p>
        <form className="auth-form" onSubmit={submit} noValidate>
          {(['name', 'email', 'password', 'password_confirmation'] as const)
            .filter((field) => isRegister || !['name', 'password_confirmation'].includes(field))
            .map((field) => (
              <label key={field}>
                {
                  {
                    name: 'Full name',
                    email: 'Email address',
                    password: 'Password',
                    password_confirmation: 'Confirm password',
                  }[field]
                }
                <input
                  {...form.register(field)}
                  type={
                    field.includes('password') ? 'password' : field === 'email' ? 'email' : 'text'
                  }
                  autoComplete={
                    field === 'name'
                      ? 'name'
                      : field === 'email'
                        ? 'email'
                        : isRegister
                          ? 'new-password'
                          : 'current-password'
                  }
                  aria-invalid={!!form.formState.errors[field]}
                  aria-describedby={`${field}-error`}
                />
                <small id={`${field}-error`} className="field-error">
                  {form.formState.errors[field]?.message}
                </small>
              </label>
            ))}
          {error && (
            <p role="alert" className="auth-error">
              {error}
            </p>
          )}
          <Button disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? 'Please wait…'
              : isRegister
                ? 'Create account'
                : 'Sign in'}
          </Button>
        </form>
        <div className="auth-links">
          <Link to={isRegister ? '/login' : '/register'}>
            {isRegister ? 'Already have an account? Sign in' : 'New here? Create an account'}
          </Link>
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
      </section>
    </main>
  );
}
export function PasswordRecovery({ reset }: { reset: boolean }) {
  const params = new URLSearchParams(window.location.search);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <main className="login-page">
      <section>
        <h1>{reset ? 'Set a new password.' : 'Find your way back.'}</h1>
        <p>
          {reset
            ? 'Use 12 characters, uppercase, lowercase, and a number.'
            : 'We’ll send a reset link if an account matches your email.'}
        </p>
        <form
          className="auth-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(e.currentTarget));
            setBusy(true);
            setError('');
            try {
              await csrf();
              await apiSend(`/api/auth/${reset ? 'reset-password' : 'forgot-password'}`, 'POST', {
                ...data,
                token: params.get('token'),
              });
              setMessage(
                reset
                  ? 'Password updated. You can now sign in.'
                  : 'If that account exists, a reset link has been requested. Check your email.',
              );
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Please try again.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Email address
            <input name="email" type="email" required defaultValue={params.get('email') ?? ''} />
          </label>
          {reset && (
            <>
              <label>
                New password
                <input name="password" type="password" minLength={12} required />
              </label>
              <label>
                Confirm password
                <input name="password_confirmation" type="password" minLength={12} required />
              </label>
            </>
          )}
          {error && (
            <p role="alert" className="auth-error">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="success-message">
              {message}
            </p>
          )}
          <Button disabled={busy}>
            {busy ? 'Please wait…' : reset ? 'Reset password' : 'Send reset link'}
          </Button>
          <Link to="/login">Return to sign in</Link>
        </form>
      </section>
    </main>
  );
}
