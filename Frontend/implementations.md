# Job Portal — Production-Level React Frontend Implementation

## 1. Purpose

This document defines the production-level frontend architecture and implementation plan for the Job Portal.

The frontend is a **separate React application**.

Laravel is responsible for:

- REST API
- Authentication
- Authorization
- Business logic
- Database operations
- File management
- Notifications
- Broadcasting
- Validation

React is responsible for:

- UI
- Routing
- Client-side interactions
- Form handling
- API communication
- Server-state caching
- Client-side state
- Responsive design
- Accessibility

---

# 2. System Architecture

```text
                    ┌─────────────────────┐
                    │      Browser        │
                    │                     │
                    │   React Frontend    │
                    └──────────┬──────────┘
                               │
                         HTTPS / JSON
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Laravel API       │
                    │                     │
                    │ Controllers         │
                    │ Services            │
                    │ Policies            │
                    │ Validation          │
                    │ Authentication      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Database         │
                    │ PostgreSQL/MySQL    │
                    └─────────────────────┘
```

Optional real-time architecture:

```text
React
  │
  ├── REST API ──────────────► Laravel
  │
  └── WebSocket ─────────────► Broadcasting
                                  │
                                  ▼
                              Real-time
                              events
```

---

# 3. Technology Stack

## Core

- React
- Vite
- JavaScript or TypeScript

For a production-level application, **TypeScript is recommended**.

## Routing

- React Router

## Server State

- TanStack Query

## Client State

- Zustand

## HTTP

- Axios

## Forms

- React Hook Form
- Zod

## Styling

- Tailwind CSS

## Icons

- Lucide React

## Charts

- Recharts

## Testing

- Vitest
- React Testing Library
- Playwright

## Optional Real-Time

- Laravel Echo
- WebSocket provider/server

---

# 4. Frontend Responsibilities

React should handle:

```text
Rendering
Routing
Forms
User interactions
Search/filter UI
Pagination UI
Modal state
Client-side validation
Server-state caching
Optimistic UI
Responsive layouts
Accessibility
```

React should NOT be trusted for:

```text
Authorization
Permissions
Role validation
Price calculations
Application eligibility
Security rules
Data ownership
```

All security-sensitive decisions must be enforced by Laravel.

---

# 5. Project Structure

```text
job-portal-frontend/
│
├── public/
│
├── src/
│   │
│   ├── assets/
│   │
│   ├── components/
│   │   ├── common/
│   │   ├── layout/
│   │   ├── jobs/
│   │   ├── applications/
│   │   ├── candidates/
│   │   ├── companies/
│   │   ├── messaging/
│   │   ├── notifications/
│   │   └── interviews/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── candidate/
│   │   ├── employer/
│   │   └── admin/
│   │
│   ├── pages/
│   │   ├── public/
│   │   ├── auth/
│   │   ├── candidate/
│   │   ├── employer/
│   │   └── admin/
│   │
│   ├── hooks/
│   │
│   ├── services/
│   │
│   ├── store/
│   │
│   ├── routes/
│   │
│   ├── schemas/
│   │
│   ├── utils/
│   │
│   ├── constants/
│   │
│   ├── types/
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── .env
├── .env.example
├── package.json
└── vite.config.js
```

---

# 6. Component Architecture

Components should be divided by responsibility.

## Common Components

```text
Button
Input
Textarea
Select
Checkbox
Radio
Switch
Badge
Avatar
Card
Modal
Drawer
Dropdown
Tooltip
Tabs
Pagination
Breadcrumb
Spinner
Skeleton
Toast
Alert
EmptyState
ErrorState
ConfirmDialog
FileUpload
```

These components must remain reusable and domain-independent.

---

# 7. Layout Components

```text
Navbar
Footer
PublicLayout
DashboardLayout
CandidateLayout
EmployerLayout
AdminLayout
Sidebar
MobileNavigation
PageHeader
```

Example:

```text
App
 │
 ├── PublicLayout
 │      ├── Navbar
 │      ├── Page
 │      └── Footer
 │
 ├── CandidateLayout
 │      ├── Sidebar
 │      ├── Navbar
 │      └── Page
 │
 ├── EmployerLayout
 │      ├── Sidebar
 │      ├── Navbar
 │      └── Page
 │
 └── AdminLayout
        ├── Sidebar
        ├── Navbar
        └── Page
```

