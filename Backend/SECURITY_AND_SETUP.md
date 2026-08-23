# Eyros API setup

## First run

1. Set `APP_ENV=production`, `APP_DEBUG=false`, an HTTPS `APP_URL`, `FRONTEND_URL`, and `SANCTUM_STATEFUL_DOMAINS` in `.env`.
2. Set `SESSION_SECURE_COOKIE=true` in production. The frontend and API must be on HTTPS and use compatible cookie domains.
3. Run `php artisan migrate --force --seed`.

The seeder creates the requested initial administrator only:

- Email: `eyros@admin.com`
- Password: `eyros@123`

Set `ADMIN_EMAIL`, `ADMIN_NAME`, and `ADMIN_PASSWORD` in the production environment before seeding. Rotate the supplied development password immediately after first access and never commit real credentials to source control.

## Access model

- Public visitors can only read published jobs.
- Self-registration always creates a `candidate` account.
- Only an `admin` can create companies and employer accounts.
- An `employer` may post jobs only for their administrator-assigned company.
- `/api/admin/*` is protected by both Sanctum authentication and an admin-role middleware; the React `/admin` route also redirects everyone else to sign-in.

## Deployment requirements

- Serve the React application with an SPA fallback so `/admin` and job detail URLs resolve to `index.html`.
- Configure trusted proxy / load-balancer headers at the hosting layer before forcing HTTPS.
- Run the application with a real queue worker if queued work is later enabled; do not expose `APP_DEBUG` in production.
- Add email verification, password-reset delivery, audit logging, file scanning for resumes, backups, monitoring, and a rate-limit store such as Redis before public launch.
