export function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function destinationAfterLogin(role: string, next: string | null): string {
  const fallback = `/${role}/dashboard`;
  if (
    !next ||
    !next.startsWith('/') ||
    next.startsWith('//') ||
    next.includes('\\') ||
    [...next].some((character) => character.charCodeAt(0) < 32)
  )
    return fallback;
  const pathname = next.split(/[?#]/)[0];
  const workspace = pathname.match(/^\/(admin|employer|candidate)(?:\/|$)/)?.[1];
  if (workspace) return workspace === role ? (pathname === `/${role}` ? fallback : next) : fallback;
  return pathname === '/jobs' || pathname.startsWith('/jobs/') ? next : fallback;
}