---

# 8. Route Architecture

Public routes:

```text
/
 /jobs
 /jobs/:slug
 /companies
 /companies/:slug
 /categories/:slug
```

Authentication:

```text
/login
/register
/forgot-password
/reset-password
/verify-email
```

Candidate:

```text
/candidate/dashboard
/candidate/profile
/candidate/applications
/candidate/applications/:id
/candidate/saved-jobs
/candidate/resumes
/candidate/settings
```

Employer:

```text
/employer/dashboard
/employer/jobs
/employer/jobs/create
/employer/jobs/:id
/employer/jobs/:id/edit
/employer/jobs/:id/applications
/employer/candidates
/employer/candidates/:id
/employer/interviews
/employer/company
/employer/analytics
/employer/settings
```

Admin:

```text
/admin/dashboard
/admin/users
/admin/employers
/admin/companies
/admin/jobs
/admin/applications
/admin/reports
/admin/settings
```

---

# 9. Route Protection

Create:

```text
ProtectedRoute
PublicRoute
RoleRoute
GuestRoute
```

Example architecture:

```text
ProtectedRoute
      │
      ▼
Authenticated?
   │        │
  No       Yes
   │        │
Login     Continue
            │
            ▼
        RoleRoute
            │
     ┌──────┼──────┐
     ▼      ▼      ▼
 Candidate Employer Admin
```

Never rely on React route protection as actual authorization.

Laravel must enforce authorization using middleware and policies.

---

# 10. Authentication Architecture

Recommended authentication:

```text
React
  │
  │ Sanctum authentication
  ▼
Laravel
```

For SPA authentication:

```text
GET /sanctum/csrf-cookie
        ↓
POST /login
        ↓
Authenticated session
        ↓
GET /api/user
```

Axios should be configured centrally.

Do not store sensitive authentication secrets in:

```text
localStorage
sessionStorage
React source code
```

---

# 11. Axios Configuration

Create:

```text
src/services/api.js
```

Responsibilities:

```text
Base URL
Credentials
CSRF handling
Request headers
Response handling
Authentication errors
Global error handling
```

All API services should use this instance.

Do not repeatedly create Axios instances inside components.

---

# 12. API Service Architecture

```text
services/
│
├── api.js
├── authApi.js
├── jobApi.js
├── companyApi.js
├── candidateApi.js
├── applicationApi.js
├── employerApi.js
├── interviewApi.js
├── messageApi.js
└── notificationApi.js
```

Architecture:

```text
Page
 ↓
Custom Hook
 ↓
TanStack Query
 ↓
API Service
 ↓
Axios
 ↓
Laravel
```

---

# 13. TanStack Query

Use TanStack Query for server state.

Examples:

```text
useJobs()
useJob()
useApplications()
useApplication()
useCandidateProfile()
useEmployerJobs()
useCandidates()
useNotifications()
```

It should manage:

```text
Fetching
Caching
Refetching
Loading state
Error state
Pagination
Mutation state
Invalidation
Optimistic updates
```

Avoid storing API data unnecessarily in Zustand.

---

# 14. Zustand

Use Zustand for client state such as:

```text
UI preferences
Sidebar state
Modal state
Authentication UI state
Notification counters
Temporary application state
```

Do not put the entire backend database state into Zustand.

---

# 15. Homepage

Route:

```text
/
```

Structure:

```text
Home
│
├── Navbar
├── Hero
│   ├── SearchBar
│   └── LocationSearch
│
├── PopularCategories
├── FeaturedJobs
├── FeaturedCompanies
├── CareerStatistics
├── CallToAction
└── Footer
```

Hero:

```text
Find your next opportunity.

Discover jobs that match your skills,
experience and career goals.

[ Job title / skills ] [ Location ] [ Search ]
```

---

# 16. Job Search

Route:

```text
/jobs
```

Structure:

```text
JobsPage
│
├── SearchHeader
├── SearchBar
├── FilterPanel
│   ├── Category
│   ├── Location
│   ├── Job Type
│   ├── Experience
│   ├── Salary
│   ├── Work Mode
│   └── Date Posted
│
├── SearchSummary
├── SortDropdown
├── JobList
│   └── JobCard
│
└── Pagination
```

