import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const env = { VITE_API_URL: 'https://backend.example.com/api/', DEV: false };
async function moduleUrl(path) {
  let source = (await readFile(new URL(path, import.meta.url), 'utf8')).replaceAll(
    'import.meta.env',
    JSON.stringify(env),
  );
  source = source.replace("from 'axios'", `from '${import.meta.resolve('axios')}'`);
  if (source.includes("from './client'"))
    source = source.replaceAll(
      "from './client'",
      `from '${await moduleUrl('../src/services/client.ts')}'`,
    );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  });
  return `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
}
const { destinationAfterLogin } = await import(await moduleUrl('../src/routes/navigation.ts'));
test('employers reach their dashboard after following another role’s link', () => {
  for (const next of ['/admin', '/admin/users', '/candidate/dashboard', '/login', null])
    assert.equal(destinationAfterLogin('employer', next), '/employer/dashboard');
});
test('matching workspaces and public job destinations are preserved', () => {
  assert.equal(destinationAfterLogin('employer', '/employer/jobs'), '/employer/jobs');
  assert.equal(destinationAfterLogin('employer', '/employer'), '/employer/dashboard');
  assert.equal(
    destinationAfterLogin('candidate', '/jobs/engineer?apply=1'),
    '/jobs/engineer?apply=1',
  );
});
test('external and malformed return paths cannot redirect the user', () => {
  for (const next of ['//example.com', '/\\example.com', 'https://example.com', '/\nexample.com'])
    assert.equal(destinationAfterLogin('employer', next), '/employer/dashboard');
});
test('cookie login, field errors, server errors, and session expiry', async (t) => {
  const values = new Map([['job_portal_auth_token', 'legacy-token']]);
  const events = new EventTarget();
  globalThis.window = {
    localStorage: { removeItem: (key) => values.delete(key) },
    dispatchEvent: (event) => events.dispatchEvent(event),
  };
  t.after(() => {
    delete globalThis.window;
  });
  const { apiClient, apiSend } = await import(await moduleUrl('../src/services/client.ts'));
  const api = await import(await moduleUrl('../src/services/api.ts'));
  const calls = [];
  apiClient.defaults.adapter = async (config) => {
    calls.push(config.url);
    assert.equal(config.baseURL, 'https://backend.example.com');
    assert.equal(config.withCredentials, true);
    assert.equal(config.withXSRFToken, true);
    assert.equal(config.headers.get('Authorization'), undefined);
    return {
      data: config.url.endsWith('login')
        ? { user: { id: 2, role: 'employer' } }
        : { user: { id: 2, role: 'employer' } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    };
  };
  assert.equal((await api.signIn('employer@example.com', 'unused')).role, 'employer');
  assert.deepEqual(calls, ['/sanctum/csrf-cookie', '/api/auth/login']);
  await api.currentUser();
  assert.equal(values.has('job_portal_auth_token'), false);
  apiClient.defaults.adapter = async (config) => {
    throw { response: { status: 503, data: { message: 'SQLSTATE private internals' } }, config };
  };
  await assert.rejects(api.currentUser(), /temporarily unavailable/);
  apiClient.defaults.adapter = async (config) => {
    throw { response: { status: 422, data: { errors: { email: ['Invalid email.'] } } }, config };
  };
  await assert.rejects(
    apiSend('/api/test', 'POST'),
    (error) => error.status === 422 && error.errors.email[0] === 'Invalid email.',
  );
  let expired = 0;
  events.addEventListener('auth-expired', () => {
    expired++;
  });
  apiClient.defaults.adapter = async (config) => {
    throw { response: { status: 401, data: {} }, config };
  };
  assert.equal(await api.currentUser(), null);
  assert.equal(expired, 0);
  await assert.rejects(apiSend('/api/candidate/resumes', 'POST'));
  assert.equal(expired, 1);
  apiClient.defaults.adapter = async (config) => {
    throw { response: { status: 429, data: {} }, config };
  };
  await assert.rejects(apiSend('/api/test', 'POST'), /Too many requests/);
});
