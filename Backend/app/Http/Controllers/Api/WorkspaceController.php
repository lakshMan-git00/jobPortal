<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Company, Interview, JobApplication, JobPost, PortalNotification, Resume, User};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{DB, Hash, Storage};
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class WorkspaceController extends Controller
{
    private function applicationsQuery(Request $request)
    {
        $query = JobApplication::with(['job.company', 'candidate']);
        if ($request->user()->role === 'candidate') $query->where('candidate_id', $request->user()->id);
        if ($request->user()->role === 'employer') $query->whereHas('job', fn ($q) => $q->where('created_by', $request->user()->id)->where('company_id', $request->user()->company_id));
        return $query;
    }

    private function application(Request $request, int $id): JobApplication
    {
        return $this->applicationsQuery($request)->findOrFail($id);
    }

    public function dashboard(Request $request)
    {
        $user = $request->user();
        $applications = $this->applicationsQuery($request);
        $jobs = JobPost::query();
        if ($user->role === 'employer') $jobs->where('created_by', $user->id)->where('company_id', $user->company_id);
        $counts = (clone $applications)->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');
        $interviews = Interview::whereIn('job_application_id', (clone $applications)->select('id'))->where('status', 'scheduled')->where('starts_at', '>=', now());
        $stats = ['Applications' => (clone $applications)->count(), 'Interviews' => (clone $interviews)->count(), 'Offers' => $counts['offer'] ?? 0, 'Hires' => $counts['hired'] ?? 0];
        if ($user->role === 'candidate') $stats['Saved jobs'] = DB::table('saved_jobs')->where('user_id', $user->id)->count();
        else $stats = ['Active jobs' => (clone $jobs)->open()->count(), 'Pending review' => (clone $jobs)->where('status', 'pending')->count(), ...$stats];
        if ($user->role === 'admin') $stats = ['Users' => User::count(), 'Candidates' => User::where('role', 'candidate')->count(), 'Employers' => User::where('role', 'employer')->count(), 'Companies' => Company::count(), ...$stats];
        $trend = [];
        for ($i = 6; $i >= 0; $i--) {
            $day = now()->subDays($i);
            $trend[] = ['date' => $day->format('M j'), 'applications' => (clone $applications)->whereDate('created_at', $day->toDateString())->count()];
        }
        return response()->json(['data' => ['stats' => $stats, 'pipeline' => $counts, 'trend' => $trend,
            'recent' => (clone $applications)->latest()->limit(5)->get(),
            'interviews' => $interviews->with('application.job.company')->orderBy('starts_at')->limit(5)->get(),
        ]]);
    }

    public function profile(Request $request)
    {
        return response()->json(['data' => ['name' => $request->user()->name, 'email' => $request->user()->email, ...($request->user()->profile ?? [])]]);
    }

    public function updateProfile(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'], 'headline' => ['nullable', 'string', 'max:180'],
            'location' => ['nullable', 'string', 'max:160'], 'phone' => ['nullable', 'string', 'max:40'],
            'summary' => ['nullable', 'string', 'max:5000'], 'skills' => ['nullable', 'array', 'max:40'], 'skills.*' => ['string', 'max:60'],
            'experience' => ['nullable', 'string', 'max:10000'], 'education' => ['nullable', 'string', 'max:10000'],
            'projects' => ['nullable', 'string', 'max:5000'], 'certifications' => ['nullable', 'string', 'max:5000'],
            'languages' => ['nullable', 'string', 'max:500'], 'portfolio' => ['nullable', 'url:http,https', 'max:255'],
            'linkedin' => ['nullable', 'url:http,https', 'max:255'],
        ]);
        $user = $request->user();
        $user->name = $data['name'];
        unset($data['name']);
        $user->profile = $data;
        $user->save();
        return $this->profile($request);
    }

    public function password(Request $request)
    {
        $data = $request->validate(['current_password' => ['required', 'string'], 'password' => ['required', 'confirmed', Password::min(12)->mixedCase()->numbers()]]);
        if (!Hash::check($data['current_password'], $request->user()->password)) return response()->json(['errors' => ['current_password' => ['Your current password is incorrect.']]], 422);
        $request->user()->update(['password' => $data['password']]);
        $request->user()->tokens()->delete();
        DB::table('sessions')->where('user_id', $request->user()->id)->delete();
        if ($request->hasSession()) { auth('web')->logout(); $request->session()->invalidate(); $request->session()->regenerateToken(); }
        return response()->noContent();
    }

    public function resumes(Request $request)
    {
        return response()->json(['data' => Resume::where('user_id', $request->user()->id)->orderByDesc('is_default')->latest()->get()]);
    }

    public function uploadResume(Request $request)
    {
        $request->validate(['file' => ['required', 'file', 'mimes:pdf,doc,docx', 'max:10240'], 'name' => ['nullable', 'string', 'max:160']]);
        $file = $request->file('file');
        $path = $file->store('resumes', 'local');
        try {
            $resume = DB::transaction(function () use ($request, $file, $path) {
                User::whereKey($request->user()->id)->lockForUpdate()->first();
                abort_if(Resume::where('user_id', $request->user()->id)->count() >= 10, 422, 'You can keep up to 10 resumes.');
                return Resume::create(['user_id' => $request->user()->id, 'name' => $request->input('name') ?: $file->getClientOriginalName(), 'path' => $path,
                    'mime' => $file->getMimeType(), 'size' => $file->getSize(), 'is_default' => !Resume::where('user_id', $request->user()->id)->exists()]);
            });
        } catch (\Throwable $error) { Storage::disk('local')->delete($path); throw $error; }
        return response()->json(['data' => $resume], 201);
    }

    public function updateResume(Request $request, Resume $resume)
    {
        abort_unless($resume->user_id === $request->user()->id, 404);
        $data = $request->validate(['name' => ['sometimes', 'required', 'string', 'max:160'], 'is_default' => ['sometimes', 'accepted']]);
        DB::transaction(function () use ($request, $resume, $data) {
            User::whereKey($request->user()->id)->lockForUpdate()->first();
            if ($data['is_default'] ?? false) Resume::where('user_id', $request->user()->id)->update(['is_default' => false]);
            $resume->update($data);
        });
        return response()->json(['data' => $resume]);
    }

    public function downloadResume(Request $request, Resume $resume)
    {
        $owned = $resume->user_id === $request->user()->id;
        $employer = $request->user()->role === 'employer' && $this->applicationsQuery($request)->where('resume_id', $resume->id)->exists();
        abort_unless($owned || $employer || $request->user()->role === 'admin', 404);
        return Storage::disk('local')->download($resume->path, basename($resume->name), ['Content-Type' => $resume->mime, 'X-Content-Type-Options' => 'nosniff']);
    }

    public function deleteResume(Request $request, Resume $resume)
    {
        abort_unless($resume->user_id === $request->user()->id, 404);
        abort_if(JobApplication::where('resume_id', $resume->id)->exists(), 422, 'This resume is attached to an application and must be retained. You can upload a new version.');
        Storage::disk('local')->delete($resume->path);
        $resume->delete();
        if ($resume->is_default) Resume::where('user_id', $request->user()->id)->latest()->first()?->update(['is_default' => true]);
        return response()->noContent();
    }

    public function savedJobs(Request $request)
    {
        $jobs = JobPost::with('company')->whereIn('id', DB::table('saved_jobs')->where('user_id', $request->user()->id)->select('job_post_id'))->latest()->paginate(20);
        return response()->json(['data' => $jobs->getCollection()->map(fn ($job) => app(JobController::class)->job($job)), 'meta' => ['current_page' => $jobs->currentPage(), 'last_page' => $jobs->lastPage(), 'total' => $jobs->total()]]);
    }

    public function saveJob(Request $request, JobPost $job)
    {
        abort_unless(JobPost::open()->whereKey($job->id)->exists(), 404);
        DB::table('saved_jobs')->updateOrInsert(['user_id' => $request->user()->id, 'job_post_id' => $job->id], ['created_at' => now(), 'updated_at' => now()]);
        return response()->noContent();
    }

    public function jobState(Request $request, string $slug)
    {
        $job = JobPost::where('slug', $slug)->firstOrFail();
        return response()->json(['data' => [
            'saved' => DB::table('saved_jobs')->where('user_id', $request->user()->id)->where('job_post_id', $job->id)->exists(),
            'applied' => JobApplication::where('candidate_id', $request->user()->id)->where('job_post_id', $job->id)->exists(),
        ]]);
    }

    public function unsaveJob(Request $request, int $job)
    {
        DB::table('saved_jobs')->where('user_id', $request->user()->id)->where('job_post_id', $job)->delete();
        return response()->noContent();
    }

    public function applications(Request $request)
    {
        $query = $this->applicationsQuery($request);
        $request->validate(['status' => ['nullable', 'string', 'max:30'], 'keyword' => ['nullable', 'string', 'max:100'], 'job_id' => ['nullable', 'integer']]);
        $query->when($request->status, fn ($q, $v) => $q->where('status', $v));
        $query->when($request->job_id, fn ($q, $v) => $q->where('job_post_id', $v));
        $query->when($request->keyword, fn ($q, $v) => $q->whereHas('candidate', fn ($c) => $c->whereRaw('LOWER(name) LIKE ?', ['%'.strtolower($v).'%'])));
        $result = $query->latest()->paginate(20);
        return response()->json($result);
    }

    public function applicationDetail(Request $request, int $id)
    {
        $application = $this->application($request, $id);
        $resume = $application->resume_id ? Resume::find($application->resume_id) : null;
        return response()->json(['data' => [...$application->toArray(), 'resume' => $resume, 'questions' => $application->job->screening_questions ?? [], 'interviews' => Interview::where('job_application_id', $id)->orderBy('starts_at')->get()]]);
    }

    public function applicationStatus(Request $request, int $id)
    {
        $data = $request->validate(['status' => ['required', Rule::in(['reviewing', 'shortlisted', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'])]]);
        return DB::transaction(function () use ($request, $id, $data) {
            $app = $this->applicationsQuery($request)->lockForUpdate()->findOrFail($id);
            $candidate = $request->user()->role === 'candidate';
            abort_if($request->user()->role === 'admin', 403, 'Only the hiring employer can change application decisions.');
            $transitions = ['submitted' => ['reviewing', 'shortlisted', 'rejected'], 'reviewing' => ['shortlisted', 'rejected'], 'shortlisted' => ['interview', 'offer', 'rejected'], 'interview' => ['offer', 'rejected'], 'offer' => ['hired', 'rejected']];
            $allowed = $candidate ? (!in_array($app->status, ['withdrawn', 'rejected', 'hired']) && $data['status'] === 'withdrawn') : in_array($data['status'], $transitions[$app->status] ?? []);
            abort_unless($allowed, 422, 'This status change is not allowed from the current stage.');
            $app->update(['status' => $data['status'], 'history' => [...($app->history ?? []), ['status' => $data['status'], 'at' => now()->toISOString()]]]);
            if (in_array($data['status'], ['withdrawn', 'rejected', 'hired'])) Interview::where('job_application_id', $id)->where('status', 'scheduled')->where('starts_at', '>', now())->update(['status' => 'cancelled']);
            PortalNotification::send($candidate ? $app->job->created_by : $app->candidate_id, $app->job->title.': application '.$app->status, '/'.($candidate ? 'employer' : 'candidate').'/applications/'.$id);
            return response()->json(['data' => $app]);
        });
    }

    public function interviews(Request $request)
    {
        return response()->json(Interview::with(['application.job.company', 'application.candidate'])->whereIn('job_application_id', $this->applicationsQuery($request)->select('id'))->orderByDesc('starts_at')->paginate(20));
    }

    public function scheduleInterview(Request $request)
    {
        $data = $request->validate(['job_application_id' => ['required', 'integer'], ...$this->interviewRules()]);
        return DB::transaction(function () use ($request, $data) {
            $app = $this->applicationsQuery($request)->lockForUpdate()->findOrFail($data['job_application_id']);
            abort_unless(in_array($app->status, ['shortlisted', 'interview']), 422, 'Shortlist this candidate before scheduling an interview.');
            $interview = Interview::create($data);
            if ($app->status !== 'interview') $app->update(['status' => 'interview', 'history' => [...($app->history ?? []), ['status' => 'interview', 'at' => now()->toISOString()]]]);
            PortalNotification::send($app->candidate_id, 'Interview scheduled for '.$app->job->title, '/candidate/interviews');
            return response()->json(['data' => $interview], 201);
        });
    }

    public function updateInterview(Request $request, Interview $interview)
    {
        $app = $this->application($request, $interview->job_application_id);
        $data = $request->validate($request->input('status') === 'cancelled' ? ['status' => ['required', Rule::in(['cancelled'])]] : $this->interviewRules());
        abort_unless($interview->status === 'scheduled', 422, 'This interview has already been cancelled.');
        $interview->update($data);
        PortalNotification::send($app->candidate_id, 'Interview updated for '.$app->job->title, '/candidate/interviews');
        return response()->json(['data' => $interview]);
    }

    private function interviewRules(): array
    {
        return ['starts_at' => ['required', 'date', 'after:now'], 'duration_minutes' => ['required', 'integer', 'min:15', 'max:240'], 'location' => ['required', 'string', 'max:255'], 'notes' => ['nullable', 'string', 'max:2000']];
    }

    public function notifications(Request $request)
    {
        return response()->json(PortalNotification::where('user_id', $request->user()->id)->latest()->paginate(20));
    }

    public function readNotifications(Request $request)
    {
        $data = $request->validate(['id' => ['nullable', 'integer']]);
        PortalNotification::where('user_id', $request->user()->id)->when($data['id'] ?? null, fn ($q, $id) => $q->whereKey($id))->whereNull('read_at')->update(['read_at' => now()]);
        return response()->noContent();
    }

    public function deleteNotification(Request $request, int $id)
    {
        PortalNotification::where('user_id', $request->user()->id)->findOrFail($id)->delete();
        return response()->noContent();
    }

    public function messages(Request $request, int $id)
    {
        $this->application($request, $id);
        DB::table('application_messages')->where('job_application_id', $id)->where('sender_id', '!=', $request->user()->id)->whereNull('read_at')->update(['read_at' => now()]);
        return response()->json(DB::table('application_messages')->join('users', 'sender_id', '=', 'users.id')->where('job_application_id', $id)->select('application_messages.*', 'users.name as sender_name')->orderByDesc('application_messages.id')->paginate(30));
    }

    public function sendMessage(Request $request, int $id)
    {
        $app = $this->application($request, $id);
        abort_if($request->user()->role === 'admin', 403);
        $data = $request->validate(['body' => ['required', 'string', 'max:5000']]);
        DB::transaction(function () use ($request, $id, $data, $app) {
            DB::table('application_messages')->insert(['job_application_id' => $id, 'sender_id' => $request->user()->id, 'body' => $data['body'], 'created_at' => now(), 'updated_at' => now()]);
            $candidate = $request->user()->role === 'candidate';
            PortalNotification::send($candidate ? $app->job->created_by : $app->candidate_id, 'New message about '.$app->job->title, '/'.($candidate ? 'employer' : 'candidate').'/applications/'.$id);
        });
        return response()->json(['message' => 'Message sent.'], 201);
    }

    public function companies(Request $request, ?string $slug = null)
    {
        $query = Company::withCount(['jobs' => fn ($q) => $q->open()]);
        if (!$slug) return response()->json($query->orderBy('name')->paginate(12));
        $company = $query->where('slug', $slug)->firstOrFail();
        return response()->json(['data' => [...$company->toArray(), 'jobs' => $company->jobs()->open()->with('company')->latest()->get()->map(fn ($job) => app(JobController::class)->job($job))]]);
    }

    public function company(Request $request)
    {
        return response()->json(['data' => Company::findOrFail($request->user()->company_id)]);
    }

    public function updateCompany(Request $request)
    {
        $company = Company::findOrFail($request->user()->company_id);
        $data = $request->validate(['name' => ['required', 'string', 'max:160', Rule::unique('companies')->ignore($company->id)], 'description' => ['nullable', 'string', 'max:10000'], 'website' => ['nullable', 'url:http,https', 'max:255']]);
        $company->update($data);
        return response()->json(['data' => $company]);
    }

    public function users(Request $request)
    {
        $data = $request->validate(['keyword' => ['nullable', 'string', 'max:100'], 'role' => ['nullable', Rule::in(['candidate', 'employer', 'admin'])]]);
        return response()->json(User::query()->select('id', 'name', 'email', 'role', 'is_active', 'created_at')->when($data['keyword'] ?? null, fn ($q, $v) => $q->where(fn ($q) => $q->whereRaw('LOWER(name) LIKE ?', ['%'.strtolower($v).'%'])->orWhereRaw('LOWER(email) LIKE ?', ['%'.strtolower($v).'%'])))->when($data['role'] ?? null, fn ($q, $v) => $q->where('role', $v))->latest()->paginate(20));
    }

    public function userStatus(Request $request, User $user)
    {
        abort_if($user->role === 'admin', 403, 'Administrator access cannot be changed here.');
        $data = $request->validate(['is_active' => ['required', 'boolean']]);
        DB::transaction(function () use ($user, $data) {
            $user->update($data);
            $user->tokens()->delete();
            DB::table('sessions')->where('user_id', $user->id)->delete();
        });
        return response()->json(['data' => $user->only('id', 'is_active')]);
    }
}