Search state should be represented in the URL.

Example:

```text
/jobs?keyword=laravel&location=kathmandu&type=full-time
```

This allows:

- Browser refresh
- Bookmarking
- Sharing
- Back navigation
- SEO-friendly public search URLs

---

# 17. Job Card

Component:

```text
components/jobs/JobCard.jsx
```

Display:

```text
Company Logo
Job Title
Company
Location
Work Mode
Employment Type
Salary
Experience
Skills
Posted Date
Save Button
```

Example:

```text
┌─────────────────────────────────────┐
│ Logo                    ♡           │
│                                     │
│ Senior Laravel Developer            │
│ ABC Technologies                    │
│ Kathmandu · Hybrid                  │
│                                     │
│ Full Time · Rs. 80k–120k            │
│                                     │
│ Laravel · PHP · MySQL · Redis       │
│                                     │
│ Posted 2 days ago                   │
└─────────────────────────────────────┘
```

---

# 18. Job Details

Route:

```text
/jobs/:slug
```

Structure:

```text
JobDetailsPage
│
├── JobHeader
├── JobActions
│   ├── Apply
│   └── Save
│
├── JobDescription
├── Responsibilities
├── Requirements
├── Qualifications
├── Benefits
├── Skills
├── CompanySummary
├── JobOverview
└── SimilarJobs
```

---

# 19. Job Application Flow

Application should use a controlled multi-step flow.

```text
Apply
 ↓
Select Resume
 ↓
Cover Letter
 ↓
Screening Questions
 ↓
Review
 ↓
Submit
 ↓
Success
```

Components:

```text
ApplyJobModal
ResumeSelector
CoverLetterForm
ScreeningQuestions
ApplicationReview
ApplicationSuccess
```

Prevent duplicate submissions.

Submit button state:

```text
Submit Application
       ↓
Submitting...
       ↓
Application Submitted
```

---

# 20. Candidate Dashboard

Route:

```text
/candidate/dashboard
```

Structure:

```text
CandidateDashboard
│
├── WelcomeHeader
├── ProfileCompletion
├── Statistics
│   ├── Applications
│   ├── Interviews
│   ├── SavedJobs
│   └── Offers
│
├── RecentApplications
├── UpcomingInterviews
├── RecommendedJobs
└── RecentNotifications
```

---

# 21. Candidate Profile

Route:

```text
/candidate/profile
```

Sections:

```text
Personal Information
Professional Summary
Skills
Experience
Education
Projects
Certifications
Languages
Social Links
Portfolio
```

Profile completion:

```text
Profile completion: 80%

[████████████░░░]
```

---

# 22. Resume Management

Route:

```text
/candidate/resumes
```

Features:

```text
Upload
Preview
Download
Delete
Rename
Set Default
```

Upload component:

```text
Drag & Drop

or

[Choose File]

PDF / DOC / DOCX
Maximum 10 MB
```

States:

```text
Idle
Selecting
Uploading
Processing
Success
Failed
```

---

# 23. Candidate Applications

Route:

```text
/candidate/applications
```

Display:

```text
Job
Company
Applied Date
Current Status
Actions
```

Statuses:

```text
Submitted
Under Review
Shortlisted
Interview
Offer
Rejected
Withdrawn
```

Application details:

```text
/candidate/applications/:id
```

Timeline:

```text
Application Submitted
        ↓
Application Reviewed
        ↓
Shortlisted
        ↓
Interview
        ↓
Offer
```

---

# 24. Saved Jobs

Route:

```text
/candidate/saved-jobs
```

Features:

```text
View
Apply
Remove
```

Empty state:

```text
You haven't saved any jobs yet.

[Browse Jobs]
```

---

# 25. Employer Dashboard

Route:

```text
/employer/dashboard
```

Metrics:

```text
Active Jobs
Applications
Interviews
Shortlisted Candidates
Offers
Hires
```

Charts:

```text
Applications over time
Job views
Application conversion
Hiring funnel
```

Use Recharts for visualization.

---

# 26. Employer Job Management

Route:

```text
/employer/jobs
```

Features:

```text
Create
Edit
View
Duplicate
Pause
Publish
Close
Delete
```

Job statuses:

```text
Draft
Pending Review
Published
Paused
Closed
Expired
Rejected
```

---

# 27. Create Job

Route:

```text
/employer/jobs/create
```

Use a multi-step form.

```text
Step 1 — Basic Information
Step 2 — Compensation
Step 3 — Description
Step 4 — Requirements
Step 5 — Skills
Step 6 — Screening Questions
Step 7 — Preview
Step 8 — Publish
```

Use React Hook Form.

Use Zod for schema validation.

---

# 28. Job Description Editor

Use a rich-text editor such as Tiptap.

Supported content:

```text
Headings
Paragraphs
Bold
Italic
Lists
Links
```

Sanitize content on the backend before rendering publicly.

Never assume client-side sanitization is sufficient.

---

# 29. Employer Applications

Route:

```text
/employer/jobs/:id/applications
```

Display:

```text
Candidate
Applied
Experience
Skills
Resume
Status
Actions
```

Filters:

```text
Status
Experience
Skills
Education
Date
```

---

# 30. Candidate Pipeline

Pipeline:

```text
Applied
   ↓
Screening
   ↓
Shortlisted
   ↓
Interview
   ↓
Offer
   ↓
Hired
```

Kanban UI:

```text
┌──────────┬────────────┬────────────┬──────────┐
│ Applied  │ Shortlist  │ Interview  │ Hired    │
├──────────┼────────────┼────────────┼──────────┤
│ Card     │ Card       │ Card       │ Card     │
│ Card     │ Card       │            │          │
└──────────┴────────────┴────────────┴──────────┘
```

Drag-and-drop should trigger a backend mutation.

The backend must validate whether the transition is allowed.

---

# 31. Candidate Details for Employer

Route:

```text
/employer/candidates/:id
```

Display:

```text
Candidate Profile
Professional Summary
Skills
Experience
Education
Projects
Certifications
Resume
Application History
```

Actions:

```text
Shortlist
Reject
Schedule Interview
Send Message
Download Resume
```

---

# 32. Interview Management

Route:

```text
/employer/interviews
```

Features:

```text
Calendar
Upcoming interviews
Past interviews
Schedule interview
Reschedule
Cancel
Interview details
```

Candidate should see their own interviews through:

```text
/candidate/interviews
```

---

# 33. Company Profile

Public:

```text
/company/:slug
```

Display:

```text
Logo
Company Name
Industry
Location
Website
Description
Company Size
Benefits
Culture
Open Jobs
```

Employer management:

```text
/employer/company
```

Employer can edit:

```text
Logo
Cover Image
Description
Industry
Company Size
Location
Website
Social Links
Benefits
Culture
```

---

# 34. Messaging

Route:

```text
/messages
```

Architecture:

```text
ConversationList
        │
        ▼
Conversation
        │
        ▼
MessageComposer
```

Features:

```text
Unread count
Read status
Typing indicator
Message timestamps
Pagination
Real-time messages
Reconnect handling
```

Potential architecture:

```text
React
  ↓
Laravel Echo
  ↓
WebSocket
  ↓
Laravel Broadcasting
```

---

# 35. Notifications

Route:

```text
/notifications
```

Notification types:

```text
Application status
Interview scheduled
Interview changed
New message
Job recommendation
Employer activity
System notification
```

Features:

```text
Unread indicator
Mark as read
Mark all as read
Delete notification
```

---

# 36. Admin Dashboard

Route:

```text
/admin/dashboard
```

Metrics:

```text
Total Users
Candidates
Employers
Companies
Jobs
Applications
Interviews
Hires
Reports
```

Charts:

```text
User registrations
Jobs created
Applications
Hiring conversion
```

---

# 37. Admin User Management

Route:

```text
/admin/users
```

Features:

```text
Search
Filter
View
Activate
Suspend
Delete
```

Before destructive actions:

```text
ConfirmDialog
```

---

# 38. Admin Job Moderation

Route:

```text
/admin/jobs
```

Features:

```text
View
Approve
Reject
Request Changes
Suspend
```

Job moderation status:

```text
Pending
Approved
Rejected
Suspended
```

---

# 39. Forms

Use:

```text
React Hook Form
+
Zod
```

Architecture:

```text
Form
 ↓
Zod validation
 ↓
API mutation
 ↓
Laravel validation
 ↓
Success/Error
```

Frontend validation improves UX.

Laravel remains the source of truth.

---

# 40. API Validation Errors

Laravel may return:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["The email field is required."]
  }
}
```

React should map errors to form fields.

Example:

```text
Email
[________________]
The email field is required.
```

---

# 41. Loading States

Every asynchronous component must handle:

```text
Loading
Success
Empty
Error
```

Example:

```text
useJobs()

isLoading
isError
data
```

Use skeleton loaders for content-heavy pages.

---

# 42. Error Boundaries

Create application-level and feature-level error boundaries.

```text
App
 │
 ├── ErrorBoundary
 │
 ├── PublicRoutes
 │
 └── ProtectedRoutes
        │
        ├── Candidate
        ├── Employer
        └── Admin
```

Unexpected React errors should display a recovery screen instead of crashing the entire application.

---

# 43. Empty States

Every collection needs an empty state.

Examples:

```text
No saved jobs
No applications
No candidates
No interviews
No messages
No notifications
No jobs
```

Every empty state should provide a useful next action.

---

# 44. Toast System

Use a centralized toast system.

Success:

```text
Job saved successfully.
```

Error:

```text
Unable to save the job.
```

Warning:

```text
Complete your profile before applying.
```

Info:

```text
Your application is being processed.
```

---

# 45. Responsive Design

Mobile-first design.

Breakpoints:

```text
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

Desktop dashboard:

```text
┌──────────────┬─────────────────────────┐
│ Sidebar      │ Main Content            │
│              │                         │
│              │                         │
└──────────────┴─────────────────────────┘
```

Mobile:

```text
┌─────────────────────────┐
│ Navbar                  │
├─────────────────────────┤
│ Content                 │
├─────────────────────────┤
│ Home Jobs Saved Profile │
└─────────────────────────┘
```

---

# 46. Mobile Navigation

Candidate:

```text
Home
Jobs
Applications
Saved
Profile
```

Employer:

```text
Dashboard
Jobs
Candidates
Messages
Profile
```

Admin should prioritize dashboard and management actions rather than copying the candidate navigation.

---

# 47. Accessibility

Target WCAG 2.2 AA.

Requirements:

```text
Semantic HTML
Keyboard navigation
Visible focus states
ARIA labels where required
Accessible form errors
Screen-reader support
Correct heading hierarchy
Alt text
Color contrast
Accessible dialogs
Accessible dropdowns
```

Example:

```jsx
<label htmlFor="job-title">
  Job title
</label>

<input
  id="job-title"
  name="title"
/>
```

---

# 48. SEO

Public React pages should be SEO-aware.

Important pages:

```text
/
 /jobs
 /jobs/:slug
 /companies
 /companies/:slug
```

For a production job portal, consider **React SSR/SSG using a framework such as Next.js** if organic search is a major business requirement.

If staying with Vite SPA:

```text
Use prerendering/SSR infrastructure where required
Generate metadata
Use canonical URLs
Generate sitemap
Generate robots.txt
Use structured data
```

Job pages should expose appropriate `JobPosting` structured data.

---

# 49. Search UX

Search should use debouncing.

```text
User types
     ↓
300–500ms debounce
     ↓
API request
     ↓
Results
```

Autocomplete:

```text
Laravel Developer
Senior Laravel Developer
Laravel Backend Engineer
Laravel Intern
```

Location suggestions:

```text
Kathmandu
Lalitpur
Bhaktapur
Pokhara
Remote
```

---

# 50. URL Query State

Filters should remain in URL state.

Example:

```text
/jobs
?keyword=developer
&location=kathmandu
&type=full-time
&experience=mid
&remote=true
&page=2
```

When the user:

```text
refreshes
shares URL
uses browser back
```

the same search state should be restored.

---

# 51. File Upload

Supported resume formats:

```text
PDF
DOC
DOCX
```

Example:

```text
Drop your resume here

or

[Choose File]

Maximum 10 MB
```

Client-side validation:

```text
File type
File size
Filename
```

Backend validation remains mandatory.

---

# 52. Performance

Production requirements:

```text
Vite production build
Lazy-loaded routes
Lazy-loaded heavy components
Image optimization
Debounced search
Paginated APIs
TanStack Query caching
Code splitting
Minimal third-party JavaScript
```

Route-level lazy loading:

```text
React.lazy()
```

Load admin functionality only when needed.

---

# 53. React Query Caching

Example conceptual cache:

```text
jobs
jobs?keyword=laravel
jobs?location=kathmandu
job:senior-laravel-developer
candidate:profile
candidate:applications
notifications
```

After mutations, invalidate only the affected queries.

Example:

```text
Save Job
   ↓
Mutation
   ↓
Invalidate savedJobs
   ↓
Refresh affected UI
```

---

# 54. Optimistic UI

Good candidates:

```text
Save/unsave job
Mark notification as read
Like/follow company
```

Flow:

```text
User action
    ↓
Update UI immediately
    ↓
API request
    ↓
Success → keep
Failure → rollback
```

Do not use optimistic updates for sensitive operations such as final application submission unless the UX and backend semantics explicitly support it.

---

# 55. Security

Frontend security requirements:

```text
HTTPS
CSRF protection
XSS-safe rendering
Secure authentication
No API secrets in frontend
No authorization decisions trusted from frontend
Safe file handling
Sanitized rich text
Safe external links
```

Never expose:

```text
Database credentials
Laravel APP_KEY
Private API keys
Service credentials
WebSocket server secrets
```

in React environment variables.

Remember:

```text
VITE_* variables are public.
```

---

# 56. Authentication States

The frontend must support:

```text
Guest
Authenticated Candidate
Authenticated Employer
Authenticated Admin
Email Unverified
Suspended User
Expired Session
```

Global authentication flow:

```text
Application starts
       ↓
Check authenticated user
       ↓
Loading
       ↓
Authenticated?
   ┌───────┴───────┐
   │               │
  Yes              No
   │               │
Dashboard        Public UI
```

---

# 57. Authorization

Frontend may hide UI based on role for UX:

```text
Candidate → Candidate dashboard
Employer → Employer dashboard
Admin → Admin dashboard
```

But Laravel must enforce:

```text
Can this user access this resource?
Can this employer modify this job?
Can this candidate view this application?
Can this admin approve this job?
```

---

# 58. Error Handling

HTTP behavior:

```text
401 → Authentication required
403 → Forbidden
404 → Not found
422 → Validation errors
429 → Too many requests
500 → Server error
503 → Service unavailable
```

Never show raw Laravel exceptions to users.

---

# 59. Rate-Limit UX

If Laravel responds with:

```text
429 Too Many Requests
```

React should show:

```text
Too many requests.

Please wait a moment before trying again.
```

Do not immediately retry indefinitely.

---

# 60. Accessibility-Friendly Job Card

Use semantic links:

```jsx
<h3>
  <Link to={`/jobs/${job.slug}`}>{job.title}</Link>
</h3>
```

Save button:

```jsx
<button type="button" aria-label={`Save ${job.title}`}>
  <Heart />
</button>
```

---

# 61. Design System

Create reusable design tokens for:

```text
Colors
Spacing
Typography
Border radius
Shadows
Transitions
Breakpoints
```

Components should consume these tokens rather than independently defining visual styles.

---

# 62. Frontend Environment

Example:

```text
.env
```

Only public frontend configuration belongs here.

Example:

```text
VITE_API_URL=https://api.example.com
```

Never put:

```text
Database password
Laravel APP_KEY
Private API key
Secret signing key
```

into the React environment.

---

# 63. Testing Strategy

## Unit Tests

Test:

```text
Formatters
Validators
Utility functions
Query builders
```

## Component Tests

Test:

```text
JobCard
JobSearch
JobFilters
ApplicationForm
LoginForm
FileUpload
Modal
Pagination
```

## Integration Tests

Test:

```text
Login
Search
Save Job
Apply
Create Job
Update Application Status
```

## E2E Tests

Critical user journeys:

```text
Candidate registration
Candidate login
Search jobs
View job
Save job
Apply
Track application

Employer registration
Create company
Create job
Publish job
Review application
Shortlist candidate
Schedule interview

Admin login
Approve job
Suspend user
```

---

# 64. Recommended Testing Structure

```text
tests/
├── unit/
├── components/
├── integration/
└── e2e/
```

Playwright should cover the most important business flows.

---

# 65. State Matrix

Every API-driven page should handle:

```text
                    Loading
                       │
             ┌─────────┴─────────┐
             │                   │
          Success              Error
             │
       ┌─────┴─────┐
       │           │
     Data        Empty
```

Never implement only:

```text
if (data) render...
```

without considering loading, empty, and error states.

---

# 66. Production Page Implementation Order

## Phase 1 — Project Foundation

```text
React
Vite
Tailwind
React Router
Axios
TanStack Query
Zustand
React Hook Form
Zod
ESLint
Prettier
```

## Phase 2 — Design System

```text
Button
Input
Select
Modal
Toast
Card
Badge
Dropdown
Pagination
Skeleton
EmptyState
ErrorState
```

## Phase 3 — Application Shell

```text
Navbar
Footer
Sidebar
DashboardLayout
MobileNavigation
Route protection
Authentication context/store
```

## Phase 4 — Public Pages

```text
Homepage
Jobs
Job Details
Companies
Company Details
Categories
```

## Phase 5 — Authentication

```text
Login
Register
Email verification
Forgot password
Reset password
```

## Phase 6 — Candidate

```text
Dashboard
Profile
Resume
Saved Jobs
Applications
Application Details
Interviews
Settings
```

## Phase 7 — Employer

```text
Dashboard
Company
Jobs
Create Job
Edit Job
Applications
Candidates
Interviews
Analytics
Settings
```

## Phase 8 — Admin

```text
Dashboard
Users
Employers
Companies
Jobs
Applications
Reports
Settings
```

## Phase 9 — Communication

```text
Notifications
Messaging
Real-time updates
```

## Phase 10 — Production Hardening

```text
Security
Accessibility
SEO
Performance
Testing
Error handling
Monitoring
Analytics
```

---

# 67. Recommended Component Priority

Build reusable components before complex pages.

```text
1. Button
2. Input
3. Select
4. Textarea
5. Checkbox
6. Radio
7. Badge
8. Avatar
9. Card
10. Modal
11. Drawer
12. Dropdown
13. Tabs
14. Pagination
15. Skeleton
16. EmptyState
17. ErrorState
18. Toast
19. FileUpload
20. Table
21. Navbar
22. Sidebar
23. JobCard
24. CompanyCard
```

---

# 68. Feature-Based Organization

For complex domains, business logic should live close to its feature.

Example:

```text
features/jobs/

├── components/
├── hooks/
├── schemas/
├── services/
├── queries/
└── mutations/
```

Example:

```text
features/jobs/
├── components/
│   ├── JobCard.jsx
│   ├── JobFilters.jsx
│   └── JobForm.jsx
│
├── hooks/
│   ├── useJobs.js
│   └── useJob.js
│
├── services/
│   └── jobApi.js
│
├── schemas/
│   └── jobSchema.js
│
└── queries/
    └── jobQueries.js
```

This keeps a large production application maintainable.

---

# 69. Recommended API Flow

Example: Search Jobs

```text
JobsPage
   ↓
useJobs(filters)
   ↓
TanStack Query
   ↓
jobApi.getJobs(filters)
   ↓
Axios
   ↓
GET /api/jobs
   ↓
Laravel
   ↓
JSON response
   ↓
TanStack Query cache
   ↓
React UI
```

Example response:

```json
{
  "data": [],
  "meta": {
    "current_page": 1,
    "last_page": 10,
    "per_page": 20,
    "total": 200
  }
}
```

---

# 70. Recommended API Contract

Use consistent API responses.

Success:

```json
{
  "message": "Job created successfully.",
  "data": {}
}
```

Validation:

```json
{
  "message": "Validation failed.",
  "errors": {}
}
```

Error:

```json
{
  "message": "Unable to process the request."
}
```

Pagination:

```json
{
  "data": [],
  "meta": {
    "current_page": 1,
    "last_page": 10,
    "per_page": 20,
    "total": 200
  },
  "links": {}
}
```

---

# 71. Real-Time Architecture

For messages and notifications:

```text
Laravel Event
      ↓
Broadcast
      ↓
WebSocket
      ↓
Laravel Echo
      ↓
React
      ↓
TanStack Query / Zustand
      ↓
UI
```

Example:

```text
Candidate receives:
"Your application has been shortlisted."

Laravel
   ↓
Broadcast ApplicationStatusChanged
   ↓
React receives event
   ↓
Notification appears
   ↓
Application cache invalidated
   ↓
UI updates
```

---

# 72. Production UI States

Every interactive component must support:

```text
Default
Hover
Focus
Active
Disabled
Loading
Success
Error
Empty
```

For buttons:

```text
[Save]

[Saving...]

[Saved ✓]
```

---

# 73. Confirmation Rules

Confirmation is required for:

```text
Delete account
Delete resume
Delete job
Reject candidate
Reject job
Close job
Withdraw application
Suspend user
Cancel interview
```

Do not require confirmation for harmless actions such as:

```text
Save job
Mark notification read
Open details
```

---

# 74. Accessibility Checklist

```text
[ ] All inputs have labels
[ ] Keyboard navigation works
[ ] Focus states visible
[ ] Modal traps focus
[ ] Escape closes modal where appropriate
[ ] Screen readers receive errors
[ ] Images have meaningful alt text
[ ] Decorative images use empty alt
[ ] Color is not the only status indicator
[ ] Contrast meets WCAG target
[ ] Buttons have meaningful labels
```

---

# 75. Performance Checklist

```text
[ ] Route lazy loading
[ ] Image optimization
[ ] API pagination
[ ] Search debouncing
[ ] TanStack Query caching
[ ] Avoid unnecessary rerenders
[ ] Memoize only when useful
[ ] Lazy-load heavy components
[ ] Production Vite build
[ ] Minimize third-party scripts
[ ] Compress assets
```

---

# 76. Security Checklist

```text
[ ] HTTPS
[ ] CSRF protection
[ ] Secure authentication
[ ] No secrets in frontend
[ ] XSS-safe rendering
[ ] Rich-text sanitization
[ ] Backend authorization
[ ] Backend validation
[ ] File upload validation
[ ] Rate-limit handling
[ ] Safe external URLs
```

---

# 77. Definition of Done

A frontend feature is production-ready only when:

```text
[ ] Desktop implemented
[ ] Tablet implemented
[ ] Mobile implemented

[ ] Loading state
[ ] Error state
[ ] Empty state
[ ] Success state

[ ] Client validation
[ ] Server validation handling

[ ] Accessibility
[ ] Keyboard navigation

[ ] API error handling
[ ] Authentication handling
[ ] Authorization assumptions reviewed

[ ] Responsive testing
[ ] Browser testing
[ ] Unit/component tests
[ ] E2E test for critical flows

[ ] Performance reviewed
[ ] Security reviewed
```

---

# 78. Final Frontend Architecture

```text
                         React Application
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
           Pages            Components         Features
              │                 │                 │
              └─────────────────┼─────────────────┘
                                │
                         Custom Hooks
                                │
                    ┌───────────┴───────────┐
                    │                       │
               TanStack Query            Zustand
                    │                       │
                    └───────────┬───────────┘
                                │
                          API Services
                                │
                              Axios
                                │
                           HTTPS / JSON
                                │
                                ▼
                         Laravel REST API
                                │
                    ┌───────────┼───────────┐
                    │           │           │
               Controllers   Services    Policies
                    │
                    ▼
                 Database
```

---

# 79. Final Development Principle

The project should **not** be built as a collection of pages.

Build it as:

```text
Design System
      ↓
Reusable Components
      ↓
Feature Modules
      ↓
Pages
      ↓
Routes
      ↓
API Integration
      ↓
Production Testing
```

The React frontend and Laravel backend should have clear responsibilities:

```text
React
├── Presentation
├── Interaction
├── Client state
├── Server-state cache
├── Forms
└── UX

Laravel
├── Authentication
├── Authorization
├── Business logic
├── Validation
├── Database
├── File handling
├── Notifications
└── Security
```

This structure keeps the Job Portal scalable as it grows from an internship project into a production-grade recruitment platform.
